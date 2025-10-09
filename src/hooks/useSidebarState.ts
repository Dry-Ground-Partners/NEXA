'use client'

import { useState, useEffect } from 'react'

export type SidebarState = 'collapsed' | 'thin' | 'expanded'

const SIDEBAR_STATE_KEY = 'nexa-sidebar-state'

export function useSidebarState() {
  const [sidebarState, setSidebarState] = useState<SidebarState>('collapsed')
  const [mounted, setMounted] = useState(false)

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(SIDEBAR_STATE_KEY) as SidebarState
    if (savedState && ['collapsed', 'thin', 'expanded'].includes(savedState)) {
      setSidebarState(savedState)
    }
    setMounted(true)
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(SIDEBAR_STATE_KEY, sidebarState)
    }
  }, [sidebarState, mounted])

  const toggleSidebar = () => {
    setSidebarState(current => {
      switch (current) {
        case 'collapsed':
          return 'thin'
        case 'thin':
          return 'expanded'
        case 'expanded':
          return 'collapsed'
        default:
          return 'thin'
      }
    })
  }

  const setSidebar = (state: SidebarState) => {
    setSidebarState(state)
  }

  const closeSidebar = () => {
    setSidebarState('collapsed')
  }

  const expandSidebar = () => {
    setSidebarState('expanded')
  }

  const isCollapsed = sidebarState === 'collapsed'
  const isThin = sidebarState === 'thin'
  const isExpanded = sidebarState === 'expanded'
  const isVisible = sidebarState !== 'collapsed'

  return {
    sidebarState,
    setSidebar,
    toggleSidebar,
    closeSidebar,
    expandSidebar,
    isCollapsed,
    isThin,
    isExpanded,
    isVisible,
    mounted
  }
}
