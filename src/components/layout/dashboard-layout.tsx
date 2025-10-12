'use client'

import { useState, useEffect } from 'react'
import { Header } from './header'
import { Footer } from './footer'
import { Sidebar } from './sidebar'
import { AISidebar } from '@/components/ai-sidebar/AISidebar'
import { useUser } from '@/contexts/user-context'
import { useSidebarState } from '@/hooks/useSidebarState'
import { cn } from '@/lib/utils'

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

  // Track AI sidebar state
  const [aiSidebarExpanded, setAiSidebarExpanded] = useState(false)

  // Listen for AI sidebar state changes
  useEffect(() => {
    // Load initial state
    const stored = localStorage.getItem('nexa-ai-sidebar-state')
    if (stored === 'true') {
      setAiSidebarExpanded(true)
    }

    // Listen for changes
    const handleAiSidebarChange = (e: CustomEvent) => {
      setAiSidebarExpanded(e.detail.isExpanded)
    }

    window.addEventListener('aiSidebarStateChange', handleAiSidebarChange as EventListener)
    return () => {
      window.removeEventListener('aiSidebarStateChange', handleAiSidebarChange as EventListener)
    }
  }, [])

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
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex nexa-background relative">
      {/* Left Sidebar */}
      <Sidebar 
        sidebarState={sidebarState}
        onClose={closeSidebar} 
        onToggle={toggleSidebar}
      />
      
      {/* Right Sidebar - AI Copilot */}
      <AISidebar />
      
      {/* Main content area */}
      <div 
        className={cn(
          "flex flex-col min-h-screen flex-1 transition-all duration-300 ease-in-out",
          // Left margin for left sidebar
          isExpanded ? 'lg:ml-80' : isThin ? 'lg:ml-16' : 'ml-0',
          // Right margin for AI sidebar (pushes content like left sidebar does)
          aiSidebarExpanded ? 'mr-96' : 'mr-0'
        )}
      >
        <Header 
          currentPage={currentPage} 
          user={user || undefined}
          selectedOrganization={selectedOrganization}
          onSidebarToggle={toggleSidebar}
          isSidebarOpen={isVisible}
        />
        
        <main className="flex-1 flex flex-col">
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


