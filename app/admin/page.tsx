'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppHeader from '@/app/components/AppHeader'

type Position = { id: number; name: string }

export default function AdminPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [newPosition, setNewPosition] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  async function loadPositions() {
    const res = await fetch('/api/admin/positions')
    const data = await res.json()
    if (res.ok) setPositions(data.positions)
    setDataLoading(false)
  }

  useEffect(() => {
    loadPositions()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/admin/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPosition })
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    setNewPosition('')
    setLoading(false)
    loadPositions()
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
      <div className="max-w-md md:max-w-5xl mx-auto">
        <AppHeader title="Admin" subtitle="Positions" showLogo />
        <div className="flex flex-col md:flex-row md:items-center md:gap-5 mb-4">
          <Link href="/admin/members" className="text-sm text-blue-900 font-medium block mb-4 md:mb-0 md:px-3 md:py-1.5 md:rounded-lg md:hover:bg-blue-50">
            Manage members & roles →
          </Link>
          <Link href="/admin/summary" className="text-sm text-blue-900 font-medium block mb-4 md:mb-0 md:px-3 md:py-1.5 md:rounded-lg md:hover:bg-blue-50">
            View vote summary →
          </Link>
          <Link href="/admin/audit" className="text-sm text-blue-900 font-medium block mb-4 md:mb-0 md:px-3 md:py-1.5 md:rounded-lg md:hover:bg-blue-50">View vote audit trail →</Link>
        </div>

        <div className="md:grid md:grid-cols-[380px_1fr] md:gap-8 md:items-start">

        <div>
        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value)}
            placeholder="e.g. Chairperson"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-60"
          >
            Add
          </button>
        </form>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        </div>

        {dataLoading ? (
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {positions.map((p) => (
              <li
                key={p.id}
                className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 flex items-center justify-between gap-3"
              >
                <span>{p.name}</span>
                <button
                  onClick={async () => {
                    if (!confirm(`Remove position "${p.name}"?`)) return
                    const res = await fetch(`/api/admin/positions/${p.id}`, { method: 'DELETE' })
                    const data = await res.json()
                    if (!res.ok) {
                      setError(data.error)
                      return
                    }
                    loadPositions()
                  }}
                  className="text-sm text-red-600 flex-shrink-0"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        </div>
      </div>
    </div>
  )
}