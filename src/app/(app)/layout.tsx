import type { ReactNode } from 'react'
import AuthGate from '@/components/AuthGate'
import BottomNav from '@/components/BottomNav'
import { AlbumProvider } from '@/context/AlbumContext'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AlbumProvider>
        <div className="app-scroll mx-auto max-w-md bg-slate-50">
          {children}
          <BottomNav />
        </div>
      </AlbumProvider>
    </AuthGate>
  )
}
