import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function GET() {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('presiding_officer') || !session.poRegionId) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const { data, error } = await supabaseServer
    .from('candidates')
    .select('id, name, image_url, candidate_positions(position_id, positions(name))')
    .eq('region_id', session.poRegionId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ candidates: data })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session || !session.roles.includes('presiding_officer') || !session.poRegionId) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
    }

    const { employeeCode, imageUrl, positionIds } = await req.json()

    if (!employeeCode) {
      return NextResponse.json({ error: 'Select a member from the list.' }, { status: 400 })
    }
    if (!positionIds || positionIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one position.' }, { status: 400 })
    }

    // Verify this is a real member in the PO's own region — this is the actual
    // enforcement point: no lookup match, no candidate.
    const { data: member, error: memberError } = await supabaseServer
      .from('members')
      .select('employee_code, first_name, surname, region_id')
      .eq('employee_code', employeeCode)
      .eq('region_id', session.poRegionId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'That employee ID was not found in your region.' }, { status: 400 })
    }

    const { data: alreadyCandidate } = await supabaseServer
      .from('candidates')
      .select('id')
      .eq('employee_code', employeeCode)
      .maybeSingle()

    if (alreadyCandidate) {
      return NextResponse.json({ error: 'This member is already registered as a candidate.' }, { status: 400 })
    }

    const { data: candidate, error: candidateError } = await supabaseServer
      .from('candidates')
      .insert({
        name: `${member.first_name} ${member.surname}`,
        employee_code: member.employee_code,
        image_url: imageUrl || null,
        region_id: session.poRegionId,
        added_by: session.employeeCode
      })
      .select()
      .single()

    if (candidateError) {
      return NextResponse.json({ error: candidateError.message }, { status: 500 })
    }

    const links = positionIds.map((positionId: number) => ({
      candidate_id: candidate.id,
      position_id: positionId
    }))

    const { error: linkError } = await supabaseServer.from('candidate_positions').insert(links)
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

    return NextResponse.json({ candidate })
  } catch (err) {
    console.error('CANDIDATES ROUTE ERROR:', err)
    return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 })
  }
}