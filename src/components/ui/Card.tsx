import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

type CardHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-white/[0.07] bg-[#20232A] shadow-[0_16px_50px_rgba(0,0,0,0.16)] ${className}`}
      {...props}
    >
      {children}
    </section>
  )
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-5 sm:px-6">
      <div>
        <h2 className="text-sm font-semibold tracking-[-0.01em] text-white">{title}</h2>
        {description ? <p className="mt-1 text-xs text-[#646873]">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
