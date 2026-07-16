'use client'

import { useState, useEffect } from 'react'
import AppHeader from '@/app/components/AppHeader'

type Candidate = { id: number; name: string; image_url: string | null }
type Position = { id: number; name: string; candidates: Candidate[] }
type MyVote = { position_id: number; candidate_id: number; positions: { name: string }; candidates: { name: string } }

function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!target) return
    const targetTime = new Date(target).getTime()

    function tick() {
      const diff = targetTime - Date.now()
      if (diff <= 0) {
        setRemaining('')
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
      const seconds = Math.floor((diff / 1000) % 60)
      const parts = []
      if (days > 0) parts.push(`${days}d`)
      parts.push(`${hours}h`, `${minutes}m`, `${seconds}s`)
      setRemaining(parts.join(' '))
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [target])

  return remaining
}

export default function VotePage() {
  const [status, setStatus] = useState<string>('loading')
  const [positions, setPositions] = useState<Position[]>([])
  const [selections, setSelections] = useState<Record<number, number>>({})
  const [myVotes, setMyVotes] = useState<MyVote[]>([])
  const [reviewing, setReviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [opensAt, setOpensAt] = useState<string | null>(null)
  const [closesAt, setClosesAt] = useState<string | null>(null)

  const timeUntilOpen = useCountdown(status === 'not_open' ? opensAt : null)
  const timeUntilClose = useCountdown(status === 'open' ? closesAt : null)

  useEffect(() => {
    loadBallot()
  }, [])

  async function loadBallot() {
    const res = await fetch('/api/vote/ballot')
    const data = await res.json()
    setStatus(data.status)
    if (data.positions) setPositions(data.positions)
    if (data.drafts) setSelections(data.drafts)
    if (data.myVotes) setMyVotes(data.myVotes)
    if (data.opensAt) setOpensAt(data.opensAt)
    if (data.closesAt) setClosesAt(data.closesAt)
  }

  async function selectCandidate(positionId: number, candidateId: number) {
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }))
    await fetch('/api/vote/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId, candidateId })
    })
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/vote/submit', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setSubmitting(false)
      return
    }
    loadBallot()
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading...</div>
  }

  if (status === 'not_open') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 flex flex-col">
        <div className="max-w-sm md:max-w-md w-full mx-auto">
          <AppHeader title="Cast your vote" />
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <p className="text-lg font-medium text-slate-900 mb-2">Voting hasn't opened yet</p>
            {timeUntilOpen ? (
              <p className="text-2xl font-semibold text-blue-900 tabular-nums">{timeUntilOpen}</p>
            ) : (
              <p className="text-slate-500">Check back once voting begins.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (status === 'closed_no_vote') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 flex flex-col">
        <div className="max-w-sm md:max-w-md w-full mx-auto">
          <AppHeader title="Cast your vote" />
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <p className="text-lg font-medium text-slate-900">Voting has closed.</p>
        </div>
      </div>
    )
  }

  if (status === 'already_voted' || status === 'results_pending') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="max-w-sm md:max-w-md mx-auto">
          <AppHeader
            title="Your vote summary"
            subtitle={status === 'results_pending' ? 'Results are not out yet.' : 'You have already voted.'}
          />
          <ul className="space-y-2">
            {myVotes.map((v) => (
              <li key={v.position_id} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                <p className="text-sm text-slate-500">{v.positions.name}</p>
                <p className="font-medium text-slate-900">{v.candidates.name}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  const allSelected = positions.every((p) => selections[p.id])

  if (reviewing) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="max-w-sm md:max-w-md mx-auto">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setReviewing(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white active:bg-slate-50 flex-shrink-0"
                aria-label="Back to voting"
              >
                <span className="text-slate-700 text-lg">←</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-900 truncate">Review your ballot</h1>
                <p className="text-sm text-slate-500 truncate">Confirm before submitting — you can&apos;t change it after.</p>
              </div>
            </div>
          </div>
          <ul className="space-y-2 mb-6">
            {positions.map((p) => {
              const chosen = p.candidates.find((c) => c.id === selections[p.id])
              return (
                <li key={p.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-500">{p.name}</p>
                    <p className="font-medium text-slate-900">{chosen?.name}</p>
                  </div>
                  <button onClick={() => setReviewing(false)} className="text-sm text-blue-900 font-medium">
                    Edit
                  </button>
                </li>
              )
            })}
          </ul>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-blue-900 text-white font-medium py-3 rounded-lg active:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Confirm & submit'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 pb-28">
      <div className="max-w-sm md:max-w-2xl lg:max-w-4xl mx-auto">
        <AppHeader title="Cast your vote" />

        {timeUntilClose && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-6 text-center">
            <span className="text-sm text-amber-800">Voting closes in </span>
            <span className="text-sm font-semibold text-amber-900 tabular-nums">{timeUntilClose}</span>
          </div>
        )}

        {positions.map((p) => (
          <div key={p.id} className="mb-8">
            <h2 className="text-sm font-medium text-slate-500 mb-3">{p.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {p.candidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCandidate(p.id, c.id)}
                  className={`rounded-xl border p-3 text-center ${
                    selections[p.id] === c.id
                      ? 'border-blue-900 border-2 bg-blue-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="relative w-20 h-20 mx-auto mb-2">
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt=""
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 text-2xl font-medium">
                        {c.name.charAt(0)}
                      </div>
                    )}
                    {selections[p.id] === c.id && (
                      <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center text-white text-xs">✓</span>
                    )}
                  </div>
                  <span className="font-medium text-slate-900 text-sm block">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
          <button
            onClick={() => setReviewing(true)}
            disabled={!allSelected}
            className="w-full max-w-sm md:max-w-md mx-auto block bg-blue-900 text-white font-medium py-3 rounded-lg active:bg-blue-800 disabled:opacity-40"
          >
            Review & submit
          </button>
        </div>
      </div>
    </div>
  )
}