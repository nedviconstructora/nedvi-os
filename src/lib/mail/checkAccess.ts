import { createClient } from '@/utils/supabase/server'

export async function checkMailAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: false, status: 401 as const }
  const { data: profile } = await supabase.from('profiles').select('role,active').eq('id',user.id).maybeSingle()
  const allowed = profile?.active === true &&
    (user.email?.trim().toLowerCase() === 'pedrog@nedviconstructora.com' || String(profile.role ?? '').toLowerCase() === 'developer')
  return { allowed, status: allowed ? 200 as const : 403 as const }
}
