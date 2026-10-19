import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

const roles = ['developer','administracion','administrador','admin','obra','supervisor','contabilidad']
const admins = ['administracion','administrador','admin']

export async function getTimeClockContext() {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return null
  const { data: profile } = await server.from('profiles').select('full_name,role,active').eq('id',user.id).maybeSingle()
  if (!profile?.active || !roles.includes(String(profile.role ?? '').toLowerCase().trim())) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Configuración de Supabase incompleta')
  return {
    user, profile,
    admin: createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),
    isAdmin: admins.includes(String(profile.role ?? '').toLowerCase().trim()),
    isAccountant: String(profile.role ?? '').toLowerCase().trim() === 'contabilidad',
  }
}

