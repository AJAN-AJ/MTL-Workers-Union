import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function GET() {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const { data: regions } = await supabaseServer.from('regions').select('id, name').order('id')

  const { data: positions } = await supabaseServer
    .from('positions')
    .select('id, name, candidates:candidates(id, name, region_id, candidate_positions!inner(position_id))')
    .order('created_at', { ascending: true })

  const { data: votes } = await supabaseServer
    .from('votes')
    .select('region_id, position_id, candidate_id')

  const { data: memberCounts } = await supabaseServer
    .from('members')
    .select('region_id')

  const { data: physicalRows } = await supabaseServer
    .from('physical_votes')
    .select('region_id, position_id, candidate_id, vote_count')

  const { data: nullVoidRows } = await supabaseServer
    .from('null_void_votes')
    .select('region_id, position_id, null_void_count')

  const { data: regionResults } = await supabaseServer
    .from('region_results')
    .select('region_id, status')

const result = (regions || []).map((region: any) => ({
    id: region.id,
    name: region.name,
    registeredVoters: memberCounts?.filter((m) => m.region_id === region.id).length ?? 0,
    released: regionResults?.find((r) => r.region_id === region.id)?.status === 'released',
    positions: (positions || [])
      .map((p: any) => {
        const candidatesInRegion = p.candidates.filter((c: any) => c.region_id === region.id)
        if (candidatesInRegion.length === 0) return null

        const nv = nullVoidRows?.find((n) => n.region_id === region.id && n.position_id === p.id)

        return {
          id: p.id,
          name: p.name,
          nullVoidCount: nv?.null_void_count ?? 0,
          candidates: candidatesInRegion.map((c: any) => {
            const online = votes?.filter(
              (v) => v.region_id === region.id && v.position_id === p.id && v.candidate_id === c.id
            ).length ?? 0
            const physical = physicalRows?.find(
              (r) => r.region_id === region.id && r.position_id === p.id && r.candidate_id === c.id
            )?.vote_count ?? 0

            return { id: c.id, name: c.name, online, physical, total: online + physical }
          })
        }
      })
      .filter(Boolean)
  }))

  const overallRegisteredVoters = memberCounts?.length ?? 0

  return NextResponse.json({ regions: result, overallRegisteredVoters })
}