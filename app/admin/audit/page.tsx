'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppHeader from '@/app/components/AppHeader'

export default function AdminAuditPage() {
  const [votes, setVotes] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/audit').then((r) => r.json()).then((d) => d.votes && setVotes(d.votes))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        <AppHeader title="Vote audit trail" backHref="/admin" />

        <ul className="space-y-2">
          {votes.map((v, i) => (
            <li key={i} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-slate-900">
                {v.members?.first_name} {v.members?.surname} ({v.employee_code})
              </p>
              <p className="text-xs text-slate-500">{v.regions?.name}</p>
              <p className="text-sm text-slate-700 mt-1">{v.positions?.name} → {v.candidates?.name}</p>
            </li>
          ))}
          {votes.length === 0 && <p className="text-sm text-slate-500">No votes cast yet.</p>}
        </ul>
      </div>
    </div>
  )
}