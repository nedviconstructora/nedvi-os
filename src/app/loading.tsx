export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#111217]">
      <div className="flex flex-col items-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute h-20 w-20 animate-spin rounded-full border-2 border-white/10 border-t-[#163DFF]" />

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163DFF] shadow-[0_0_35px_rgba(22,61,255,0.35)]">
            <div className="relative h-6 w-6">
              <span className="absolute left-[10px] top-[3px] h-5 w-1.5 -rotate-45 rounded-full bg-white" />
              <span className="absolute left-[10px] top-[3px] h-5 w-1.5 rotate-45 rounded-full bg-white" />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-lg font-semibold tracking-[-0.03em] text-white">
            NEDVI <span className="font-normal text-[#9CA3AF]">OS</span>
          </p>

          <p className="mt-2 animate-pulse text-xs text-[#646873]">
            Cargando...
          </p>
        </div>
      </div>
    </div>
  )
}