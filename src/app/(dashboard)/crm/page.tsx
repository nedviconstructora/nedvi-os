import { AppShell } from '@/components/layout/AppShell'
import { CustomerWorkspace } from '@/features/crm/components/CustomerWorkspace'
import { getCustomers } from '@/features/crm/services/customerService'

export default function CustomersPage() {
  return (
    <AppShell>
      <CustomerWorkspace customers={getCustomers()} />
    </AppShell>
  )
}
