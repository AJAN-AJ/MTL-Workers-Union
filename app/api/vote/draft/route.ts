import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

  const { positionId, candidateId } = await req.json()

  const { error } = await supabaseServer
    .from('ballot_drafts')
    .upsert(
      { employee_code: session.employeeCode, position_id: positionId, candidate_id: candidateId },
      { onConflict: 'employee_code,position_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}