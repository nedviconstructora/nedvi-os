'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginForm() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      email === 'pedrog@nedviconstructora.com' &&
      password === 'Nedvi2026!'
    ) {
      router.push('/dashboard')
      return
    }

    setError('Correo o contraseña incorrectos.')
  }

  return (
    <form
      className="mt-9 space-y-6"
      onSubmit={handleLogin}
    >
      <Input
        id="email"
        name="email"
        type="email"
        label="Work email"
        placeholder="you@company.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        id="password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163DFF]"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        }
      />
      <div className="flex items-center justify-end">
        <button
          type="button"
          className="text-sm font-medium text-[#9CA3AF] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163DFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#20232A]"
        >
          Forgot password?
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}

      <Button type="submit" className="group w-full">
        <span>Sign in to NEDVI OS</span>
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