// LangChain and LangSmith types for the structuring module

export interface PainPointAnalysis {
  report: string
  pain_points: string[]
}

export interface StructuringRequest {
  content: string[]
  sessionId?: string
}

export interface StructuringResponse<T = PainPointAnalysis> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface GenerateSolutionRequest {
  solutionContent: string[]  // Current pain points from solution tabs
  content: string           // Content tabs (or " " if Context Echo off)
  report: string           // Report data (or " " if Traceback Report off)
}

export interface GenerateSolutionResponse {
  overview: string         // HTML overview from LangSmith
  solution_parts: string[] // Array of solution items
}
