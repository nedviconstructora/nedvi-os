import type { Metadata, Viewport } from 'next'
import { PwaManager } from '@/components/pwa/PwaManager'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'NEDVI OS',
    template: '%s · NEDVI OS',
  },
  description: 'Plataforma de gestión de NEDVI Constructora',
  applicationName: 'NEDVI OS',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'NEDVI OS',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#5496CC',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var saved = localStorage.getItem('nedvi-theme');
                  var theme = saved === 'dark' ? 'dark' : 'light';
                  var root = document.documentElement;
                  root.classList.toggle('dark', theme === 'dark');
                  root.classList.toggle('theme-dark', theme === 'dark');
                  root.classList.toggle('theme-light', theme !== 'dark');
                  root.style.colorScheme = theme;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="nedvi-splash">
          <div className="nedvi-splash-content">
            <img
              src="/icon.png"
              alt="NEDVI"
              className="nedvi-splash-logo"
              width={150}
              height={150}
              style={{
                width: '150px',
                height: '150px',
                maxWidth: '150px',
                maxHeight: '150px',
                objectFit: 'contain',
                display: 'block',
              }}
            />

            <h1>NEDVI OS</h1>
            <p>Construyendo el futuro.</p>
          </div>
        </div>
        {children}
        <PwaManager initialVersion={process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || 'development'} />
      </body>
    </html>
  )
}
