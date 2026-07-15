import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function POST() {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('presiding_officer') || !session.poRegionId) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }
  const regionId = session.poRegionId

  const { data: regionResult } = await supabaseServer
    .from('region_results')
    .select('status')
    .eq('region_id', regionId)
    .maybeSingle()

  if (regionResult?.status !== 'released') {
    return NextResponse.json({ error: 'Release results before starting a new session.' }, { status: 400 })
  }

  const { data: region } = await supabaseServer
    .from('regions')
    .select('voting_opens_at, voting_closes_at')
    .eq('id', regionId)
    .single()

  const { data: winners } = await supabaseServer
    .from('position_winners')
    .select('position_id, candidate_id, positions(name), candidates(name)')
    .eq('region_id', regionId)

  const summary = {
    winners: (winners || []).map((w: any) => ({ position: w.positions?.name, winner: w.candidates?.name }))
  }

  await supabaseServer.from('voting_session_archives').insert({
    region_id: regionId,
    opens_at: region?.voting_opens_at ?? null,
    closes_at: region?.voting_closes_at ?? null,
    summary
  })

  const { data: candidateRows } = await supabaseServer.from('candidates').select('id').eq('region_id', regionId)
  const candidateIds = (candidateRows || []).map((c) => c.id)

  const { data: memberRows } = await supabaseServer.from('members').select('employee_code').eq('region_id', regionId)
  const employeeCodes = (memberRows || []).map((m) => m.employee_code)

  await supabaseServer.from('votes').delete().eq('region_id', regionId)
  await supabaseServer.from('physical_votes').delete().eq('region_id', regionId)
  await supabaseServer.from('null_void_votes').delete().eq('region_id', regionId)
  await supabaseServer.from('position_winners').delete().eq('region_id', regionId)
  if (employeeCodes.length > 0) {
    await supabaseServer.from('ballot_drafts').delete().in('employee_code', employeeCodes)
    await supabaseServer.from('ballot_submissions').delete().in('employee_code', employeeCodes)
  }
  if (candidateIds.length > 0) {
    await supabaseServer.from('candidates').delete().in('id', candidateIds)
  }
  await supabaseServer.from('region_results').delete().eq('region_id', regionId)
  await supabaseServer.from('regions').update({ voting_opens_at: null, voting_closes_at: null }).eq('id', regionId)

  return NextResponse.json({ success: true })
}