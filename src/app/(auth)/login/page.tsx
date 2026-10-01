import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
      <span
        className={`flex shrink-0 items-center justify-center ${
          compact ? 'h-12 w-12' : 'h-16 w-16'
        }`}
      >
        <img
          src="/icon.png"
          alt="NEDVI Constructora"
          className="h-full w-full object-contain drop-shadow-[0_10px_24px_rgba(66,153,225,0.2)]"
        />
      </span>
      <span
        className={`font-bold tracking-[-0.055em] text-white ${
          compact ? 'text-2xl' : 'text-4xl xl:text-[2.7rem]'
        }`}
      >
        NEDVI <span className="font-medium text-[#8CCBFF]">OS</span>
      </span>
    </div>
  )
}

function GridMark() {
  return (
    <div className="relative h-[24rem] w-[24rem] opacity-70" aria-hidden="true">
      <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
      <div className="absolute inset-[18%] rounded-full border border-white/[0.06]" />
      <div className="absolute inset-[36%] rounded-full border border-white/[0.06]" />
      <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/[0.07] to-transparent" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#64B5F6] shadow-[0_0_30px_8px_rgba(100,181,246,0.4)]" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090B0F] text-white">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] bg-cover bg-center lg:block"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(9,11,15,1) 0%, rgba(9,11,15,0.84) 22%, rgba(9,11,15,0.56) 58%, rgba(9,11,15,0.7) 100%), url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1800&q=85')",
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_40%,rgba(73,151,221,0.11),transparent_30%)]" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
        <aside className="relative hidden min-h-screen overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <div className="relative z-10 animate-fade-up">
            <Logo />
          </div>

          <div className="relative z-10 max-w-2xl animate-fade-up-delay">
            <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#AAB2BF]">
              El sistema operativo para equipos modernos
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-white xl:text-7xl">
              El trabajo avanza{' '}
              <span className="bg-gradient-to-r from-[#B9E2FF] to-[#5AA9F3] bg-clip-text text-transparent">
                mejor
              </span>{' '}
              cuando todo se conecta.
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[#A8B0BC]">
              Un espacio de trabajo inteligente para las personas, los procesos y las decisiones que
              impulsan a NEDVI hacia adelante.
            </p>
          </div>

          <div className="relative z-10 flex items-end justify-between text-xs text-[#69717D]">
            <span>© 2026 NEDVI Constructora</span>
            <span className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-black/20 px-3 py-2 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Todos los sistemas operando con normalidad
            </span>
          </div>

          <div className="pointer-events-none absolute -bottom-24 -right-14">
            <GridMark />
          </div>
        </aside>

        <section className="relative flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-16">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 lg:hidden"
            style={{
              backgroundImage:
                "linear-gradient(rgba(9,11,15,0.78), rgba(9,11,15,0.94)), url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80')",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-[29rem] animate-fade-up">
            <div className="mb-10 lg:hidden">
              <Logo compact />
            </div>

            <div className="rounded-[22px] border border-white/[0.09] bg-[#181D24]/90 p-7 shadow-[0_28px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-10">
              <div>
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5DAAF2]">
                  Bienvenido de nuevo
                </p>
                <h2 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-[2.25rem]">
                  Inicia sesión en tu espacio de trabajo
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#A8B0BC]">
                  Accede a NEDVI OS y continúa justo donde lo dejaste.
                </p>
              </div>

              <LoginForm />

              <p className="mt-8 text-center text-xs leading-5 text-[#69717D]">
                Al continuar, aceptas los{' '}
                <button
                  type="button"
                  className="text-[#A8B0BC] underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  Términos de servicio
                </button>{' '}
                y la{' '}
                <button
                  type="button"
                  className="text-[#A8B0BC] underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  Política de privacidad
                </button>{' '}
                de NEDVI.
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-[#7B8490]">
              ¿Necesitas acceso?{' '}
              <Link href="/register" className="font-medium text-[#7DC6FF] transition hover:text-white">
                Crear cuenta
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
