import { NextRequest, NextResponse } from 'next/server'
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
  const { data: votes } = await supabaseServer.from('votes').select('region_id, position_id, candidate_id')
  const { data: physicalRows } = await supabaseServer
    .from('physical_votes')
    .select('region_id, position_id, candidate_id, vote_count')
  const { data: confirmedWinners } = await supabaseServer
    .from('position_winners')
    .select('region_id, position_id, candidate_id')

  const result = (regions || []).map((region: any) => {
    const regionPositions = (positions || [])
      .map((p: any) => {
        const candidatesInRegion = p.candidates.filter((c: any) => c.region_id === region.id)
        if (candidatesInRegion.length === 0) return null

        const ranked = candidatesInRegion
          .map((c: any) => {
            const online = votes?.filter(
              (v) => v.region_id === region.id && v.position_id === p.id && v.candidate_id === c.id
            ).length ?? 0
            const physical = physicalRows?.find(
              (r) => r.region_id === region.id && r.position_id === p.id && r.candidate_id === c.id
            )?.vote_count ?? 0
            return { id: c.id, name: c.name, total: online + physical }
          })
          .sort((a: any, b: any) => b.total - a.total)

        const confirmed = confirmedWinners?.find(
          (w) => w.region_id === region.id && w.position_id === p.id
        )

        return { id: p.id, name: p.name, candidates: ranked, confirmedCandidateId: confirmed?.candidate_id ?? null }
      })
      .filter(Boolean)

    return { id: region.id, name: region.name, positions: regionPositions }
  })

  return NextResponse.json({ regions: result })
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const { regionId, positionId, candidateId } = await req.json()

  const { error } = await supabaseServer
    .from('position_winners')
    .upsert({ region_id: regionId, position_id: positionId, candidate_id: candidateId }, { onConflict: 'region_id,position_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}