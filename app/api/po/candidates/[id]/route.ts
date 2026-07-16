import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentSession()
  if (!session || !session.roles.includes('presiding_officer') || !session.poRegionId) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const { error } = await supabaseServer
    .from('candidates')
    .delete()
    .eq('id', params.id)
    .eq('region_id', session.poRegionId) // only allows deleting their own region's candidates

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}