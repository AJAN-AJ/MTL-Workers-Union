import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('presiding_officer') || !session.poRegionId) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q') || ''
  if (!q || q.length < 2) return NextResponse.json({ members: [] })

  const { data, error } = await supabaseServer
    .from('members')
    .select('employee_code, first_name, surname, email')
    .eq('region_id', session.poRegionId)
    .or(`first_name.ilike.%${q}%,surname.ilike.%${q}%,employee_code.ilike.%${q}%`)
    .limit(8)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data })
}