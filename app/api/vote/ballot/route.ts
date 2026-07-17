import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

  const { data: member } = await supabaseServer
    .from('members')
    .select('region_id, first_name, surname')
    .eq('employee_code', session.employeeCode)
    .single()

  if (!member) return NextResponse.json({ error: 'Member not found.' }, { status: 404 })

  const memberName = [member.first_name, member.surname].filter(Boolean).join(' ')

const { data: regionData } = await supabaseServer
    .from('regions')
    .select('voting_opens_at, voting_closes_at')
    .eq('id', member.region_id)
    .single()

  const now = new Date()
  const opensAt = regionData?.voting_opens_at ? new Date(regionData.voting_opens_at) : null
  const closesAt = regionData?.voting_closes_at ? new Date(regionData.voting_closes_at) : null

  if (!opensAt && !closesAt) {
    return NextResponse.json({ status: 'no_session', memberName })
  }

  if (opensAt && now < opensAt) {
    return NextResponse.json({ status: 'not_open', opensAt: regionData?.voting_opens_at ?? null, memberName })
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

    const { data: resultRow } = await supabaseServer
      .from('region_results')
      .select('status')
      .eq('region_id', member.region_id)
      .maybeSingle()

    if (resultRow?.status === 'released') {
      const { data: winners } = await supabaseServer
        .from('position_winners')
        .select('position_id, candidate_id')
        .eq('region_id', member.region_id)

      const { data: positions } = await supabaseServer
        .from('positions')
        .select('id, name, candidates:candidates(id, name, region_id, candidate_positions!inner(position_id))')
        .order('created_at', { ascending: true })

      const { data: regionVotes } = await supabaseServer
        .from('votes')
        .select('position_id, candidate_id')
        .eq('region_id', member.region_id)

      const { data: physicalRows } = await supabaseServer
        .from('physical_votes')
        .select('position_id, candidate_id, vote_count')
        .eq('region_id', member.region_id)

      const { data: nullVoidRows } = await supabaseServer
        .from('null_void_votes')
        .select('position_id, null_count, void_count')
        .eq('region_id', member.region_id)

      const results = (positions || [])
        .map((p: any) => {
          const candidatesInRegion = p.candidates.filter((c: any) => c.region_id === member.region_id)
          if (candidatesInRegion.length === 0) return null

          const winnerCandidateId = winners?.find((w) => w.position_id === p.id)?.candidate_id
          const nv = nullVoidRows?.find((n) => n.position_id === p.id)

          const candidates = candidatesInRegion
            .map((c: any) => {
              const online = regionVotes?.filter((v) => v.position_id === p.id && v.candidate_id === c.id).length ?? 0
              const physical = physicalRows?.find((r) => r.position_id === p.id && r.candidate_id === c.id)?.vote_count ?? 0
              return { id: c.id, name: c.name, total: online + physical, isWinner: c.id === winnerCandidateId }
            })
            .sort((a: any, b: any) => b.total - a.total)

          return {
            id: p.id,
            name: p.name,
            candidates,
            nullCount: nv?.null_count ?? 0,
            voidCount: nv?.void_count ?? 0
          }
        })
        .filter(Boolean)

      return NextResponse.json({
        status: 'results_released',
        myVotes,
        results,
        memberName
      })
    }

    return NextResponse.json({
      status: closesAt && now < closesAt ? 'already_voted' : 'results_pending',
      myVotes,
      memberName
    })
  }

  if (closesAt && now > closesAt) {
    return NextResponse.json({ status: 'closed_no_vote', memberName })
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
    closesAt: regionData?.voting_closes_at ?? null,
    memberName
  })
}