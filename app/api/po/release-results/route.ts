import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function POST() {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('presiding_officer') || !session.poRegionId) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }
  const regionId = session.poRegionId

  const { data: already } = await supabaseServer
    .from('region_results')
    .select('status')
    .eq('region_id', regionId)
    .maybeSingle()

  if (already?.status === 'released') {
    return NextResponse.json({ error: 'Results already released for this region.' }, { status: 400 })
  }

  const { data: regionRow } = await supabaseServer.from('regions').select('name').eq('id', regionId).single()

  const { data: positions } = await supabaseServer
    .from('positions')
    .select('id, name, candidates:candidates(id, name, employee_code, region_id, candidate_positions!inner(position_id))')

  const { data: votes } = await supabaseServer.from('votes').select('position_id, candidate_id').eq('region_id', regionId)
  const { data: physicalRows } = await supabaseServer
    .from('physical_votes')
    .select('position_id, candidate_id, vote_count')
    .eq('region_id', regionId)

  const winners: { positionId: number; positionName: string; candidateId: number; candidateName: string; total: number }[] = []

  for (const p of positions || []) {
    const candidatesInRegion = (p as any).candidates.filter((c: any) => c.region_id === regionId)
    if (candidatesInRegion.length === 0) continue

    const ranked = candidatesInRegion
      .map((c: any) => {
        const online = votes?.filter((v) => v.position_id === p.id && v.candidate_id === c.id).length ?? 0
        const physical = physicalRows?.find((r) => r.position_id === p.id && r.candidate_id === c.id)?.vote_count ?? 0
        return { id: c.id, name: c.name, total: online + physical }
      })
      .sort((a: any, b: any) => b.total - a.total)

    const top = ranked[0]
    winners.push({ positionId: p.id, positionName: p.name, candidateId: top.id, candidateName: top.name, total: top.total })
  }

  if (winners.length === 0) {
    return NextResponse.json({ error: 'No positions/candidates found for this region.' }, { status: 400 })
  }

  const winnerRows = winners.map((w) => ({ region_id: regionId, position_id: w.positionId, candidate_id: w.candidateId }))
  const { error: winError } = await supabaseServer
    .from('position_winners')
    .upsert(winnerRows, { onConflict: 'region_id,position_id' })
  if (winError) return NextResponse.json({ error: winError.message }, { status: 500 })

  await supabaseServer
    .from('region_results')
    .upsert({ region_id: regionId, status: 'released', released_by: session.employeeCode, released_at: new Date().toISOString() })

  return NextResponse.json({ success: true, regionName: regionRow?.name ?? '', winners })
}