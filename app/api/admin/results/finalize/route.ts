import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const { regionId } = await req.json()

  const { data: positions } = await supabaseServer
    .from('positions')
    .select('id, name, candidate_positions!inner(candidates!inner(region_id))')

  const relevantPositionIds = (positions || [])
    .filter((p: any) => p.candidate_positions.some((cp: any) => cp.candidates.region_id === regionId))
    .map((p: any) => p.id)

  const { data: winners } = await supabaseServer
    .from('position_winners')
    .select('position_id, candidate_id, positions(name), candidates(name, employee_code, members(email))')
    .eq('region_id', regionId)

  const missing = relevantPositionIds.filter((id) => !winners?.some((w) => w.position_id === id))
  if (missing.length > 0) {
    return NextResponse.json({ error: 'Not every position in this region has a confirmed winner yet.' }, { status: 400 })
  }

  for (const w of winners || []) {
    const winnerEmail = (w.candidates as any)?.members?.email
    if (winnerEmail) {
      await sendEmail(
        winnerEmail,
        'Congratulations — you won!',
        `<p>Congratulations, ${(w.candidates as any)?.name}! You have been elected as <strong>${(w.positions as any)?.name}</strong>.</p>`
      )
    }
  }

  const { data: members } = await supabaseServer
    .from('members')
    .select('email, first_name')
    .eq('region_id', regionId)

  const summaryHtml = (winners || [])
    .map((w) => `<li>${(w.positions as any)?.name}: <strong>${(w.candidates as any)?.name}</strong></li>`)
    .join('')

  for (const m of members || []) {
    if (m.email) {
      await sendEmail(
        m.email,
        'MTL Workers Union — Election Results',
        `<p>Hi ${m.first_name},</p><p>Results are in for your region:</p><ul>${summaryHtml}</ul>`
      )
    }
  }

  await supabaseServer
    .from('region_results')
    .upsert({ region_id: regionId, status: 'released', released_by: session.employeeCode, released_at: new Date().toISOString() })

  return NextResponse.json({ success: true })
}