import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await getCurrentSession()
  if (!session || !session.roles.includes('presiding_officer') || !session.poRegionId) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const { error } = await supabaseServer
    .from('candidates')
    .delete()
    .eq('id', id)
    .eq('region_id', session.poRegionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}