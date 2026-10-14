import { redirect } from 'next/navigation'

export default function HomePage() {
  const showLaunchPresentation = Date.now() < new Date('2026-10-16T00:00:00-07:00').getTime()
  redirect(showLaunchPresentation ? '/presentacion' : '/dashboard')
}
