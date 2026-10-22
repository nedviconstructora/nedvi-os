import { NextResponse } from 'next/server'
import { currentReleaseInfo } from '@/lib/app-release'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(currentReleaseInfo(), {
    headers: {
      'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    },
  })
}
