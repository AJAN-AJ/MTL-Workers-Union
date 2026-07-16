'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppHeader from '@/app/components/AppHeader'

export default function PoSessionPage() {
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/po/voting-window')
      .then((r) => r.json())
      .then((d) => {
        if (d.voting_opens_at) setOpensAt(d.voting_opens_at.slice(0, 16))
        if (d.voting_closes_at) setClosesAt(d.voting_closes_at.slice(0, 16))
      })
  }, [])

async function handleSave() {
  setError('')
  setMessage('')
  setSaving(true)
  const res = await fetch('/api/po/voting-window', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      opensAt: opensAt ? new Date(opensAt).toISOString() : null,
      closesAt: closesAt ? new Date(closesAt).toISOString() : null
    })
  })
  const data = await res.json()
  setSaving(false)
  if (!res.ok) {
    setError(data.error)
    return
  }
  setMessage('Voting window saved.')
}

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-md md:max-w-3xl mx-auto">
        <AppHeader title="Voting session" backHref="/po" showLogo />

        <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start">

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Opens at</label>
            <input
              type="datetime-local"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
              className="w-full px-3 py-3 border border-slate-300 rounded-lg text-base text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Closes at</label>
            <input
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="w-full px-3 py-3 border border-slate-300 rounded-lg text-base text-slate-900"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{message}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-900 text-white font-medium py-3 rounded-lg active:bg-blue-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save voting window'}
          </button>
        </div>

        <div className="mt-6 md:mt-0 bg-white border border-slate-200 rounded-xl p-4">
  <button
    onClick={async () => {
      if (!confirm('This archives the current session and clears candidates/votes for a fresh one. Continue?')) return
      const res = await fetch('/api/po/archive-session', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setError('')
      alert('Session archived. You can now set up a new one.')
      window.location.reload()
    }}
    className="w-full bg-slate-700 text-white font-medium py-3 rounded-lg active:bg-slate-800"
  >
    Archive this session & start a new one
  </button>
  <p className="text-xs text-slate-500 mt-2">
    Only works after results have been released. Past candidates and votes are saved as a summary, then cleared for the next round.
  </p>
</div>

        </div>
      </div>
    </div>
  )
}