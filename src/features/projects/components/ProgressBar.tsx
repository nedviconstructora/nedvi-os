type ProgressBarProps = {
  value: number
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, showLabel = true, size = 'md' }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value))
  const trackHeight = size === 'sm' ? 'h-1.5' : 'h-2'
  return <div className="flex items-center gap-3"><div className={`${trackHeight} flex-1 overflow-hidden rounded-full bg-white/[0.08]`}><div className="h-full rounded-full bg-gradient-to-r from-[#163DFF] to-[#7187ff] transition-all duration-500" style={{ width: `${safeValue}%` }} /></div>{showLabel ? <span className="w-9 text-right text-[11px] font-semibold text-[#d5d7df]">{safeValue}%</span> : null}</div>
}
