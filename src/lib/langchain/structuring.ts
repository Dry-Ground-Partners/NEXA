// LangChain structuring module using LangSmith prompts
import * as hub from "langchain/hub/node"
import { JsonOutputParser } from "@langchain/core/output_parsers"
import type { PainPointAnalysis, StructuringRequest, StructuringResponse, GenerateSolutionRequest, GenerateSolutionResponse } from './types'
import { getPreferencesForPrompts } from '@/lib/preferences/preferences-service'

// JSON output parsers for structured responses
const painPointParser = new JsonOutputParser<PainPointAnalysis>()
const solutionParser = new JsonOutputParser<GenerateSolutionResponse>()

/**
 * Analyze content using the LangSmith prompt and return pain points
 */
export async function analyzePainPoints(
  request: StructuringRequest,
  organizationId?: string
): Promise<StructuringResponse<PainPointAnalysis>> {
  try {
    console.log('🔍 Starting pain point analysis with LangChain...')
    
    // Validate inputs
    if (!request.content || request.content.length === 0) {
      return {
        success: false,
        error: 'No content provided for analysis'
      }
    }

    // Concatenate all content from tabs
    const combinedContent = request.content
      .filter(text => text && text.trim()) // Filter out empty content
      .join('\n\n')
      .trim()

    if (!combinedContent) {
      return {
        success: false,
        error: 'All content tabs are empty'
      }
    }

    console.log(`📝 Analyzing ${combinedContent.length} characters of content...`)

    // TESTING: Use the SAME approach as Generate Solution (includeModel: true)
    console.log('🚀 Pulling prompt from LangSmith...')
    console.log('🎯 Prompt name: "nexa-structuring-painpoints"')
    console.log('🧪 TESTING: Using includeModel: true like Generate Solution...')
    
    const promptWithModel = await hub.pull("nexa-structuring-painpoints", {
      includeModel: true
    })
    console.log('📝 Pulled prompt type:', promptWithModel.constructor.name)

    console.log('✅ Successfully pulled prompt from LangSmith')

    // Create the chain: promptWithModel (already includes ChatOpenAI) -> parser
    const chain = promptWithModel.pipe(painPointParser)

    console.log('🤖 Executing LangChain analysis...')

    // Fetch organization preferences
    const prefs = organizationId 
      ? await getPreferencesForPrompts(organizationId)
      : { generalApproach: '', structuring: { diagnose: '', echo: '' } }

    // Execute the chain with the transcript variable + preferences
    const result = await chain.invoke({
      transcript: combinedContent,
      general_approach: prefs.generalApproach || '',
      diagnose_preferences: prefs.structuring?.diagnose || '',
      echo_preferences: prefs.structuring?.echo || ''
    })

    console.log('✅ Pain point analysis completed successfully')
    console.log(`📊 Found ${result.pain_points?.length || 0} pain points`)

    return {
      success: true,
      data: result
    }

  } catch (error: unknown) {
    console.error('❌ Error in pain point analysis:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return {
          success: false,
          error: 'OpenAI API key not configured properly'
        }
      }
      
      if (error.message.includes('LangSmith') || error.message.includes('hub')) {
        return {
          success: false,
          error: 'Failed to pull prompt from LangSmith. Check LANGSMITH_API_KEY.'
        }
      }
      
      if (error.message.includes('JSON')) {
        return {
          success: false,
          error: 'AI response was not in valid JSON format'
        }
      }
    }

    return {
      success: false,
      error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Generate solutions using the LangSmith prompt and return structured solutions
 */
export async function generateSolution(
  request: GenerateSolutionRequest,
  organizationId?: string
): Promise<StructuringResponse<GenerateSolutionResponse>> {
  try {
    console.log('🔍 Starting solution generation with LangChain...')
    
    // Validate inputs
    if (!request.solutionContent || request.solutionContent.length === 0) {
      return {
        success: false,
        error: 'No solution content provided for generation'
      }
    }

    // Concatenate solution content (current pain points)
    const combinedSolutionContent = request.solutionContent
      .filter(text => text && text.trim()) // Filter out empty content
      .join('\n\n')
      .trim()

    if (!combinedSolutionContent) {
      return {
        success: false,
        error: 'All solution tabs are empty'
      }
    }

    console.log(`📝 Generating solutions for ${combinedSolutionContent.length} characters of pain points...`)
    console.log(`🔗 Context: ${request.content.length} characters`)
    console.log(`📄 Report: ${request.report.length} characters`)
    console.log('📋 Pain points being sent:', combinedSolutionContent.substring(0, 200) + '...')

    // Pull the prompt from LangSmith (already includes model with includeModel: true)
    console.log('🚀 Pulling solution generation prompt from LangSmith...')
    const promptWithModel = await hub.pull("nexa-generate-solution", {
      includeModel: true
    })

    console.log('✅ Successfully pulled solution generation prompt from LangSmith')

    // Create the chain: promptWithModel (already includes ChatOpenAI) -> parser
    const chain = promptWithModel.pipe(solutionParser)

    console.log('🤖 Executing LangChain solution generation...')

    // Execute the chain with the multiple variables
    // Correct mapping based on user specification:
    // - Main input: Current pain points (what we want solutions for)
    // - {content}: Content tabs (controlled by Context Echo toggle) 
    // - {report}: Report data (controlled by Traceback Report toggle)
    
    console.log('🎯 Variables being sent to LangSmith:')
    console.log('   - content (context):', request.content.length, 'chars')
    console.log('   - painpoints:', combinedSolutionContent.length, 'chars') 
    console.log('   - report (analysis report):', request.report.length, 'chars')
    console.log('   - Context Echo toggle:', request.content !== " " ? 'ON' : 'OFF')
    
    // Fetch organization preferences
    const prefs = organizationId 
      ? await getPreferencesForPrompts(organizationId)
      : { generalApproach: '', structuring: { solution: '', echo: '', traceback: '' } }
    
    // Send pain points and content separately + preferences
    const result = await chain.invoke({
      content: request.content,           // Content tabs (controlled by Context Echo)
      painpoints: combinedSolutionContent, // Pain points from solution tabs
      report: request.report,             // Report data (controlled by Traceback Report)
      general_approach: prefs.generalApproach || '',
      solution_preferences: prefs.structuring?.solution || '',
      echo_preferences: prefs.structuring?.echo || '',
      traceback_preferences: prefs.structuring?.traceback || ''
    })

    console.log('✅ Solution generation completed successfully')
    console.log('🔍 Raw LangChain result:', JSON.stringify(result, null, 2))
    
    // Handle different response formats from LangChain
    let parsedResult: any = result
    
    // If result is an array with text field, extract the JSON
    if (Array.isArray(result) && result.length > 0 && result[0].text) {
      console.log('🔧 Extracting JSON from text field...')
      try {
        parsedResult = JSON.parse(result[0].text)
        console.log('✅ Successfully parsed JSON from text field')
      } catch (parseError) {
        console.error('❌ Failed to parse JSON from text field:', parseError)
        return {
          success: false,
          error: 'Invalid JSON format in AI response text field'
        }
      }
    }
    
    // Validate the parsed result structure
    if (!parsedResult || typeof parsedResult !== 'object') {
      console.error('❌ Invalid parsed result from LangChain:', parsedResult)
      return {
        success: false,
        error: 'Invalid response format from AI - not an object'
      }
    }
    
    if (!parsedResult.solution_parts || !Array.isArray(parsedResult.solution_parts)) {
      console.error('❌ Missing or invalid solution_parts in parsed result:', parsedResult)
      return {
        success: false,
        error: 'Invalid response format from AI - missing solution_parts array'
      }
    }

    console.log(`📊 Generated ${parsedResult.solution_parts.length} solution parts`)
    
    return {
      success: true,
      data: {
        solution_parts: parsedResult.solution_parts
      }
    }
    
  } catch (error: unknown) {
    console.error('❌ Error in solution generation:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return {
          success: false,
          error: 'OpenAI API key not configured properly'
        }
      }
      
      if (error.message.includes('LangSmith') || error.message.includes('hub')) {
        return {
          success: false,
          error: 'Failed to pull solution generation prompt from LangSmith. Check LANGSMITH_API_KEY.'
        }
      }
      
      if (error.message.includes('JSON')) {
        return {
          success: false,
          error: 'AI response was not in valid JSON format'
        }
      }
    }

    return {
      success: false,
      error: `Solution generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Generate analysis report from pain points
 * Returns markdown-formatted report
 */
export async function generateAnalysisReport(
  painPoints: string[],
  organizationId?: string
): Promise<StructuringResponse<{ report: string }>> {
  try {
    console.log('🔍 Starting analysis report generation with LangChain...')
    
    // Validate inputs
    if (!painPoints || painPoints.length === 0) {
      return {
        success: false,
        error: 'No pain points provided for analysis report'
      }
    }

    // Concatenate pain points
    const combinedPainPoints = painPoints
      .filter(pp => pp && pp.trim())
      .join('\n\n')
      .trim()

    if (!combinedPainPoints) {
      return {
        success: false,
        error: 'All pain points are empty'
      }
    }

    console.log(`📝 Generating analysis report for ${painPoints.length} pain points...`)
    console.log(`📊 Total content: ${combinedPainPoints.length} characters`)

    // Pull the prompt from LangSmith
    console.log('🚀 Pulling analysis report prompt from LangSmith...')
    const promptWithModel = await hub.pull("nexa-structuring-analysis-report", {
      includeModel: true
    })

    console.log('✅ Successfully pulled analysis report prompt from LangSmith')

    // Since we're expecting plain markdown string, use JSON parser to extract it
    const parser = new JsonOutputParser<{ report: string }>()
    const chain = promptWithModel.pipe(parser)

    console.log('🤖 Executing LangChain analysis report generation...')

    // Execute the chain
    const result = await chain.invoke({
      pain_points: combinedPainPoints
    })

    console.log('✅ Analysis report generation completed successfully')
    console.log('🔍 Raw LangChain result type:', typeof result)
    
    // Handle different response formats from LangChain
    let parsedResult: any = result
    
    // If result is an array with text field, extract the JSON
    if (Array.isArray(result) && result.length > 0 && result[0].text) {
      console.log('🔧 Extracting JSON from text field...')
      try {
        parsedResult = JSON.parse(result[0].text)
        console.log('✅ Successfully parsed JSON from text field')
      } catch (parseError) {
        console.error('❌ Failed to parse JSON from text field:', parseError)
        console.log('📝 Raw text:', result[0].text.substring(0, 500))
        return {
          success: false,
          error: 'Invalid JSON format in AI response text field'
        }
      }
    }
    
    // Extract report from result
    let report = ''
    if (typeof parsedResult === 'object' && parsedResult !== null && 'report' in parsedResult) {
      report = parsedResult.report
    } else if (typeof parsedResult === 'string') {
      // If result is already a string, use it directly
      report = parsedResult
    } else {
      console.error('❌ Invalid result format from LangChain:', parsedResult)
      return {
        success: false,
        error: 'Invalid response format from AI'
      }
    }

    console.log(`📄 Report length: ${report.length} characters`)

    return {
      success: true,
      data: { report }
    }

  } catch (error: unknown) {
    console.error('❌ Error in analysis report generation:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return {
          success: false,
          error: 'OpenAI API key not configured properly'
        }
      }
      
      if (error.message.includes('LangSmith') || error.message.includes('hub')) {
        return {
          success: false,
          error: 'Failed to pull analysis report prompt from LangSmith. Check LANGSMITH_API_KEY.'
        }
      }
      
      if (error.message.includes('JSON')) {
        return {
          success: false,
          error: 'AI response was not in valid JSON format'
        }
      }
    }

    return {
      success: false,
      error: `Analysis report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Generate solution overview from solutions only
 * Returns markdown-formatted overview
 * Note: Prompt only takes {solutions} variable
 */
export async function generateSolutionOverview(
  solutions: string[],
  organizationId?: string
): Promise<StructuringResponse<{ overview: string }>> {
  try {
    console.log('🔍 Starting solution overview generation with LangChain...')
    
    // Validate inputs
    if (!solutions || solutions.length === 0) {
      return {
        success: false,
        error: 'No solutions provided for solution overview'
      }
    }

    // Concatenate solutions
    const combinedSolutions = solutions
      .filter(sol => sol && sol.trim())
      .join('\n\n---\n\n')
      .trim()

    if (!combinedSolutions) {
      return {
        success: false,
        error: 'All solutions are empty'
      }
    }

    console.log(`📝 Generating solution overview for ${solutions.length} solutions...`)
    console.log(`📊 Total content: ${combinedSolutions.length} characters`)

    // Pull the prompt from LangSmith
    console.log('🚀 Pulling solution overview prompt from LangSmith...')
    const promptWithModel = await hub.pull("nexa-structuring-solution-overview", {
      includeModel: true
    })

    console.log('✅ Successfully pulled solution overview prompt from LangSmith')

    // Since we're expecting plain markdown string, use JSON parser to extract it
    const parser = new JsonOutputParser<{ overview: string }>()
    const chain = promptWithModel.pipe(parser)

    console.log('🤖 Executing LangChain solution overview generation...')

    // Execute the chain (prompt only takes {solutions} variable)
    const result = await chain.invoke({
      solutions: combinedSolutions
    })

    console.log('✅ Solution overview generation completed successfully')
    console.log('🔍 Raw LangChain result type:', typeof result)
    
    // Handle different response formats from LangChain
    let parsedResult: any = result
    
    // If result is an array with text field, extract the JSON
    if (Array.isArray(result) && result.length > 0 && result[0].text) {
      console.log('🔧 Extracting JSON from text field...')
      try {
        parsedResult = JSON.parse(result[0].text)
        console.log('✅ Successfully parsed JSON from text field')
      } catch (parseError) {
        console.error('❌ Failed to parse JSON from text field:', parseError)
        console.log('📝 Raw text:', result[0].text.substring(0, 500))
        return {
          success: false,
          error: 'Invalid JSON format in AI response text field'
        }
      }
    }
    
    // Extract overview from result
    let overview = ''
    if (typeof parsedResult === 'object' && parsedResult !== null && 'overview' in parsedResult) {
      overview = parsedResult.overview
    } else if (typeof parsedResult === 'string') {
      // If result is already a string, use it directly
      overview = parsedResult
    } else {
      console.error('❌ Invalid result format from LangChain:', parsedResult)
      return {
        success: false,
        error: 'Invalid response format from AI'
      }
    }

    console.log(`📄 Overview length: ${overview.length} characters`)

    return {
      success: true,
      data: { overview }
    }

  } catch (error: unknown) {
    console.error('❌ Error in solution overview generation:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return {
          success: false,
          error: 'OpenAI API key not configured properly'
        }
      }
      
      if (error.message.includes('LangSmith') || error.message.includes('hub')) {
        return {
          success: false,
          error: 'Failed to pull solution overview prompt from LangSmith. Check LANGSMITH_API_KEY.'
        }
      }
      
      if (error.message.includes('JSON')) {
        return {
          success: false,
          error: 'AI response was not in valid JSON format'
        }
      }
    }

    return {
      success: false,
      error: `Solution overview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Health check for the LangChain/LangSmith integration
 */
export async function healthCheck(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if we can pull the prompt
    await hub.pull("nexa-structuring-painpoints", {
      includeModel: true
    })
    
    return {
      success: true,
      message: 'LangChain/LangSmith integration is working'
    }
  } catch (error: unknown) {
    return {
      success: false,
      message: `Integration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
