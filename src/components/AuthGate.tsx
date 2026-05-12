'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function AuthGate({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !session && pathname !== '/login') {
      router.replace('/login')
    }
  }, [isLoading, pathname, router, session])

  if (isLoading || !session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-stone-50 text-slate-800">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando album
        </div>
      </div>
    )
  }

  return children
}
