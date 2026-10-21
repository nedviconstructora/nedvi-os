'use client'

import { useEffect, useState } from 'react'
import { readAccessSession } from '@/features/access/services/accessStorage'

export function DashboardGreeting() {
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    const session = readAccessSession()
    setFirstName(session?.firstName ?? '')
  }, [])

  return (
    <h1 className="mt-2 text-[clamp(1.5rem,6vw,1.85rem)] font-semibold leading-tight tracking-[-0.045em] text-[var(--foreground)] sm:text-4xl">
      Buenos días{firstName ? `, ${firstName}` : ''}
    </h1>
  )
}
