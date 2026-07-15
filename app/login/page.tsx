'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [employeeCode, setEmployeeCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.')
        setLoading(false)
        return
      }

      router.push(data.redirectTo)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-sm p-8">
        <div className="text-center mb-8">
         <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
  {loading && (
    <span className="absolute inset-0 rounded-full border-4 border-blue-100 border-t-blue-900 animate-spin" />
  )}
  <img src="/union-logo.gif" alt="MTL Workers Union" className="w-12 h-12 object-contain rounded-full" />
</div>
          <h1 className="text-xl font-semibold text-slate-900">MTL Workers Union</h1>
          <p className="text-sm text-slate-500 mt-1">Voting portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Employee ID
            </label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              placeholder="e.g. 10234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            First time logging in? Enter your employee ID and choose a password — it becomes your password from now on.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

         <button
  type="submit"
  disabled={loading}
  className="w-full bg-blue-900 text-white font-medium py-2.5 rounded-lg hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
>
  {loading && (
    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
  )}
  {loading ? 'Logging in...' : 'Log in'}
</button>
        </form>
      </div>
    </div>
  )
}