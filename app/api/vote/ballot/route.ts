import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

  const { data: member } = await supabaseServer
    .from('members')
    .select('region_id')
    .eq('employee_code', session.employeeCode)
    .single()

  if (!member) return NextResponse.json({ error: 'Member not found.' }, { status: 404 })

const { data: regionData } = await supabaseServer
    .from('regions')
    .select('voting_opens_at, voting_closes_at')
    .eq('id', member.region_id)
    .single()

  const now = new Date()
  const opensAt = regionData?.voting_opens_at ? new Date(regionData.voting_opens_at) : null
  const closesAt = regionData?.voting_closes_at ? new Date(regionData.voting_closes_at) : null
  if (opensAt && now < opensAt) {
    return NextResponse.json({ status: 'not_open' })
  }

  const { data: submission } = await supabaseServer
    .from('ballot_submissions')
    .select('submitted_at')
    .eq('employee_code', session.employeeCode)
    .maybeSingle()

  if (submission) {
    const { data: myVotes } = await supabaseServer
      .from('votes')
      .select('position_id, candidate_id, positions(name), candidates(name)')
      .eq('employee_code', session.employeeCode)

    return NextResponse.json({
      status: closesAt && now < closesAt ? 'already_voted' : 'results_pending',
      myVotes
    })
  }
if (opensAt && now < opensAt) {
    return NextResponse.json({ status: 'not_open', opensAt: regionData?.voting_opens_at })
  }

  const { data: positions } = await supabaseServer
    .from('positions')
    .select('id, name, candidates:candidates(id, name, image_url, region_id, candidate_positions!inner(position_id))')
    .order('created_at', { ascending: true })

  const positionsForRegion = (positions || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    candidates: p.candidates.filter((c: any) => c.region_id === member.region_id)
  }))

  const { data: draftRows } = await supabaseServer
    .from('ballot_drafts')
    .select('position_id, candidate_id')
    .eq('employee_code', session.employeeCode)

  const drafts: Record<number, number> = {}
  draftRows?.forEach((d) => { drafts[d.position_id] = d.candidate_id })

 return NextResponse.json({
    status: 'open',
    positions: positionsForRegion,
    drafts,
    closesAt: regionData?.voting_closes_at
  })
}