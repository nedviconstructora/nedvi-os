import { Skeleton } from '@/components/ui/Skeleton'

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36" />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <Skeleton className="h-[350px]" />
        <Skeleton className="h-[350px]" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-64" />)}
      </div>
    </div>
  )
}
