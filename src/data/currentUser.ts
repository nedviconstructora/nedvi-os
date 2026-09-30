import type { AppRole } from '@/config/roles'

export const currentUser = {
  id: 'user-001',
  name: 'Pedro García',
  firstName: 'Pedro',
  initials: 'PG',
  role: 'Administración' as AppRole,
  email: 'pedrog@nedviconstructora.com',
}

export type CurrentUser = typeof currentUser
