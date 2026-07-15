import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session || !session.roles.includes('admin')) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
    }

    const q = req.nextUrl.searchParams.get('q') || ''

    let query = supabaseServer
      .from('members')
     .select('employee_code, first_name, surname, region_id, regions!members_region_id_fkey(name), member_roles(role, region_id)')
      .order('surname', { ascending: true })
      .limit(50)

    if (q) {
      query = query.or(`employee_code.ilike.%${q}%,first_name.ilike.%${q}%,surname.ilike.%${q}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('MEMBERS ROUTE ERROR:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ members: data })
  } catch (err) {
    console.error('MEMBERS ROUTE CRASH:', err)
    return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 })
  }
}