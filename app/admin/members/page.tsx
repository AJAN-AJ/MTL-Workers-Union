'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppHeader from '@/app/components/AppHeader'

type Role = { role: string; region_id: number | null }
type Member = {
  employee_code: string
  first_name: string
  surname: string
  region_id: number
  regions: { name: string }
  member_roles: Role[]
}
type Region = { id: number; name: string }

export default function AdminMembersPage() {
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [error, setError] = useState('')
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    fetch('/api/regions').then((r) => r.json()).then((d) => d.regions && setRegions(d.regions))
    search('')
  }, [])

  async function search(q: string) {
    const res = await fetch(`/api/admin/members?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    if (res.ok) setMembers(data.members)
    setDataLoading(false)
  }

  async function assignRole(employeeCode: string, role: string, regionId: number | null) {
    setError('')
    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeCode, role, regionId })
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      return
    }
    search(query)
  }

  async function removeRole(employeeCode: string, role: string, regionId: number | null) {
    await fetch('/api/admin/roles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeCode, role, regionId })
    })
    search(query)
  }

  async function resetPassword(employeeCode: string, name: string) {
    if (!confirm(`Reset the password for ${name}? They'll need to set a new one next time they log in.`)) return
    setError('')
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeCode })
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      return
    }
    alert(`Password reset for ${name}.`)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-md md:max-w-4xl mx-auto">
        <AppHeader title="Members & roles" backHref="/admin" showLogo />

        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value) }}
          placeholder="Search by name or employee ID"
          className="w-full md:max-w-md px-3 py-3 border border-slate-300 rounded-lg text-base text-slate-900 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-900"
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {dataLoading ? (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/3 mb-3" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-slate-100 rounded-full" />
                  <div className="h-6 w-24 bg-slate-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
        <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {members.map((m) => {
            const isAdmin = m.member_roles.some((r) => r.role === 'admin')
            const poRole = m.member_roles.find((r) => r.role === 'presiding_officer')

            return (
              <li key={m.employee_code} className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="font-medium text-slate-900">{m.first_name} {m.surname}</p>
                <p className="text-sm text-slate-500 mb-3">
                  {m.employee_code} · {m.regions?.name}
                </p>

                <div className="flex flex-wrap gap-2">
                  {isAdmin ? (
                    <button
                      onClick={() => removeRole(m.employee_code, 'admin', null)}
                      className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200"
                    >
                      Admin ✕
                    </button>
                  ) : (
                    <button
                      onClick={() => assignRole(m.employee_code, 'admin', null)}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 active:bg-slate-50"
                    >
                      + Make admin
                    </button>
                  )}

                  {poRole ? (
                    <button
                      onClick={() => removeRole(m.employee_code, 'presiding_officer', poRole.region_id)}
                      className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200"
                    >
                      PO ({regions.find((r) => r.id === poRole.region_id)?.name}) ✕
                    </button>
                  ) : (
                    <button
                      onClick={() => assignRole(m.employee_code, 'presiding_officer', m.region_id)}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 active:bg-slate-50"
                    >
                      + Make PO ({m.regions?.name})
                    </button>
                  )}
                  <button
                  onClick={() => resetPassword(m.employee_code, `${m.first_name} ${m.surname}`)}
                  className="text-xs text-slate-500 mt-2 underline"
                >
                  Reset password
                </button>
                </div>
              </li>
            )
          })}
          {members.length === 0 && (
            <p className="text-sm text-slate-500">No members found.</p>
          )}
        </ul>
        )}
      </div>
    </div>
  )
}