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

// Solutioning session data structure
export interface SolutioningSessionData {
  // Basic info
  basic: {
    date: string
    engineer: string
    title: string
    recipient: string
  }
  
  // Current solution tracking
  currentSolution: number
  solutionCount: number
  
  // Solutions data
  solutions: {
    [key: number]: {
      id: number
      additional: {
        imageData: string | null
        imageUrl: string | null
      }
      variables: {
        aiAnalysis: string
        solutionExplanation: string
      }
      structure: {
        title: string
        steps: string
        approach: string
        difficulty: number
        layout: number
        stack: string
      }
    }
  }
  
  // UI state
  uiState: {
    activeMainTab: string
    activeSubTab: string
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

// SOW session data structure
export interface SOWSessionData {
  // Basic info
  basic: {
    date: string
    engineer: string
    title: string
    client: string
  }
  
  // Project & Background
  project: {
    background: string
    objectives: {
      id: number
      text: string
    }[]
  }
  
  // Scope
  scope: {
    deliverables: {
      id: number
      deliverable: string
      keyFeatures: string
      primaryArtifacts: string
    }[]
    outOfScope: string
  }
  
  // Requirements (Clauses)
  clauses: {
    functionalRequirements: {
      id: number
      text: string
    }[]
    nonFunctionalRequirements: {
      id: number
      text: string
    }[]
  }
  
  // Timeline
  timeline: {
    phases: {
      id: number
      phase: string
      keyActivities: string
      weeksStart: number
      weeksEnd: number
    }[]
  }
  
  // UI state
  uiState: {
    activeMainTab: string
  }
  
  // Metadata
  lastSaved: string
  version: number
}

/**
 * Create default solutioning session data
 */
export function createDefaultSolutioningData(): SolutioningSessionData {
  return {
    basic: {
      date: new Date().toISOString().split('T')[0],
      engineer: '',
      title: '',
      recipient: ''
    },
    currentSolution: 1,
    solutionCount: 1,
    solutions: {
      1: {
        id: 1,
        additional: {
          imageData: null,
          imageUrl: null
        },
        variables: {
          aiAnalysis: '',
          solutionExplanation: ''
        },
        structure: {
          title: '',
          steps: '',
          approach: '',
          difficulty: 50,
          layout: 1,
          stack: ''
        }
      }
    },
    uiState: {
      activeMainTab: 'basic',
      activeSubTab: 'additional'
    },
    lastSaved: '',
    version: 0
  }
}

/**
 * Create default SOW session data
 */
export function createDefaultSOWData(): SOWSessionData {
  return {
    basic: {
      date: new Date().toISOString().split('T')[0],
      engineer: '',
      title: '',
      client: ''
    },
    project: {
      background: '',
      objectives: [{ id: 1, text: '' }]
    },
    scope: {
      deliverables: [{ id: 1, deliverable: '', keyFeatures: '', primaryArtifacts: '' }],
      outOfScope: ''
    },
    clauses: {
      functionalRequirements: [{ id: 1, text: '' }],
      nonFunctionalRequirements: [{ id: 1, text: '' }]
    },
    timeline: {
      phases: [{ id: 1, phase: '', keyActivities: '', weeksStart: 1, weeksEnd: 4 }]
    },
    uiState: {
      activeMainTab: 'basic'
    },
    lastSaved: '',
    version: 0
  }
}

// LOE session data structure
export interface LOESessionData {
  // Info tab
  info: {
    project: string
    client: string
    preparedBy: string
    date: string
  }
  
  // Workstreams tab
  workstreams: {
    overview: string
    workstreams: {
      id: number
      workstream: string
      activities: string
      duration: number
    }[]
  }
  
  // Resources tab
  resources: {
    resources: {
      id: number
      role: string
      personWeeks: number
      personHours: number
    }[]
    buffer: {
      weeks: number
      hours: number
    }
  }
  
  // Assumptions tab
  assumptions: {
    assumptions: {
      id: number
      text: string
    }[]
  }
  
  // Variations tab
  variations: {
    goodOptions: {
      id: number
      feature: string
      hours: number
      weeks: number
    }[]
    bestOptions: {
      id: number
      feature: string
      hours: number
      weeks: number
    }[]
  }
  
  // Metadata
  lastSaved: string
  version: number
}

/**
 * Create default LOE session data
 */
export function createDefaultLOEData(): LOESessionData {
  return {
    info: {
      project: '',
      client: '',
      preparedBy: 'Dry Ground Partners',
      date: new Date().toISOString().split('T')[0]
    },
    workstreams: {
      overview: '',
      workstreams: [
        { id: 1, workstream: '', activities: '', duration: 2 }
      ]
    },
    resources: {
      resources: [
        { id: 1, role: '', personWeeks: 0, personHours: 0 }
      ],
      buffer: {
        weeks: 0,
        hours: 0
      }
    },
    assumptions: {
      assumptions: [
        { id: 1, text: '' }
      ]
    },
    variations: {
      goodOptions: [
        { id: 1, feature: '', hours: 0, weeks: 0 }
      ],
      bestOptions: [
        { id: 1, feature: '', hours: 0, weeks: 0 }
      ]
    },
    lastSaved: '',
    version: 0
  }
}

// Client-side helper functions
