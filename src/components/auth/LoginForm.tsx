'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  defaultPermissionsForRole,
  writeAccessSession,
} from '@/features/access/services/accessStorage'
import type { AppRole, ModulePermission } from '@/config/roles'
import { createClient } from '@/lib/supabase/client'

type NedviRole = 'administracion' | 'obra' | 'cliente'

type Profile = {
  id: string
  full_name: string
  first_name: string
  initials: string | null
  role: NedviRole
  active: boolean
  permissions: ModulePermission[] | null
}

const VALID_PERMISSIONS: ModulePermission[] = [
  'dashboard',
  'commercial',
  'projects',
  'purchasing',
  'operations',
  'agenda',
  'human-resources',
  'finance',
  'indicators',
  'settings',
  'coral',
  'client-portal',
]

function toAppRole(role: NedviRole): AppRole {
  if (role === 'administracion') return 'Administración'
  if (role === 'obra') return 'Supervisor'
  return 'Cliente'
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function readCustomPermissions(value: unknown): ModulePermission[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((permission): permission is ModulePermission =>
    VALID_PERMISSIONS.includes(permission as ModulePermission),
  )
}

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoverySubmitting, setRecoverySubmitting] = useState(false)

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const supabase = createClient()
      const normalizedEmail = email.trim().toLowerCase()

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError || !data.user) {
        setError('Correo o contraseña incorrectos.')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, initials, role, active, permissions')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profileData) {
        await supabase.auth.signOut()
        setError('No pudimos cargar tu perfil de NEDVI OS. Contacta a Administración.')
        return
      }

      const profile = profileData as Profile

      if (!profile.active) {
        await supabase.auth.signOut()
        setError('Esta cuenta está inactiva. Contacta a Administración.')
        return
      }

      const appRole = toAppRole(profile.role)
      const name = profile.full_name || data.user.email || 'Usuario NEDVI'
      const firstName = profile.first_name || name.split(' ')[0] || name
      const profilePermissions = readCustomPermissions(profile.permissions)
      const customPermissions = readCustomPermissions(data.user.user_metadata?.permissions)
      const basePermissions = profilePermissions ?? customPermissions ?? defaultPermissionsForRole(appRole)
      const permissions =
        appRole === 'Cliente'
          ? Array.from(new Set<ModulePermission>([...basePermissions, 'client-portal']))
          : basePermissions

      let customerId: string | undefined
      let customerFolio: string | undefined
      let projectIds: string[] | undefined

      if (profile.role === 'cliente') {
        const { data: customerLink, error: customerLinkError } = await supabase
          .from('customer_users')
          .select('customer_id')
          .eq('user_id', data.user.id)
          .limit(1)
          .maybeSingle()

        if (customerLinkError) {
          console.error('Error cargando vínculo del cliente:', customerLinkError)
        }

        customerId = customerLink?.customer_id ?? undefined

        if (customerId) {
          const { data: customerRecord, error: customerError } = await supabase
            .from('customers')
            .select('folio')
            .eq('id', customerId)
            .maybeSingle()

          if (customerError) {
            console.error('Error cargando folio del cliente:', customerError)
          }

          customerFolio = customerRecord?.folio ?? undefined
        }

        const { data: memberships, error: membershipsError } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', data.user.id)

        if (membershipsError) {
          console.error('Error cargando proyectos asignados al cliente:', membershipsError)
        }

        projectIds = memberships?.map((membership) => membership.project_id) ?? []
      }

      writeAccessSession({
        userId: data.user.id,
        name,
        firstName,
        initials: profile.initials || initials(name),
        email: data.user.email ?? normalizedEmail,
        role: appRole,
        permissions,
        createdAt: new Date().toISOString(),
        customerId,
        customerFolio,
        projectIds,
      })

      router.push(appRole === 'Cliente' ? '/client' : '/dashboard')
      router.refresh()
    } catch (loginError) {
      console.error(loginError)
      setError('No pudimos conectar con NEDVI OS. Intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  function openRecovery() {
    setRecoveryEmail(email.trim().toLowerCase())
    setRecoveryMessage('')
    setRecoveryError('')
    setShowRecovery(true)
  }

  function recoveryRedirectUrl() {
    return `${window.location.origin}/auth/reset-password`
  }

  async function requestPasswordReset() {
    setRecoveryMessage('')
    setRecoveryError('')

    const normalizedEmail = recoveryEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setRecoveryError('Escribe un correo electrónico válido.')
      return
    }

    setRecoverySubmitting(true)
    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: recoveryRedirectUrl(),
      })
      if (resetError) throw resetError

      setRecoveryMessage('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.')
    } catch (resetError) {
      console.error('Error al solicitar recuperación:', resetError)
      setRecoveryError('No se pudo enviar la solicitud. Inténtalo nuevamente en unos minutos.')
    } finally {
      setRecoverySubmitting(false)
    }
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
          onClick={openRecovery}
          className="text-sm font-medium text-[#A8B0BC] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DAAF2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#181D24]"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      {showRecovery ? (
        <div className="rounded-xl border border-white/[0.09] bg-black/20 p-4">
          <p className="text-sm font-semibold text-white">Recuperar contraseña</p>
          <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
            Te enviaremos un enlace seguro a tu correo para crear una contraseña nueva.
          </p>
          <div className="mt-4">
            <Input
              id="recovery-email"
              name="recovery-email"
              type="email"
              label="Correo de la cuenta"
              placeholder="tu@empresa.com"
              value={recoveryEmail}
              onChange={(event) => setRecoveryEmail(event.target.value)}
            />
          </div>
          {recoveryError ? <p className="mt-3 text-xs text-red-400">{recoveryError}</p> : null}
          {recoveryMessage ? (
            <p className="mt-3 text-xs leading-5 text-emerald-300">{recoveryMessage}</p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowRecovery(false)}
              className="h-9 flex-1 rounded-lg border border-white/[0.09] px-3 text-xs font-semibold text-[#A8B0BC] transition hover:bg-white/[0.04] hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void requestPasswordReset()}
              disabled={recoverySubmitting}
              className="h-9 flex-1 rounded-lg bg-[#7DC6FF] px-3 text-xs font-semibold text-black transition hover:brightness-95 disabled:opacity-60"
            >
              {recoverySubmitting ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </div>
        </div>
      ) : null}

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
