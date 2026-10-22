import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Force full navigations when an old PWA bundle meets a newer deployment.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA,
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
