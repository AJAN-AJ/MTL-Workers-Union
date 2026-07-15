import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { hashPassword, verifyPassword, createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { employeeCode, password } = await req.json()
    if (!employeeCode || !password) {
      return NextResponse.json({ error: 'Employee ID and password are required.' }, { status: 400 })
    }
    const { data: member, error } = await supabaseServer
      .from('members')
      .select('employee_code, password_hash')
      .eq('employee_code', employeeCode)
      .single()
    if (error || !member) {
      return NextResponse.json({ error: 'Employee ID not found.' }, { status: 401 })
    }
    if (!member.password_hash) {
      const newHash = await hashPassword(password)
      const { error: updateError } = await supabaseServer
        .from('members')
        .update({ password_hash: newHash })
        .eq('employee_code', employeeCode)
      if (updateError) {
        return NextResponse.json({ error: 'Could not set password. Try again.' }, { status: 500 })
      }
    } else {
      const valid = await verifyPassword(password, member.password_hash)
      if (!valid) {
        return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
      }
    }
    const { data: roleRows } = await supabaseServer
      .from('member_roles')
      .select('role, region_id')
      .eq('employee_code', employeeCode)
    const roles = roleRows ? roleRows.map((r) => r.role) : []
    const poRole = roleRows?.find((r) => r.role === 'presiding_officer')
    const poRegionId = poRole?.region_id ?? null
    const token = await createSession({ employeeCode, roles, poRegionId })
    const response = NextResponse.json({
      success: true,
      redirectTo: roles.includes('admin')
        ? '/admin'
        : roles.includes('presiding_officer')
        ? '/po'
        : '/vote'
    })
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/'
    })
    return response
  } catch (err) {
    console.error('LOGIN ROUTE ERROR:', err)
    return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 })
  }
}