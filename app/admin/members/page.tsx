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

  useEffect(() => {
    fetch('/api/regions').then((r) => r.json()).then((d) => d.regions && setRegions(d.regions))
    search('')
  }, [])

  async function search(q: string) {
    const res = await fetch(`/api/admin/members?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    if (res.ok) setMembers(data.members)
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

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        <AppHeader title="Members & roles" backHref="/admin" />

        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value) }}
          placeholder="Search by name or employee ID"
          className="w-full px-3 py-3 border border-slate-300 rounded-lg text-base text-slate-900 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-900"
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <ul className="space-y-3">
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
                </div>
              </li>
            )
          })}
          {members.length === 0 && (
            <p className="text-sm text-slate-500">No members found.</p>
          )}
        </ul>
      </div>
    </div>
  )
}