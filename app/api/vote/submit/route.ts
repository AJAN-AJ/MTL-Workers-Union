import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function POST() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

  const { data: already } = await supabaseServer
    .from('ballot_submissions')
    .select('employee_code')
    .eq('employee_code', session.employeeCode)
    .maybeSingle()

  if (already) return NextResponse.json({ error: 'You have already voted.' }, { status: 400 })

  const { data: member } = await supabaseServer
    .from('members')
    .select('region_id')
    .eq('employee_code', session.employeeCode)
    .single()

  const { data: drafts } = await supabaseServer
    .from('ballot_drafts')
    .select('position_id, candidate_id')
    .eq('employee_code', session.employeeCode)

  if (!drafts || drafts.length === 0) {
    return NextResponse.json({ error: 'No selections to submit.' }, { status: 400 })
  }

  const voteRows = drafts.map((d) => ({
    employee_code: session.employeeCode,
    position_id: d.position_id,
    candidate_id: d.candidate_id,
    region_id: member!.region_id
  }))

  const { error: voteError } = await supabaseServer.from('votes').insert(voteRows)
  if (voteError) return NextResponse.json({ error: voteError.message }, { status: 500 })

  const { error: subError } = await supabaseServer
    .from('ballot_submissions')
    .insert({ employee_code: session.employeeCode })
  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })

  await supabaseServer.from('ballot_drafts').delete().eq('employee_code', session.employeeCode)

  return NextResponse.json({ success: true })
}