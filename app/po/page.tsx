'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppHeader from '@/app/components/AppHeader'

type Position = { id: number; name: string }
type Candidate = {
  id: number
  name: string
  image_url: string | null
  candidate_positions: { position_id: number; positions: { name: string } }[]
}

export default function PresidingOfficerPage() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedPositions, setSelectedPositions] = useState<number[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)

  async function loadData() {
    const [posRes, candRes] = await Promise.all([
      fetch('/api/admin/positions'),
      fetch('/api/po/candidates')
    ])
    const posData = await posRes.json()
    const candData = await candRes.json()
    if (posRes.ok) setPositions(posData.positions)
    if (candRes.ok) setCandidates(candData.candidates)
    setDataLoading(false)
    }

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/po/members-search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (res.ok) setSearchResults(data.members)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  useEffect(() => {
    loadData()
  }, [])

  function togglePosition(id: number) {
    setSelectedPositions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!selectedMember) {
      setError('Select a member from the list.')
      setLoading(false)
      return
    }

    let imageUrl = null
    if (imageFile) {
      const fd = new FormData()
      fd.append('file', imageFile)
      const uploadRes = await fetch('/api/po/upload-image', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) {
        setError(uploadData.error)
        setLoading(false)
        return
      }
      imageUrl = uploadData.url
    }

    const res = await fetch('/api/po/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeCode: selectedMember.employee_code,
        imageUrl,
        positionIds: selectedPositions
      })
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    setSelectedMember(null)
    setSearchQuery('')
    setImageFile(null)
    setSelectedPositions([])
    setLoading(false)
    loadData()
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        <AppHeader title="Add candidate" subtitle="Presiding officer" />

        <Link href="/po/tally" className="text-sm text-blue-900 font-medium block mb-2">
          Enter physical votes →
        </Link>
        <Link href="/po/session" className="text-sm text-blue-900 font-medium block mb-4">
          Set voting session →
        </Link>

        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-xl p-4 mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Candidate (must be a registered member)
            </label>
            {selectedMember ? (
              <div className="flex items-center justify-between px-3 py-3 border border-blue-900 bg-blue-50 rounded-lg">
                <span className="text-base text-slate-900">
                  {selectedMember.first_name} {selectedMember.surname} — {selectedMember.employee_code}
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedMember(null); setSearchQuery('') }}
                  className="text-sm text-blue-900"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or employee ID"
                  className="w-full px-3 py-3 border border-slate-300 rounded-lg text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-sm">
                    {searchResults.map((m) => (
                      <button
                        key={m.employee_code}
                        type="button"
                        onClick={() => { setSelectedMember(m); setSearchResults([]) }}
                        className="w-full text-left px-3 py-2.5 active:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <p className="text-sm text-slate-900">{m.first_name} {m.surname}</p>
                        <p className="text-xs text-slate-500">{m.employee_code}</p>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">No matching member found in your region.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Photo <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-900 file:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contesting for
            </label>
            <div className="space-y-2">
              {positions.map((pos) => (
                <label
                  key={pos.id}
                  className="flex items-center gap-3 px-3 py-3 border border-slate-200 rounded-lg active:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedPositions.includes(pos.id)}
                    onChange={() => togglePosition(pos.id)}
                    className="w-5 h-5 accent-blue-900"
                  />
                  <span className="text-base text-slate-900">{pos.name}</span>
                </label>
              ))}
              {positions.length === 0 && (
                <p className="text-sm text-slate-500">
                  No positions yet — ask the Admin to add positions first.
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 text-white font-medium py-3 rounded-lg active:bg-blue-800 disabled:opacity-60"
          >
            Add candidate
          </button>
        </form>
<h2 className="text-lg font-semibold text-slate-900 mb-3">Candidates so far</h2>
        {dataLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg px-4 py-3 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {candidates.map((c) => (
              <li key={c.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                <p className="font-medium text-slate-900">{c.name}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {c.candidate_positions.map((cp) => cp.positions.name).join(', ')}
                </p>
              </li>
            ))}
            {candidates.length === 0 && (
              <p className="text-sm text-slate-500">No candidates added yet.</p>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}