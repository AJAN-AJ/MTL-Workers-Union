import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session || !session.roles.includes('presiding_officer') || !session.poRegionId) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
    }
    const regionId = session.poRegionId

    const { data: alreadyEntered } = await supabaseServer
      .from('physical_votes')
      .select('id')
      .eq('region_id', regionId)
      .limit(1)

    if (alreadyEntered && alreadyEntered.length > 0) {
      return NextResponse.json({ error: 'Physical votes already entered for this region and cannot be edited.' }, { status: 400 })
    }

    const { entries, nullVoid } = await req.json()
    // entries: [{ positionId, candidateId, physicalCount }]
    // nullVoid: [{ positionId, nullCount, voidCount }]

    const { count: registeredVoters } = await supabaseServer
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('region_id', regionId)

    const { data: onlineVotes } = await supabaseServer
      .from('votes')
      .select('position_id')
      .eq('region_id', regionId)

    const positionIds = [...new Set(entries.map((e: any) => e.positionId))]
    for (const positionId of positionIds) {
      const physicalSum = entries
        .filter((e: any) => e.positionId === positionId)
        .reduce((sum: number, e: any) => sum + Number(e.physicalCount || 0), 0)
      const nv = nullVoid.find((n: any) => n.positionId === positionId)
      const nullVoidSum = Number(nv?.count || 0)
      const onlineCount = onlineVotes?.filter((v) => v.position_id === positionId).length ?? 0

      const total = physicalSum + nullVoidSum + onlineCount
      if (total > (registeredVoters || 0)) {
        return NextResponse.json({
          error: `Total votes for one position (${total}) exceed registered voters in this region (${registeredVoters}). Check your entry.`
        }, { status: 400 })
      }
    }

    const physicalRows = entries.map((e: any) => ({
      region_id: regionId,
      position_id: e.positionId,
      candidate_id: e.candidateId,
      vote_count: Number(e.physicalCount || 0),
      entered_by: session.employeeCode
    }))

    const { error: physError } = await supabaseServer.from('physical_votes').insert(physicalRows)
    if (physError) return NextResponse.json({ error: physError.message }, { status: 500 })

const nullVoidRows = nullVoid.map((n: any) => ({
      region_id: regionId,
      position_id: n.positionId,
      null_void_count: Number(n.count || 0),
      entered_by: session.employeeCode
    }))

    const { error: nvError } = await supabaseServer.from('null_void_votes').insert(nullVoidRows)
    if (nvError) return NextResponse.json({ error: nvError.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PHYSICAL VOTES ROUTE ERROR:', err)
    return NextResponse.json({ error: 'Something went wrong on the server.' }, { status: 500 })
  }
}