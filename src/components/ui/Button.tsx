import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      'bg-[#163DFF] text-white shadow-[0_12px_30px_rgba(22,61,255,0.22)] hover:bg-[#3155ff] hover:shadow-[0_16px_34px_rgba(22,61,255,0.32)] active:scale-[0.99]',
    ghost:
      'bg-transparent text-[#9CA3AF] hover:bg-white/[0.05] hover:text-white',
  }

  return (
    <button
      className={`inline-flex h-14 items-center justify-center rounded-xl px-5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#163DFF]/30 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
