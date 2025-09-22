'use client'

import { useState, useEffect } from 'react'
import { Header } from './header'
import { Footer } from './footer'
import { Sidebar } from './sidebar'

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.hasAttribute('contenteditable')
      )
      
      if (isInputFocused) return // Don't trigger shortcuts when typing
      
      // 'q' to toggle sidebar
      if (event.key === 'q' || event.key === 'Q') {
        event.preventDefault()
        toggleSidebar()
        return
      }
      
      // Global navigation shortcuts (only when sidebar is open)
      if (isSidebarOpen) {
        const navigationMap: { [key: string]: string } = {
          '1': '/grid',
          '2': '/structuring', 
          '3': '/visuals',
          '4': '/solutioning',
          '5': '/sow',
          '6': '/loe',
          '9': '/dashboard',
          '0': '/profile'
        }
        
        if (navigationMap[event.key]) {
          event.preventDefault()
          window.location.href = navigationMap[event.key]
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSidebarOpen])

  return (
    <div className="min-h-screen flex nexa-background">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      
      {/* Main content area */}
      <div 
        className={`
          flex flex-col min-h-screen flex-1 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'lg:ml-80' : 'ml-0'}
        `}
      >
        <Header 
          currentPage={currentPage} 
          user={user} 
          onSidebarToggle={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        
        <main className="flex-1">
          {children}
        </main>
        
        <Footer />
      </div>
    </div>
  )
}


