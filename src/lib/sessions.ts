// Client-side session utilities - no database operations here
// All database operations happen in API routes

// Session types for different pages
export type SessionType = 'structuring' | 'sow' | 'loe' | 'visuals' | 'solutioning'

// Structuring session data structure
export interface StructuringSessionData {
  // Basic info
  basic: {
    date: string
    engineer: string
    title: string
    client: string
  }
  
  // Content tabs
  contentTabs: {
    id: number
    text: string
  }[]
  
  // Solution tabs  
  solutionTabs: {
    id: number
    text: string
  }[]
  
  // AI-generated data
  reportData: string
  solutionOverview: string
  originalPainPoints: any[]
  generatedSolutions: string[]
  
  // UI state
  uiState: {
    activeMainTab: string
    activeContentTab: number
    activeSolutionTab: number
    isRolledBack: boolean
    useContextEcho: boolean
    useTracebackReport: boolean
  }
  
  // Metadata
  lastSaved: string
  version: number
}

// Visuals session data structure
export interface VisualsSessionData {
  // Basic info
  basic: {
    date: string
    engineer: string
    title: string
    client: string
  }
  
  // Diagram sets
  diagramSets: {
    id: number
    ideation: string
    planning: string
    sketch: string
    image: string | null  // Base64 data URL
    expandedContent: string
    isExpanded: boolean
  }[]
  
  // UI state
  uiState: {
    activeDiagramTab: number
    activeMainTab: string
  }
  
  // Metadata
  lastSaved: string
  version: number
}

// Generic session response
export interface SessionResponse {
  id: string
  uuid: string
  title: string | null
  client: string | null
  sessionType: string
  isTemplate: boolean
  createdAt: Date
  updatedAt: Date
  data: any
}

// Session summary for listing
export interface SessionSummary {
  id: string
  uuid: string
  title: string | null
  client: string | null
  sessionType: string
  createdAt: Date
  updatedAt: Date
  availableContent: {
    structure: boolean
    visuals: boolean
    solution: boolean
    work: boolean
    effort: boolean
  }
}

// All database operations moved to API routes
// This file now contains only types and client-side utilities

/**
 * Create default structuring session data
 */
export function createDefaultStructuringData(): StructuringSessionData {
  return {
    basic: {
      date: new Date().toISOString().split('T')[0],
      engineer: '',
      title: '',
      client: ''
    },
    contentTabs: [{ id: 1, text: '' }],
    solutionTabs: [{ id: 1, text: '' }],
    reportData: '',
    solutionOverview: '',
    originalPainPoints: [],
    generatedSolutions: [],
    uiState: {
      activeMainTab: 'project',
      activeContentTab: 1,
      activeSolutionTab: 1,
      isRolledBack: false,
      useContextEcho: true,
      useTracebackReport: true
    },
    lastSaved: '',
    version: 0
  }
}

/**
 * Create default visuals session data
 */
export function createDefaultVisualsData(): VisualsSessionData {
  return {
    basic: {
      date: new Date().toISOString().split('T')[0],
      engineer: '',
      title: '',
      client: ''
    },
    diagramSets: [{
      id: 1,
      ideation: '',
      planning: '',
      sketch: '',
      image: null,
      expandedContent: '',
      isExpanded: false
    }],
    uiState: {
      activeDiagramTab: 1,
      activeMainTab: 'diagrams'
    },
    lastSaved: '',
    version: 0
  }
}

// Client-side helper functions
