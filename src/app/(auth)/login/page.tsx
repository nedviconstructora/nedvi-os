import { LoginForm } from '@/components/auth/LoginForm'

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-2.5' : 'gap-3'}`}>
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] bg-[#163DFF] shadow-[0_8px_24px_rgba(22,61,255,0.3)]">
        <span className="absolute h-4 w-1.5 -rotate-45 rounded-full bg-white" />
        <span className="absolute h-4 w-1.5 rotate-45 rounded-full bg-white" />
      </span>
      <span className={`font-semibold tracking-[-0.04em] text-white ${compact ? 'text-lg' : 'text-xl'}`}>
        NEDVI <span className="font-normal text-[#9CA3AF]">OS</span>
      </span>
    </div>
  )
}

function GridMark() {
  return (
    <div className="relative h-[22rem] w-[22rem] opacity-80" aria-hidden="true">
      <div className="absolute inset-0 rounded-full border border-white/[0.07]" />
      <div className="absolute inset-[18%] rounded-full border border-white/[0.07]" />
      <div className="absolute inset-[36%] rounded-full border border-white/[0.07]" />
      <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#163DFF] shadow-[0_0_30px_8px_rgba(22,61,255,0.55)]" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-[#0B0B0D] text-white lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
      <aside className="relative hidden overflow-hidden bg-[#17181C] lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="relative z-10 animate-fade-up">
          <Logo />
        </div>
        <div className="relative z-10 max-w-xl animate-fade-up-delay">
          <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]">
            The operating system for modern teams
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-white xl:text-7xl">
            Work moves better when everything connects.
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-[#9CA3AF]">
            One intelligent workspace for the people, processes, and decisions that move your business forward.
          </p>
        </div>
        <div className="relative z-10 flex items-end justify-between text-xs text-[#646873]">
          <span>© 2026 NEDVI, Inc.</span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            All systems operational
          </span>
        </div>
        <div className="pointer-events-none absolute -bottom-24 -right-24">
          <GridMark />
        </div>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-[29rem] animate-fade-up">
          <div className="mb-10 lg:hidden">
            <Logo compact />
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-10">
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#163DFF]">
                Welcome back
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-[2.2rem]">
                Sign in to your workspace
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">
                Access your NEDVI OS workspace and pick up where you left off.
              </p>
            </div>
            <LoginForm />
            <p className="mt-8 text-center text-xs leading-5 text-[#646873]">
              By continuing, you agree to NEDVI&apos;s{' '}
              <button type="button" className="text-[#9CA3AF] underline decoration-white/20 underline-offset-4 transition hover:text-white">
                Terms of Service
              </button>{' '}
              and{' '}
              <button type="button" className="text-[#9CA3AF] underline decoration-white/20 underline-offset-4 transition hover:text-white">
                Privacy Policy
              </button>
              .
            </p>
          </div>
          <p className="mt-6 text-center text-xs text-[#646873]">
            Need access? <button type="button" className="font-medium text-[#9CA3AF] transition hover:text-white">Contact your administrator</button>
          </p>
        </div>
      </section>
    </main>
  )
}
