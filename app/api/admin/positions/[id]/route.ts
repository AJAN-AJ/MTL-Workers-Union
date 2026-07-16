import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await getCurrentSession()
  if (!session || !session.roles.includes('admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const { data: linkedCandidates } = await supabaseServer
    .from('candidate_positions')
    .select('candidate_id')
    .eq('position_id', id)
    .limit(1)

  if (linkedCandidates && linkedCandidates.length > 0) {
    return NextResponse.json({ error: 'This position has candidates registered for it and cannot be removed.' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('positions').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}