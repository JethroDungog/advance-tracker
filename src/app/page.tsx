'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import PinPad from '@/components/PinPad'
import { supabase } from '@/lib/supabase'
import type { DbUser } from '@/lib/supabase'

// Dashboards are loaded lazily — they don't exist yet but will be authored by other agents.
// Using dynamic imports with ssr:false keeps this page client-only and avoids import errors
// when the dashboard files don't exist during development of this slice.
const OwnerDashboard = dynamic(() => import('@/components/OwnerDashboard'), { ssr: false })
const WorkerDashboard = dynamic(() => import('@/components/WorkerDashboard'), { ssr: false })

const STORAGE_KEY = 'advance_tracker_user'

export default function HomePage() {
  const [user, setUser] = useState<DbUser | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  // On mount: restore session from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: DbUser = JSON.parse(raw)
        setUser(parsed)
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    } finally {
      setHydrated(true)
    }
  }, [])

  const handlePinSubmit = useCallback(async (pin: string) => {
    setPinError('')
    setPinLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('pin', pin)
        .maybeSingle()

      if (error) {
        setPinError('Something went wrong. Please try again.')
        return
      }

      if (!data) {
        setPinError('Incorrect PIN. Please try again.')
        return
      }

      const dbUser = data as DbUser
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dbUser))
      setUser(dbUser)
    } finally {
      setPinLoading(false)
    }
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setPinError('')
  }, [])

  // Avoid hydration mismatch — render nothing until localStorage has been read
  if (!hydrated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: '#F8FAFC' }}
      >
        <svg
          className="animate-spin"
          width={32}
          height={32}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94A3B8"
          strokeWidth={2.5}
        >
          <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  if (!user) {
    return (
      <PinPad
        onSubmit={handlePinSubmit}
        error={pinError}
        loading={pinLoading}
      />
    )
  }

  if (user.role === 'owner') {
    return <OwnerDashboard user={user} onLogout={handleLogout} />
  }

  return <WorkerDashboard user={user} onLogout={handleLogout} />
}
