import type { InputHTMLAttributes, ReactNode } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  rightElement?: ReactNode
}

export function Input({
  label,
  id,
  error,
  rightElement,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="space-y-2.5">
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={`h-14 w-full rounded-xl border border-white/[0.09] bg-[#17181C] px-4 text-[15px] text-white outline-none transition duration-200 placeholder:text-[#646873] hover:border-white/[0.16] focus:border-[#163DFF] focus:ring-4 focus:ring-[#163DFF]/10 ${rightElement ? 'pr-20' : ''} ${className}`}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {rightElement ? (
          <div className="absolute inset-y-0 right-3 flex items-center">
            {rightElement}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  )
}
