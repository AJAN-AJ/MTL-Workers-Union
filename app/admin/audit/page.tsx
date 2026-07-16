'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import AppHeader from '@/app/components/AppHeader'

export default function AdminAuditPage() {
  const [votes, setVotes] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/audit').then((r) => r.json()).then((d) => {
      if (d.votes) setVotes(d.votes)
      setDataLoading(false)
    })
  }, [])

  const groupedByCandidate = useMemo(() => {
    const groups = new Map<string, {
      positionName: string
      candidateName: string
      voters: { name: string; employeeCode: string; regionName: string }[]
    }>()

    for (const v of votes) {
      const positionName = v.positions?.name ?? 'Unknown position'
      const candidateName = v.candidates?.name ?? 'Unknown candidate'
      const key = `${positionName}::${candidateName}`

      if (!groups.has(key)) {
        groups.set(key, { positionName, candidateName, voters: [] })
      }
      groups.get(key)!.voters.push({
        name: `${v.members?.first_name ?? ''} ${v.members?.surname ?? ''}`.trim(),
        employeeCode: v.employee_code,
        regionName: v.regions?.name ?? ''
      })
    }

    return Array.from(groups.values()).sort((a, b) => b.voters.length - a.voters.length)
  }, [votes])

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-md md:max-w-4xl mx-auto">
        <AppHeader title="Vote audit trail" backHref="/admin" showLogo />

        {dataLoading ? (
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg px-4 py-3 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
        <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 md:items-start">
          {groupedByCandidate.map((g) => (
            <li key={`${g.positionName}::${g.candidateName}`} className="bg-white border border-slate-200 rounded-lg">
              <details className="group">
                <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer px-4 py-3 flex items-center justify-between gap-3 select-none">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{g.candidateName}</p>
                    <p className="text-xs text-slate-500 truncate">{g.positionName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                      {g.voters.length} vote{g.voters.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-slate-400 text-sm transition-transform group-open:rotate-180">▾</span>
                  </div>
                </summary>
                <ul className="border-t border-slate-100 px-4 py-2 space-y-1.5 max-h-64 overflow-y-auto">
                  {g.voters.map((voter, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-center justify-between gap-3">
                      <span className="truncate">{voter.name} ({voter.employeeCode})</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">{voter.regionName}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
          {groupedByCandidate.length === 0 && <p className="text-sm text-slate-500">No votes cast yet.</p>}
        </ul>
        )}
      </div>
    </div>
  )
}