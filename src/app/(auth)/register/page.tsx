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
    <Link href="/login" className="flex items-center gap-3" aria-label="Volver al inicio de sesión">
      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/95 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
        <img src="/icon.png" alt="NEDVI Constructora" className="h-full w-full object-contain" />
      </span>
      <span className="text-xl font-semibold tracking-[-0.04em] text-white">
        NEDVI <span className="font-normal text-[#9CA3AF]">OS</span>
      </span>
    </Link>
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
    <main className="min-h-screen bg-[#0B0B0D] px-6 py-10 text-white sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col">
        <div className="mb-10">
          <Logo />
        </div>

        <div className="grid flex-1 items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.7fr)]">
          <section className="max-w-2xl">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7DC6FF]">
              Solicitud de acceso
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-[-0.05em] sm:text-5xl">
              Regístrate para solicitar acceso a NEDVI OS.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#9CA3AF]">
              Tu registro no recibe permisos automáticamente. Administración revisará la solicitud,
              asignará el rol correspondiente y activará tu acceso.
            </p>

            <div className="mt-8 grid gap-3 text-sm text-[#C8CCD4] sm:grid-cols-3">
              {['1. Envías solicitud', '2. Administración revisa', '3. Se asigna rol y acceso'].map((step) => (
                <div key={step} className="rounded-xl border border-white/[0.07] bg-[#17181C] px-4 py-4">
                  {step}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#20232A] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-9">
            {submitted ? (
              <div className="py-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-2xl text-emerald-300">
                  ✓
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Solicitud enviada</h2>
                <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">
                  Tu cuenta quedó con estado <strong className="text-white">Pendiente</strong> y sin rol asignado.
                  Administración deberá aprobarla antes de que puedas entrar a NEDVI OS.
                </p>
                <Link
                  href="/login"
                  className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-[#7DC6FF] px-5 text-sm font-semibold text-black transition hover:brightness-95"
                >
                  Volver a iniciar sesión
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em]">Crear solicitud</h2>
                  <p className="mt-2 text-sm text-[#9CA3AF]">Completa tus datos para que Administración pueda identificarte.</p>
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

                <p className="mt-6 text-center text-xs text-[#646873]">
                  ¿Ya tienes acceso?{' '}
                  <Link href="/login" className="font-medium text-[#9CA3AF] transition hover:text-white">
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
