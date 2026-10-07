import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEDVI OS',
    short_name: 'NEDVI OS',
    description: 'Plataforma de gestión de NEDVI Constructora',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#121820',
    theme_color: '#5496CC',
    orientation: 'portrait-primary',
    lang: 'es-MX',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
