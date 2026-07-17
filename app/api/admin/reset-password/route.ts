import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const { employeeCode } = await req.json()
  if (!employeeCode) {
    return NextResponse.json({ error: 'Employee code is required.' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('members')
    .update({ password_hash: null })
    .eq('employee_code', employeeCode)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}