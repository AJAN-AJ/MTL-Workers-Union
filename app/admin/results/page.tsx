'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppHeader from '@/app/components/AppHeader'

type Candidate = { id: number; name: string; total: number }
type Position = { id: number; name: string; candidates: Candidate[]; confirmedCandidateId: number | null }
type Region = { id: number; name: string; positions: Position[] }

export default function AdminResultsPage() {
  const [regions, setRegions] = useState<Region[]>([])
  const [activeRegion, setActiveRegion] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/admin/results')
    const data = await res.json()
    if (res.ok) {
      setRegions(data.regions)
      setActiveRegion((prev) => prev ?? data.regions[0]?.id ?? null)
    }
  }

  useEffect(() => { load() }, [])

  const current = regions.find((r) => r.id === activeRegion)

  async function confirmWinner(positionId: number, candidateId: number) {
    await fetch('/api/admin/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regionId: activeRegion, positionId, candidateId })
    })
    load()
  }

  async function finalize() {
    setError('')
    setMessage('')
    const res = await fetch('/api/admin/results/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regionId: activeRegion })
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      return
    }
    setMessage('Results released and emails sent for this region.')
    load()
  }

  const allConfirmed = current?.positions.every((p) => p.confirmedCandidateId) ?? false

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        <AppHeader title="Confirm winners" backHref="/admin" />

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {regions.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRegion(r.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                activeRegion === r.id ? 'bg-blue-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {current?.positions.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <h2 className="font-medium text-slate-900 mb-3">{p.name}</h2>
            {p.candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => confirmWinner(p.id, c.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border mb-2 last:mb-0 text-left ${
                  p.confirmedCandidateId === c.id ? 'border-blue-900 bg-blue-50' : 'border-slate-200'
                }`}
              >
                <span className="text-sm text-slate-900">{c.name} ({c.total} votes)</span>
                {p.confirmedCandidateId === c.id && <span className="text-blue-900 text-sm font-medium">Winner</span>}
              </button>
            ))}
          </div>
        ))}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
        {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">{message}</p>}

        <button
          onClick={finalize}
          disabled={!allConfirmed}
          className="w-full bg-blue-900 text-white font-medium py-3 rounded-lg active:bg-blue-800 disabled:opacity-40"
        >
          Release results & send emails
        </button>
      </div>
    </div>
  )
}