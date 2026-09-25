import { AppShell } from '@/components/layout/AppShell'
import { AgendaWorkspace } from '@/features/agenda/components/AgendaWorkspace'

export default function AgendaPage() {
  return (
    <AppShell>
      <AgendaWorkspace />
    </AppShell>
  )
}
