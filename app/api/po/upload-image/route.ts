import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('presiding_officer')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabaseServer.storage
    .from('candidate-photos')
    .upload(path, file)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabaseServer.storage.from('candidate-photos').getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl })
}