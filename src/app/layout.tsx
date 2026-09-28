import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NEDVI OS',
  description: 'NEDVI OS enterprise platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <div className="nedvi-splash">
          <div className="nedvi-splash-content">
            <img
              src="/icon.png"
              alt="NEDVI"
              className="nedvi-splash-logo"
            />

            <h1>NEDVI OS</h1>
            <p>Construyendo el futuro.</p>
          </div>
        </div>
        {children}
      </body>
    </html>
  )
}
