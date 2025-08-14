import { Header } from './header'
import { Footer } from './footer'

interface DashboardLayoutProps {
  children: React.ReactNode
  currentPage?: string
  user?: {
    fullName: string | null
    email: string
  }
}

export function DashboardLayout({ 
  children, 
  currentPage = 'Dashboard',
  user 
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col nexa-background">
      <Header currentPage={currentPage} user={user} />
      
      <main className="flex-1">
        {children}
      </main>
      
      <Footer />
    </div>
  )
}


