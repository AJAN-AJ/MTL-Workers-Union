'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppHeader from '@/app/components/AppHeader'

type Candidate = { id: number; name: string; online: number; physical: number; total: number }
type Position = { id: number; name: string; nullCount: number; voidCount: number; candidates: Candidate[] }
type Region = { id: number; name: string; registeredVoters: number; released: boolean; positions: Position[] }

export default function AdminSummaryPage() {
  const [regions, setRegions] = useState<Region[]>([])
  const [activeRegion, setActiveRegion] = useState<number | null>(null)
  const [overallRegisteredVoters, setOverallRegisteredVoters] = useState(0)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/vote-summary')
      .then((r) => r.json())
      .then((d) => {
        if (d.regions) {
          setRegions(d.regions)
          setActiveRegion(d.regions[0]?.id ?? null)
          setOverallRegisteredVoters(d.overallRegisteredVoters)
        }
        setDataLoading(false)
      })
  }, [])

  const current = regions.find((r) => r.id === activeRegion)

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-md md:max-w-5xl mx-auto">
        <AppHeader title="Vote summary" backHref="/admin" showLogo />

        {dataLoading ? (
          <>
            <div className="bg-slate-100 rounded-lg px-4 py-3 mb-4 md:max-w-md h-16 animate-pulse" />
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 md:mb-0 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
                  <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          </>
        ) : (
        <>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 md:max-w-md">
          <p className="text-xs text-blue-900 font-medium mb-1">All regions</p>
          <p className="text-sm text-blue-900">
            Total registered voters: <strong>{overallRegisteredVoters}</strong>
          </p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {regions.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRegion(r.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                activeRegion === r.id
                  ? 'bg-blue-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {current && (
          <>
            <p className="text-xs text-slate-500 mb-4">
              Registered voters: <strong className="text-slate-700">{current.registeredVoters}</strong>
              {' · '}
              Results: {current.released ? 'Released' : 'Not yet released'}
            </p>

            <div className="md:grid md:grid-cols-2 md:gap-4">
            {current.positions.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 md:mb-0">
                <h2 className="font-medium text-slate-900 mb-3">{p.name}</h2>

                {p.candidates
                  .slice()
                  .sort((a, b) => b.total - a.total)
                  .map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                      <span className="text-sm text-slate-900">{c.name}</span>
                      <span className="text-sm text-slate-600">
                        {c.online} online + {c.physical} physical = <strong className="text-slate-900">{c.total}</strong>
                      </span>
                    </div>
                  ))}

                <div className="flex justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  <span>Null: {p.nullCount}</span>
                  <span>Void: {p.voidCount}</span>
                </div>
              </div>
            ))}
            </div>

            {current.positions.length === 0 && (
              <p className="text-sm text-slate-500">No candidates in this region yet.</p>
            )}
          </>
        )}
        </>
        )}
      </div>
    </div>
  )
}