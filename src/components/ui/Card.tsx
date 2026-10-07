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
      className={`nedvi-card rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_14px_38px_rgba(18,35,58,0.07)] transition-colors duration-300 ${className}`}
      {...props}
    >
      {children}
    </section>
  )
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-6">
      <div>
        <h2 className="text-sm font-semibold tracking-[-0.01em] text-[var(--foreground)]">{title}</h2>
        {description ? <p className="mt-1 text-xs text-[var(--muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
