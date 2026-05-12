'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import PwaRegister from '@/components/PwaRegister'

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PwaRegister />
      {children}
    </AuthProvider>
  )
}
