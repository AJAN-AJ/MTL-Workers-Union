import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function GET() {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('presiding_officer') || !session.poRegionId) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const regionId = session.poRegionId

  const { data: positions } = await supabaseServer
    .from('positions')
    .select('id, name, candidates:candidates(id, name, region_id, candidate_positions!inner(position_id))')
    .order('created_at', { ascending: true })

  const { data: votes } = await supabaseServer
    .from('votes')
    .select('position_id, candidate_id')
    .eq('region_id', regionId)

  const { data: physicalRows } = await supabaseServer
    .from('physical_votes')
    .select('position_id, candidate_id, vote_count')
    .eq('region_id', regionId)

  const { data: nullVoidRows } = await supabaseServer
    .from('null_void_votes')
    .select('position_id, null_void_count')
    .eq('region_id', regionId)

  const locked = (physicalRows?.length ?? 0) > 0

  const result = (positions || [])
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      candidates: p.candidates
        .filter((c: any) => c.region_id === regionId)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          onlineCount: votes?.filter((v) => v.position_id === p.id && v.candidate_id === c.id).length ?? 0,
          physicalCount: physicalRows?.find((r) => r.position_id === p.id && r.candidate_id === c.id)?.vote_count ?? null
        })),
      nullVoidCount: nullVoidRows?.find((r) => r.position_id === p.id)?.null_void_count ?? null
    }))
    .filter((p: any) => p.candidates.length > 0)

  return NextResponse.json({ positions: result, locked })
}