import { AppShell } from '@/components/layout/AppShell'
import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-7"><div className="space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-10 w-64" /><Skeleton className="h-4 w-96 max-w-full" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton className="h-36" key={index} />)}</div><Skeleton className="h-28" /><Skeleton className="h-[500px]" /></div>
    </AppShell>
  )
}
