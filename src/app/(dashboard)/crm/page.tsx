import { AppShell } from '@/components/layout/AppShell'
import { CustomerWorkspace } from '@/features/crm/components/CustomerWorkspace'

export default function CustomersPage() {
  return (
    <AppShell>
      <CustomerWorkspace />
    </AppShell>
  )
}
