import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const session = await getCurrentSession()
    if (!session || !session.roles.includes('presiding_officer') || !session.poRegionId) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
    }

    // Block removal if this candidate has already received real, submitted votes —
    // removing them at that point would corrupt the election results.
    const { data: existingVotes } = await supabaseServer
      .from('votes')
      .select('id')
      .eq('candidate_id', id)
      .limit(1)

    if (existingVotes && existingVotes.length > 0) {
      return NextResponse.json({ error: 'This candidate has already received votes and cannot be removed.' }, { status: 400 })
    }

    // Safe to clear: unsubmitted draft selections that happen to point at this candidate.
    await supabaseServer.from('ballot_drafts').delete().eq('candidate_id', id)

    const { error } = await supabaseServer
      .from('candidates')
      .delete()
      .eq('id', id)
      .eq('region_id', session.poRegionId)

    if (error) {
      console.error('DELETE CANDIDATE ERROR:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE CANDIDATE CRASH:', err)
    return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 })
  }
}