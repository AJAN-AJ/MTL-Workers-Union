'use client'

import { useState, useEffect, useRef } from 'react'
import AppHeader from '@/app/components/AppHeader'

type Candidate = { id: number; name: string; image_url: string | null }
type Position = { id: number; name: string; candidates: Candidate[] }
type MyVote = { position_id: number; candidate_id: number; positions: { name: string }; candidates: { name: string } }
type ResultCandidate = { id: number; online: number; physical: number; name: string; total: number; isWinner: boolean }
type ResultPosition = { id: number; name: string;  candidates: ResultCandidate[]; nullvoidCount: number }

function useCountdown(target: string | null, onExpire?: () => void) {
  const [remaining, setRemaining] = useState('')
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    if (!target) {
      setRemaining('')
      return
    }
    const targetTime = new Date(target).getTime()

    function tick() {
      const diff = targetTime - Date.now()
      if (diff <= 0) {
        setRemaining('')
        if (!firedRef.current) {
          firedRef.current = true
          onExpire?.()
        }
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
  const [results, setResults] = useState<ResultPosition[]>([])
  const [reviewing, setReviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [opensAt, setOpensAt] = useState<string | null>(null)
  const [closesAt, setClosesAt] = useState<string | null>(null)
  const [memberName, setMemberName] = useState('')

  const timeUntilOpen = useCountdown(status === 'not_open' ? opensAt : null, () => loadBallot())
  const timeUntilClose = useCountdown(status === 'open' ? closesAt : null, () => loadBallot())

  useEffect(() => {
    loadBallot()
  }, [])

  async function loadBallot() {
    const res = await fetch('/api/vote/ballot')
    const data = await res.json()

    if (!res.ok || !data.status) {
      setLoadError(data.error || 'Something went wrong loading your ballot.')
      setStatus('error')
      return
    }

    setLoadError('')
    setStatus(data.status)
    if (data.positions) setPositions(data.positions)
    if (data.drafts) setSelections(data.drafts)
    if (data.myVotes) setMyVotes(data.myVotes)
    if (data.results) setResults(data.results)
    if (data.opensAt) setOpensAt(data.opensAt)
    if (data.closesAt) setClosesAt(data.closesAt)
    if (data.memberName) setMemberName(data.memberName)
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
  return (
    <div className="fixed inset-0 flex items-center flex-col justify-center bg-white">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full border-4 border-blue-100 border-t-blue-900 animate-spin" />
        <img
          src="/union-logo.gif"
          alt="MTL Workers Union"
          className="w-24 h-24 object-contain rounded-full"
        />
        
      </div>
       <h1 className="text-xl font-semibold text-slate-900">MTL WORKERS UNION</h1>
       <p className="text-sm text-slate-500 mt-1">Voting portal</p>
    </div>
  );
}

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 flex flex-col">
        <div className="max-w-sm md:max-w-md w-full mx-auto">
          <AppHeader title="Voting" />
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <p className="text-lg font-medium text-slate-900 mb-2">Couldn&apos;t load your ballot</p>
            <p className="text-slate-500 mb-4">{loadError || 'Please log in again.'}</p>
            <a href="/login" className="inline-block text-sm font-medium text-white bg-blue-900 rounded-lg px-4 py-2">
              Go to login
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'no_session') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 flex flex-col">
        <div className="max-w-sm md:max-w-md w-full mx-auto">
          <AppHeader title="Voting" />
          {memberName && (
            <p className="text-sm text-slate-600 mb-2">
              Welcome, <span className="font-medium text-slate-900">{memberName}</span>
            </p>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <p className="text-lg font-medium text-slate-900 mb-2">No voting session yet</p>
            <p className="text-slate-500">Your presiding officer hasn't set a voting date. Check again.</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'not_open') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 flex flex-col">
        <div className="max-w-sm md:max-w-md w-full mx-auto">
          <AppHeader title="Cast your vote" />
          {memberName && (
            <p className="text-sm text-slate-600 mb-2">
              Welcome, <span className="font-medium text-slate-900">{memberName}</span>
            </p>
          )}
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
          {memberName && (
            <p className="text-sm text-slate-600 mb-2">
              Welcome, <span className="font-medium text-slate-900">{memberName}</span>
            </p>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <p className="text-lg font-medium text-slate-900">Voting has closed.</p>
        </div>
      </div>
    )
  }

  if (status === 'results_released') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
        <div className="max-w-sm md:max-w-2xl mx-auto">
          <AppHeader title="Election results" subtitle="Results have been released." />
          {memberName && (
            <p className="text-sm text-slate-600 mb-4">
              Welcome, <span className="font-medium text-slate-900">{memberName}</span>
            </p>
          )}
          <div className="md:grid md:grid-cols-2 md:gap-4">
            {results.map((p) => {
              const myPick = myVotes.find((v) => v.position_id === p.id)
              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 md:mb-0">
                  <h2 className="font-medium text-slate-900 mb-3">{p.name}</h2>
                  {p.candidates.map((c) => (
                    <details key={c.id} className="group border-b border-slate-100 last:border-0 py-1.5">
                      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-between gap-2 select-none">
                        <span
                          className={`text-sm flex items-center gap-2 flex-wrap ${
                            myPick?.candidate_id === c.id ? 'font-medium text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {c.name}
                          {c.isWinner && (
                            <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                              Winner
                            </span>
                          )}
                          {myPick?.candidate_id === c.id && (
                            <span className="text-xs text-blue-900">(your vote)</span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm tabular-nums text-slate-600">{c.total} votes</span>
                          <span className="text-xs text-blue-900 font-medium">Detailed</span>
                          <span className="text-slate-400 text-xs transition-transform group-open:rotate-180">▾</span>
                        </span>
                      </summary>
                      <div className="mt-1.5 flex gap-4 text-xs text-slate-500">
                        <span>Online: {c.online}</span>
                        <span>Physical: {c.physical}</span>
                      </div>
                    </details>
                  ))}
                  <div className="flex justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                    <span>Null & Void: {p.nullvoidCount}</span>
                    
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (status === 'already_voted' || status === 'results_pending') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
        <div className="max-w-sm md:max-w-2xl mx-auto">
          <AppHeader
            title="Your vote summary"
            subtitle={status === 'results_pending' ? 'Results are not out yet.' : 'You have already voted.'}
          />
          {memberName && (
            <p className="text-sm text-slate-600 mb-4">
              Welcome, <span className="font-medium text-slate-900">{memberName}</span>
            </p>
          )}
          <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
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
      <div className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
        <div className="max-w-sm md:max-w-2xl mx-auto">
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
          <ul className="space-y-2 mb-6 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {positions.map((p) => {
              const chosen = p.candidates.find((c) => c.id === selections[p.id])
              return (
                <li key={p.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-500">{p.name}</p>
                    <p className="font-medium text-slate-900">{chosen?.name ?? <span className="text-slate-400 italic">Not voted</span>}</p>
                  </div>
                  <button onClick={() => setReviewing(false)} className="text-sm text-blue-900 font-medium">
                    Edit
                  </button>
                </li>
              )
            })}
          </ul>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 md:max-w-sm">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full md:max-w-sm bg-blue-900 text-white font-medium py-3 rounded-lg active:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Confirm & submit'}
          </button>
        </div>
      </div>
    )
  }

  if (status !== 'open') {
    // Defensive catch-all: never fall through to the voting UI for an
    // unrecognized status (e.g. a stale/unauthenticated session).
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 flex flex-col">
        <div className="max-w-sm md:max-w-md w-full mx-auto">
          <AppHeader title="Voting" />
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <p className="text-slate-500">Please log in to continue.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 pb-28">
      <div className="max-w-sm md:max-w-2xl lg:max-w-4xl mx-auto">
        <AppHeader title="Cast your vote" />

        {memberName && (
          <p className="text-sm text-slate-600 mb-4">
            Welcome, <span className="font-medium text-slate-900">{memberName}</span>
          </p>
        )}

        {timeUntilClose && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-6 text-center">
            <span className="text-sm text-amber-800">Voting closes in </span>
            <span className="text-sm font-semibold text-amber-900 tabular-nums">{timeUntilClose}</span>
          </div>
        )}

        {positions.map((p) => (
          <div key={p.id} className="mb-8">
            <h2 className="text-sm font-medium text-slate-500 mb-3">{p.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                  <div className="relative w-28 h-35 mx-auto mb-2">
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt=""
                        className="w-28 h-28 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 text-3xl font-medium">
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
            className="w-full max-w-sm md:max-w-md mx-auto block bg-blue-900 text-white font-medium py-3 rounded-lg active:bg-blue-800 disabled:opacity-40"
          >
            Review & submit
          </button>
        </div>
      </div>
    </div>
  )
}
