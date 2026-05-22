import type { ReactNode } from 'react'
import AuthGate from '@/components/AuthGate'
import BottomNav from '@/components/BottomNav'
import NotificationAnnouncementModal from '@/components/NotificationAnnouncementModal'
import { AlbumProvider } from '@/context/AlbumContext'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AlbumProvider>
        <div className="app-scroll min-h-dvh bg-slate-50">
          <BottomNav />
          <div className="mx-auto min-h-dvh w-full max-w-6xl bg-white lg:bg-slate-50">
            {children}
          </div>
          <NotificationAnnouncementModal />
        </div>
      </AlbumProvider>
    </AuthGate>
  )
}
