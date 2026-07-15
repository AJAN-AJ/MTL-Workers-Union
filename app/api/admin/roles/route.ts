import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const { employeeCode, role, regionId } = await req.json()

  if (!employeeCode || !role) {
    return NextResponse.json({ error: 'Employee code and role are required.' }, { status: 400 })
  }
  if (role === 'presiding_officer' && !regionId) {
    return NextResponse.json({ error: 'A region is required for a Presiding Officer.' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('member_roles')
    .insert({ employee_code: employeeCode, role, region_id: role === 'admin' ? null : regionId })

  if (error) {
    const message = error.code === '23505' ? 'That role is already assigned.' : error.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const { employeeCode, role, regionId } = await req.json()

  let query = supabaseServer
    .from('member_roles')
    .delete()
    .eq('employee_code', employeeCode)
    .eq('role', role)

  if (regionId) query = query.eq('region_id', regionId)

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}