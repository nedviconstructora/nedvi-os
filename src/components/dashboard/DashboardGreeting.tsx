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
    <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--foreground)] sm:text-4xl">
      Buenos días{firstName ? `, ${firstName}` : ''}
    </h1>
  )
}
