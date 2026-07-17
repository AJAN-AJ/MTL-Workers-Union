'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AppHeader from '@/app/components/AppHeader'

type Candidate = { id: number; name: string; onlineCount: number; physicalCount: number | null }
type Position = { id: number; name: string; candidates: Candidate[]; nullVoidCount: number | null }

export default function TallyPage() {
  const [releasedResults, setReleasedResults] = useState<{ regionName: string; winners: any[] } | null>(null)
const canvasRef = useRef<HTMLCanvasElement>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [locked, setLocked] = useState(false)
  const [physicalInputs, setPhysicalInputs] = useState<Record<string, string>>({})
  const [nullVoidInputs, setNullVoidInputs] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setDataLoading(true)
    const res = await fetch('/api/po/tally')
    const data = await res.json()
    if (res.ok) {
      setPositions(data.positions)
      setLocked(data.locked)
    }
    setDataLoading(false)
  }

  function key(positionId: number, candidateId: number) {
    return `${positionId}-${candidateId}`
  }

  async function handleSubmit() {
    setError('')
    setSubmitting(true)

    const entries = positions.flatMap((p) =>
      p.candidates.map((c) => ({
        positionId: p.id,
        candidateId: c.id,
        physicalCount: physicalInputs[key(p.id, c.id)] || '0'
      }))
    )
    const nullVoid = positions.map((p) => ({
      positionId: p.id,
      count: nullVoidInputs[p.id] || '0'
    }))

    const res = await fetch('/api/po/physical-votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries, nullVoid })
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    load()
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-md md:max-w-5xl mx-auto">
        <AppHeader title="Physical vote entry" backHref="/po" showLogo />

        {locked && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Physical votes have already been entered and locked for this region.
          </p>
        )}

        {dataLoading ? (
          <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
                <div className="flex justify-between items-center mb-3">
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-8 w-16 bg-slate-100 rounded-lg" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-8 w-16 bg-slate-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
            {positions.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 md:mb-0">
                <h2 className="font-medium text-slate-900 mb-3">{p.name}</h2>

                {p.candidates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between mb-2 gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">Online: {c.onlineCount}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      disabled={locked}
                      defaultValue={c.physicalCount ?? ''}
                      onChange={(e) =>
                        setPhysicalInputs((prev) => ({ ...prev, [key(p.id, c.id)]: e.target.value }))
                      }
                      className="w-20 px-2 py-2 border border-slate-300 rounded-lg text-base text-slate-900 text-center disabled:bg-slate-100"
                      placeholder="0"
                    />
                  </div>
                ))}

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <label className="text-xs text-slate-500 block mb-1">Null/void votes</label>
                  <input
                    type="number"
                    min="0"
                    disabled={locked}
                    defaultValue={p.nullVoidCount ?? ''}
                    onChange={(e) =>
                      setNullVoidInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-base text-slate-900 text-center disabled:bg-slate-100"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 mt-4">
                {error}
              </p>
            )}

            <div className="md:max-w-sm">
            {!locked && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-4 bg-blue-900 text-white font-medium py-3 rounded-lg active:bg-blue-800 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit physical votes (cannot be edited after)'}
              </button>
            )}

            <button
            onClick={async () => {
  const res = await fetch('/api/po/release-results', { method: 'POST' })
  const data = await res.json()
  if (!res.ok) { setError(data.error); return }
  setError('')
  setReleasedResults({ regionName: data.regionName, winners: data.winners })
  load()
}}
              disabled={!locked}
              className="w-full mt-4 bg-green-700 text-white font-medium py-3 rounded-lg active:bg-green-800 disabled:opacity-40"
            >
              Release results
            </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}