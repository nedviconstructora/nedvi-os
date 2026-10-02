'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const REGISTRATION_REQUESTS_KEY = 'nedvi-registration-requests'

type RegistrationRequest = {
  id: string
  name: string
  email: string
  phone: string
  position: string
  status: 'Pendiente'
  role: null
  createdAt: string
}

function Logo() {
  return (
    <Link href="/login" className="flex items-center gap-4" aria-label="Volver al inicio de sesión">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center">
        <img
          src="/icon.png"
          alt="NEDVI Constructora"
          className="h-full w-full object-contain drop-shadow-[0_10px_24px_rgba(66,153,225,0.2)]"
        />
      </span>
      <span className="text-4xl font-bold tracking-[-0.055em] text-white xl:text-[2.7rem]">
        NEDVI <span className="font-medium text-[#8CCBFF]">OS</span>
      </span>
    </Link>
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

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!name.trim() || !normalizedEmail) {
      setError('Nombre y correo son obligatorios.')
      return
    }

    let requests: RegistrationRequest[] = []

    try {
      const raw = window.localStorage.getItem(REGISTRATION_REQUESTS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as RegistrationRequest[]
        if (Array.isArray(parsed)) requests = parsed
      }
    } catch {
      requests = []
    }

    if (requests.some((request) => request.email.toLowerCase() === normalizedEmail)) {
      setError('Ya existe una solicitud de acceso con este correo.')
      return
    }

    const request: RegistrationRequest = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      position: position.trim(),
      status: 'Pendiente',
      role: null,
      createdAt: new Date().toISOString(),
    }

    window.localStorage.setItem(REGISTRATION_REQUESTS_KEY, JSON.stringify([request, ...requests]))
    setSubmitted(true)
  }

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

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-6 py-10 sm:px-10 lg:px-14 xl:px-16">
        <div className="relative z-10">
          <Logo />
        </div>

        <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(440px,0.72fr)] xl:gap-20">
          <section className="relative max-w-2xl">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5DAAF2]">
              Solicitud de acceso
            </p>
            <h1 className="text-4xl font-semibold leading-[1.06] tracking-[-0.05em] sm:text-5xl xl:text-6xl">
              Regístrate para solicitar acceso a NEDVI OS.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#A8B0BC]">
              Tu registro no recibe permisos automáticamente. Administración revisará la solicitud,
              asignará el rol correspondiente y activará tu acceso.
            </p>

            <div className="mt-8 grid gap-3 text-sm text-[#D0D6DE] sm:grid-cols-3">
              {['1. Envías solicitud', '2. Administración revisa', '3. Se asigna rol y acceso'].map((step) => (
                <div
                  key={step}
                  className="rounded-xl border border-white/[0.08] bg-[#171C22]/80 px-4 py-4 shadow-sm backdrop-blur-sm"
                >
                  {step}
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute -bottom-44 -right-24 hidden lg:block">
              <GridMark />
            </div>
          </section>

          <section className="relative rounded-[22px] border border-white/[0.09] bg-[#181D24]/90 p-7 shadow-[0_28px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-9">
            <div
              className="pointer-events-none absolute inset-0 -z-10 rounded-[22px] bg-cover bg-center opacity-10 lg:hidden"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(9,11,15,0.75), rgba(9,11,15,0.95)), url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80')",
              }}
              aria-hidden="true"
            />

            {submitted ? (
              <div className="py-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-2xl text-emerald-300">
                  ✓
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Solicitud enviada</h2>
                <p className="mt-3 text-sm leading-6 text-[#A8B0BC]">
                  Tu cuenta quedó con estado <strong className="text-white">Pendiente</strong> y sin rol asignado.
                  Administración deberá aprobarla antes de que puedas entrar a NEDVI OS.
                </p>
                <Link
                  href="/login"
                  className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-[#5DAAF2] px-5 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  Volver a iniciar sesión
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em]">Crear solicitud</h2>
                  <p className="mt-2 text-sm text-[#A8B0BC]">
                    Completa tus datos para que Administración pueda identificarte.
                  </p>
                </div>

                <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                  <Input
                    id="register-name"
                    name="name"
                    label="Nombre completo"
                    placeholder="Nombre y apellidos"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                  <Input
                    id="register-email"
                    name="email"
                    type="email"
                    label="Correo electrónico"
                    placeholder="correo@empresa.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      id="register-phone"
                      name="phone"
                      type="tel"
                      label="Teléfono"
                      placeholder="Opcional"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                    <Input
                      id="register-position"
                      name="position"
                      label="Puesto / área"
                      placeholder="Ej. Supervisor"
                      value={position}
                      onChange={(event) => setPosition(event.target.value)}
                    />
                  </div>

                  {error ? <p className="text-sm text-red-400">{error}</p> : null}

                  <Button type="submit" className="w-full">
                    Enviar solicitud de acceso
                  </Button>
                </form>

                <p className="mt-6 text-center text-xs text-[#69717D]">
                  ¿Ya tienes acceso?{' '}
                  <Link href="/login" className="font-medium text-[#7DC6FF] transition hover:text-white">
                    Inicia sesión
                  </Link>
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
