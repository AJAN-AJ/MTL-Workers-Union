import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function GET() {
    const session = await getCurrentSession()
  if (!session || (!session.roles.includes('admin') && !session.roles.includes('presiding_officer'))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }
  const { data, error } = await supabaseServer
    .from('positions')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ positions: data })
}

export async function POST(req: NextRequest) {
    const session = await getCurrentSession()
  if (!session || !session.roles.includes('admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }
  try {
    const { name } = await req.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Position name is required.' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('positions')
      .insert({ name: name.trim() })
      .select()
      .single()

    if (error) {
      const message = error.code === '23505' ? 'That position already exists.' : error.message
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ position: data })
  } catch (err) {
    console.error('POSITIONS ROUTE ERROR:', err)
    return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 })
  }
}