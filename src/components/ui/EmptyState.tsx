import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-[#17181C]/60 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163DFF]/[0.12] text-[#8296ff]">
        <Icon size={22} strokeWidth={1.7} />
      </span>
      <h2 className="mt-5 text-base font-semibold tracking-[-0.02em] text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#9CA3AF]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
