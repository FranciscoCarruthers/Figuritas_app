import type { Metadata, Viewport } from 'next'
import AppProviders from '@/context/AppProviders'
import './globals.css'

export const metadata: Metadata = {
  title: 'Figuritas 2026',
  description: 'Album compartido de figuritas Panini FIFA World Cup 2026',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Figuritas 2026',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f172a',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
