'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'

export default function ProjectsError({ reset }: { reset: () => void }) { return <AppShell><div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center"><div className="w-full rounded-2xl border border-red-400/20 bg-[#20232A] p-8 text-center shadow-[0_16px_50px_rgba(0,0,0,0.16)]"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/[0.1] text-red-300"><AlertTriangle size={22} /></span><h1 className="mt-5 text-lg font-semibold text-white">We could not load the projects</h1><p className="mt-2 text-sm leading-6 text-[#9CA3AF]">Something went wrong while preparing the project workspace. Try again or return to the dashboard.</p><button type="button" onClick={reset} className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#163DFF] px-4 text-xs font-semibold text-white transition hover:bg-[#3155ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30"><RefreshCw size={14} /> Try again</button></div></div></AppShell> }
