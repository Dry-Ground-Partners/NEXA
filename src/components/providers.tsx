'use client'

import { UserProvider } from '@/contexts/user-context'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  )
}
