// LangChain visuals module using LangSmith prompts
import * as hub from "langchain/hub/node"
import { JsonOutputParser } from "@langchain/core/output_parsers"
import { getPreferencesForPrompts } from '@/lib/preferences/preferences-service'

// Types for visuals planning
export interface VisualsIdeationRequest {
  solution: string  // Ideation content to be analyzed
}

export interface VisualsIdeationResponse {
  success: boolean
  data?: string     // Planning content returned from LangSmith
  message?: string
  error?: string
}

// Types for visuals sketch generation
export interface VisualsSketchRequest {
  planning: string  // Planning content to be converted to sketch
}

export interface VisualsSketchResponse {
  success: boolean
  data?: string     // Sketch content returned from LangSmith
  message?: string
  error?: string
}

// JSON output parsers
const planningParser = new JsonOutputParser<{ planning: string }>()
const sketchParser = new JsonOutputParser<{ sketch: string }>()

/**
 * Generate planning content from ideation using LangSmith
 */
export async function generatePlanningFromIdeation(
  request: VisualsIdeationRequest,
  organizationId?: string
): Promise<VisualsIdeationResponse> {
  try {
    console.log('🎨 Starting visuals planning generation with LangChain...')
    
    // Validate input
    if (!request.solution || !request.solution.trim()) {
      return {
        success: false,
        error: 'No ideation content provided'
      }
    }

    console.log(`📝 Processing ideation content: ${request.solution.length} characters`)

    // Pull the LangSmith prompt
    console.log('🚀 Pulling prompt from LangSmith...')
    console.log('🎯 Prompt name: "nexa-visuals-planning"')
    
    const promptWithModel = await hub.pull("nexa-visuals-planning", {
      includeModel: true
    })
    console.log('📝 Pulled prompt type:', promptWithModel.constructor.name)
    console.log('✅ Successfully pulled visuals planning prompt from LangSmith')

    // Execute the prompt with the ideation content
    console.log('🤖 Executing LangChain planning generation...')
    console.log('🎯 Variables being sent to LangSmith:')
    console.log(`- solution: ${request.solution.length} chars`)

    // Fetch organization preferences
    const prefs = organizationId 
      ? await getPreferencesForPrompts(organizationId)
      : { generalApproach: '', visuals: { ideation: '', planning: '' } }

    const result = await promptWithModel.invoke({
      solution: request.solution,
      general_approach: prefs.generalApproach || '',
      ideation_preferences: prefs.visuals?.ideation || '',
      planning_preferences: prefs.visuals?.planning || ''
    })

    console.log('🔍 Raw LangChain result:', result)

    // Handle different response formats
    let planningContent: string

    if (Array.isArray(result) && result.length > 0) {
      // Handle array response with text field
      const firstResult = result[0]
      if (firstResult && typeof firstResult === 'object' && 'text' in firstResult) {
        console.log('🔧 Extracting planning from text field...')
        planningContent = firstResult.text
      } else {
        console.log('🔧 Using first array item as planning content...')
        planningContent = String(result[0])
      }
    } else if (typeof result === 'string') {
      console.log('🔧 Using string result as planning content...')
      planningContent = result
    } else if (result && typeof result === 'object') {
      console.log('🔧 Extracting planning from object result...')
      // Try to extract planning content from object
      planningContent = result.planning || result.content || JSON.stringify(result)
    } else {
      console.log('🔧 Using result as-is...')
      planningContent = String(result)
    }

    console.log('✅ Planning generation completed successfully')
    console.log(`📄 Planning content length: ${planningContent.length} characters`)

    return {
      success: true,
      data: planningContent,
      message: 'Planning generated successfully from ideation'
    }

  } catch (error: unknown) {
    console.error('❌ Error in visuals planning generation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Generate sketch content from planning using LangSmith
 */
export async function generateSketchFromPlanning(
  request: VisualsSketchRequest,
  organizationId?: string
): Promise<VisualsSketchResponse> {
  try {
    console.log('🎨 Starting sketch generation from planning with LangChain...')
    
    // Validate input
    if (!request.planning || !request.planning.trim()) {
      return {
        success: false,
        error: 'No planning content provided'
      }
    }

    console.log(`📝 Processing planning content: ${request.planning.length} characters`)

    // Pull the LangSmith prompt
    console.log('🚀 Pulling prompt from LangSmith...')
    console.log('🎯 Prompt name: "nexa-visuals-sketch"')
    
    const promptWithModel = await hub.pull("nexa-visuals-sketch", {
      includeModel: true
    })
    console.log('📝 Pulled prompt type:', promptWithModel.constructor.name)
    console.log('✅ Successfully pulled visuals sketch prompt from LangSmith')

    // Execute the prompt with the planning content
    console.log('🤖 Executing LangChain sketch generation...')
    console.log('🎯 Variables being sent to LangSmith:')
    console.log(`- planning: ${request.planning.length} chars`)

    // Fetch organization preferences
    const prefs = organizationId 
      ? await getPreferencesForPrompts(organizationId)
      : { generalApproach: '', visuals: { sketching: '' } }

    const result = await promptWithModel.invoke({
      planning: request.planning,
      general_approach: prefs.generalApproach || '',
      sketching_preferences: prefs.visuals?.sketching || ''
    })

    console.log('🔍 Raw LangChain result:', result)
    console.log('🔍 Result type:', typeof result)
    console.log('🔍 Result keys:', Object.keys(result || {}))

    // Handle different response formats
    let sketchContent: string

    if (Array.isArray(result) && result.length > 0) {
      // Handle array response with text field
      const firstResult = result[0]
      if (firstResult && typeof firstResult === 'object' && 'text' in firstResult) {
        console.log('🔧 Extracting sketch from text field...')
        sketchContent = firstResult.text
      } else {
        console.log('🔧 Using first array item as sketch content...')
        sketchContent = String(result[0])
      }
    } else if (typeof result === 'string') {
      console.log('🔧 Using string result as sketch content...')
      sketchContent = result
    } else if (result && typeof result === 'object') {
      console.log('🔧 Extracting sketch from object result...')
      console.log('🔍 Available properties:', Object.keys(result))
      console.log('🔍 Content property exists:', 'content' in result)
      console.log('🔍 Content value type:', typeof result.content)
      console.log('🔍 Content preview:', result.content?.substring(0, 100))
      
      // Try to extract sketch content from object
      sketchContent = result.content || result.sketch || JSON.stringify(result)
      console.log('🔧 Extracted content length:', sketchContent.length)
    } else {
      console.log('🔧 Using result as-is...')
      sketchContent = String(result)
    }

    console.log('✅ Sketch generation completed successfully')
    console.log(`📄 Sketch content length: ${sketchContent.length} characters`)

    // Sanitize sketch content for XML compatibility
    console.log('🧹 Sanitizing sketch content for XML compatibility...')
    console.log('🧹 Original content preview:', sketchContent.substring(0, 200))
    
    const sanitizedSketchContent = sketchContent
      .replace(/```/g, '')           // Remove triple backticks
      .replace(/&/g, '')             // Remove ampersands
      .replace(/\n/g, ' ')           // Replace newlines with spaces (instead of removing)
      .replace(/\\"/g, '"')          // Replace escaped quotes with regular quotes
      .replace(/\s+/g, ' ')          // Collapse multiple spaces to single space
      .trim()                        // Remove leading/trailing whitespace
    
    console.log(`📄 Sanitized sketch content length: ${sanitizedSketchContent.length} characters`)
    console.log('🧹 Sanitized content preview:', sanitizedSketchContent.substring(0, 200))

    return {
      success: true,
      data: sanitizedSketchContent,
      message: 'Sketch generated successfully from planning'
    }

  } catch (error: unknown) {
    console.error('❌ Error in visuals sketch generation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

