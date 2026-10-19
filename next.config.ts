import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }] },
      { source: '/api/app-version', headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }] },
      { source: '/manifest.webmanifest', headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }] },
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
