'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const DEV_USER_EMAIL = 'pedrog@nedviconstructora.com'
const DEV_PASSWORD_SHA256 = 'a4d9d20d32d6775416f346e4f0ace7121059529b8758bb38ac43c46006aa60a6'

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function LoginForm() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const passwordHash = await sha256(password)

    if (email.trim().toLowerCase() === DEV_USER_EMAIL && passwordHash === DEV_PASSWORD_SHA256) {
      router.push('/dashboard')
      return
    }

    setSubmitting(false)
    setError('Correo o contraseña incorrectos.')
  }

  return (
    <form className="mt-9 space-y-6" onSubmit={handleLogin}>
      <Input
        id="email"
        name="email"
        type="email"
        label="Correo de trabajo"
        placeholder="tu@empresa.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        id="password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        label="Contraseña"
        placeholder="Ingresa tu contraseña"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DAAF2]"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        }
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          className="text-sm font-medium text-[#A8B0BC] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DAAF2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#181D24]"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <Button type="submit" className="group w-full" disabled={submitting}>
        <span>{submitting ? 'Iniciando sesión...' : 'Iniciar sesión en NEDVI OS'}</span>
        <span
          aria-hidden="true"
          className="ml-3 transition-transform duration-200 group-hover:translate-x-1"
        >
          -&gt;
        </span>
      </Button>
    </form>
  )
}
