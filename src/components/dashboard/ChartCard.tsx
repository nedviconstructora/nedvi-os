import type { ReactNode } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'

type ChartCardProps = {
  title: string
  description: string
  children: ReactNode
  action?: ReactNode
  className?: string
}

export function ChartCard({
  title,
  description,
  children,
  action,
  className = '',
}: ChartCardProps) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader title={title} description={description} action={action} />
      <div className="p-5 sm:p-6">{children}</div>
    </Card>
  )
}
