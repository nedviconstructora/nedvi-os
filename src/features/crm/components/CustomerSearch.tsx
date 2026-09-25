'use client'

import { Search, X } from 'lucide-react'

type CustomerSearchProps = {
  value: string
  onChange: (value: string) => void
}

export function CustomerSearch({ value, onChange }: CustomerSearchProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#646873]" size={16} strokeWidth={1.8} />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by company, contact, email or RFC..."
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#17181C] pl-10 pr-10 text-xs text-white outline-none transition placeholder:text-[#646873] hover:border-white/[0.15] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10"
        aria-label="Search customers"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#646873] transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Clear customer search"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  )
}
