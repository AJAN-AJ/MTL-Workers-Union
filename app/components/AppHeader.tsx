'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type AppHeaderProps = {
  title: string
  subtitle?: string
  backHref?: string
  showLogo?: boolean
}

export default function AppHeader({ title, subtitle, backHref, showLogo }: AppHeaderProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-200">
        <Image
          src="/icon.png"
          alt="MTL Workers Union logo"
          width={32}
          height={32}
          className="rounded-md flex-shrink-0"
        />
        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          MTL Workers Union Voting Portal
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white active:bg-slate-50 flex-shrink-0"
            aria-label="Back"
          >
            <span className="text-slate-700 text-lg">←</span>
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 truncate">{subtitle}</p>}
        </div>
      </div>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="text-sm font-medium text-slate-600 border border-slate-200 bg-white rounded-lg px-3 py-2 active:bg-slate-50 disabled:opacity-60 flex-shrink-0"
      >
        {loggingOut ? 'Logging out...' : 'Log out'}
      </button>
      </div>
    </div>
  )
}

