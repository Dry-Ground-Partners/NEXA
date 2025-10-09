'use client'

import { useState, useEffect } from 'react'
import { Header } from './header'
import { Footer } from './footer'
import { Sidebar } from './sidebar'
import { useUser } from '@/contexts/user-context'
import { useSidebarState } from '@/hooks/useSidebarState'

interface DashboardLayoutProps {
  children: React.ReactNode
  currentPage?: string
}

function DashboardLayoutInner({ 
  children, 
  currentPage = 'Dashboard'
}: DashboardLayoutProps) {
  const { user, selectedOrganization } = useUser()
  const { 
    sidebarState, 
    toggleSidebar, 
    closeSidebar, 
    isCollapsed, 
    isThin, 
    isExpanded, 
    isVisible,
    mounted 
  } = useSidebarState()

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
      
      // Global navigation shortcuts (only when sidebar is visible)
      if (isVisible) {
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
  }, [isVisible])

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex nexa-background">
        <div className="flex flex-col min-h-screen flex-1">
        <Header 
          currentPage={currentPage} 
          user={user || undefined}
          selectedOrganization={selectedOrganization}
          onSidebarToggle={toggleSidebar}
          isSidebarOpen={false}
        />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex nexa-background">
      {/* Sidebar */}
      <Sidebar 
        sidebarState={sidebarState}
        onClose={closeSidebar} 
        onToggle={toggleSidebar}
      />
      
      {/* Main content area */}
      <div 
        className={`
          flex flex-col min-h-screen flex-1 transition-all duration-300 ease-in-out
          ${isExpanded ? 'lg:ml-80' : isThin ? 'lg:ml-16' : 'ml-0'}
        `}
      >
        <Header 
          currentPage={currentPage} 
          user={user || undefined}
          selectedOrganization={selectedOrganization}
          onSidebarToggle={toggleSidebar}
          isSidebarOpen={isVisible}
        />
        
        <main className="flex-1">
          {children}
        </main>
        
        <Footer />
      </div>
    </div>
  )
}

export function DashboardLayout(props: DashboardLayoutProps) {
  return <DashboardLayoutInner {...props} />
}


