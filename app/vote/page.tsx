'use client'

import { useState, useEffect } from 'react'
import AppHeader from '@/app/components/AppHeader'

type Candidate = { id: number; name: string; image_url: string | null }
type Position = { id: number; name: string; candidates: Candidate[] }
type MyVote = { position_id: number; candidate_id: number; positions: { name: string }; candidates: { name: string } }

export default function VotePage() {
  const [status, setStatus] = useState<string>('loading')
  const [positions, setPositions] = useState<Position[]>([])
  const [selections, setSelections] = useState<Record<number, number>>({})
  const [myVotes, setMyVotes] = useState<MyVote[]>([])
  const [reviewing, setReviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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
        <div className="max-w-sm w-full mx-auto">
          <AppHeader title="Cast your vote" />
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <p className="text-lg font-medium text-slate-900 mb-2">Voting hasn't opened yet</p>
            <p className="text-slate-500">Check back once voting begins.</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'closed_no_vote') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 flex flex-col">
        <div className="max-w-sm w-full mx-auto">
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
        <div className="max-w-sm mx-auto">
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

  // status === 'open'
  const allSelected = positions.every((p) => selections[p.id])

  if (reviewing) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="max-w-sm mx-auto">
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
                  <button
                    onClick={() => setReviewing(false)}
                    className="text-sm text-blue-900 font-medium"
                  >
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
      <div className="max-w-sm mx-auto">
        <AppHeader title="Cast your vote" />

        {positions.map((p) => (
          <div key={p.id} className="mb-8">
            <h2 className="text-sm font-medium text-slate-500 mb-3">{p.name}</h2>
            <div className="space-y-2">
              {p.candidates.map((c) => (
                <button
  key={c.id}
  onClick={() => selectCandidate(p.id, c.id)}
  className={`w-full rounded-xl border overflow-hidden text-left ${
    selections[p.id] === c.id
      ? 'border-blue-900 border-2'
      : 'border-slate-200'
  }`}
>
  <div className="relative">
    {c.image_url ? (
      <img
        src={c.image_url}
        alt=""
        className="w-full aspect-square object-cover"
      />
    ) : (
      <div className="w-full aspect-square bg-slate-200 flex items-center justify-center text-slate-400 text-5xl font-medium">
        {c.name.charAt(0)}
      </div>
    )}
    {selections[p.id] === c.id && (
      <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-blue-900 flex items-center justify-center text-white text-sm">✓</span>
    )}
  </div>
  <div className="bg-white px-3 py-2.5">
    <span className="font-medium text-slate-900 text-base">{c.name}</span>
  </div>
</button>
              ))}
            </div>
          </div>
        ))}

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
          <button
            onClick={() => setReviewing(true)}
            disabled={!allSelected}
            className="w-full max-w-sm mx-auto block bg-blue-900 text-white font-medium py-3 rounded-lg active:bg-blue-800 disabled:opacity-40"
          >
            Review & submit
          </button>
        </div>
      </div>
    </div>
  )
}