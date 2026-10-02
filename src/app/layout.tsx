import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
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
      </body>
    </html>
  )
}
