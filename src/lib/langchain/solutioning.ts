import * as hub from 'langchain/hub/node'
import { OpenAI } from 'openai'
import { getPreferencesForPrompts } from '@/lib/preferences/preferences-service'

// Interfaces for vision analysis
export interface VisionAnalysisRequest {
  imageUrl?: string
  imageData?: string // base64 data URL
  additionalContext?: string
}

export interface VisionAnalysisResponse {
  success: boolean
  analysis?: string
  error?: string
}

// Interfaces for text enhancement
export interface TextEnhancementRequest {
  text: string
}

export interface TextEnhancementResponse {
  success: boolean
  enhancedText?: string
  error?: string
}

// Interfaces for solution structuring
export interface SolutionStructureRequest {
  aiAnalysis: string
  solutionExplanation: string
}

export interface SolutionStructureResponse {
  success: boolean
  structure?: {
    title: string
    steps: string
    approach: string
    difficulty: number
  }
  error?: string
}

// Interfaces for per-node stack analysis
export interface PerNodeStackRequest {
  context: string
}

export interface PerNodeStackResponse {
  success: boolean
  analysis?: string
  error?: string
}

// Interfaces for SOW generation
export interface SOWGenerationRequest {
  solutioningData: string // Concatenated valuable content from solutioning
}

export interface SOWGenerationResponse {
  success: boolean
  sowData?: any // SOWSessionData structure
  error?: string
}

// Interfaces for LOE generation
export interface LOEGenerationRequest {
  sowData: string // Concatenated valuable content from SOW
}

export interface LOEGenerationResponse {
  success: boolean
  loeData?: any // LOESessionData structure
  error?: string
}

/**
 * Analyze an image using LangSmith nexa-solutioning-vision prompt with OpenAI Vision API
 */
export async function analyzeImageWithVision(
  request: VisionAnalysisRequest,
  organizationId?: string
): Promise<VisionAnalysisResponse> {
  try {
    console.log('🔍 Starting vision analysis with LangSmith prompt...')
    
    // Pull the prompt from LangSmith
    console.log('📥 Pulling nexa-solutioning-vision prompt from LangSmith...')
    const promptTemplate = await hub.pull('nexa-solutioning-vision', {
      includeModel: true
    })
    console.log('✅ Successfully pulled vision prompt from LangSmith')
    console.log('🔍 Prompt template:', promptTemplate)

    // Initialize OpenAI client directly
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Determine image URL
    let imageUrl: string
    if (request.imageUrl) {
      console.log('📸 Using provided image URL for analysis')
      imageUrl = request.imageUrl
    } else if (request.imageData) {
      console.log('📸 Using provided image data for analysis')
      imageUrl = request.imageData
    } else {
      throw new Error('No image URL or data provided')
    }

    // Extract the prompt text from the LangSmith template
    let promptText: string
    if (typeof promptTemplate === 'string') {
      promptText = promptTemplate
    } else if (promptTemplate && typeof promptTemplate === 'object') {
      // Handle different prompt template formats
      if ('template' in promptTemplate) {
        promptText = promptTemplate.template as string
      } else if ('messages' in promptTemplate && Array.isArray(promptTemplate.messages)) {
        // Extract from messages array
        const humanMessage = promptTemplate.messages.find((msg: any) => 
          msg.role === 'human' || msg.role === 'user' || msg._getType?.() === 'human'
        )
        promptText = humanMessage?.content || humanMessage?.template || 'Analyze this diagram and provide detailed insights.'
      } else if ('prompt' in promptTemplate) {
        promptText = promptTemplate.prompt as string
      } else {
        console.log('🔍 Prompt template keys:', Object.keys(promptTemplate))
        promptText = 'Analyze this solution diagram and provide detailed insights about its architecture, components, and technical approach.'
      }
    } else {
      promptText = 'Analyze this solution diagram and provide detailed insights about its architecture, components, and technical approach.'
    }

    // Replace variables in prompt if needed
    const finalPrompt = promptText
      .replace('{diagram}', 'the provided diagram')
      .replace('{additional_context}', request.additionalContext || 'No additional context provided')

    console.log('🎯 Final prompt to be used:', finalPrompt.substring(0, 200) + '...')
    console.log('📸 Image URL length:', imageUrl.length, 'characters')

    // Fetch organization preferences
    const prefs = organizationId 
      ? await getPreferencesForPrompts(organizationId)
      : { generalApproach: '', solutioning: { analysis: '' } }

    // Prepend preferences to prompt if available
    const promptWithPrefs = [
      prefs.generalApproach || '',
      prefs.solutioning?.analysis ? `Analysis Approach: ${prefs.solutioning.analysis}` : '',
      finalPrompt
    ].filter(Boolean).join('\n\n')

    // Make OpenAI Vision API call
    console.log('🤖 Executing OpenAI Vision analysis...')
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: promptWithPrefs
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })

    const analysis = response.choices[0]?.message?.content

    if (!analysis || analysis.trim().length === 0) {
      throw new Error('Empty analysis result from OpenAI Vision')
    }

    console.log('✅ Vision analysis completed successfully')
    console.log('📊 Analysis length:', analysis.length, 'characters')

    return {
      success: true,
      analysis: analysis.trim()
    }

  } catch (error: unknown) {
    console.error('❌ Vision analysis failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Enhance text using LangSmith nexa-solutioning-enhance prompt
 */
export async function enhanceTextWithLangSmith(
  request: TextEnhancementRequest,
  organizationId?: string
): Promise<TextEnhancementResponse> {
  try {
    // Pull the prompt from LangSmith hub
    const promptTemplate = await hub.pull('nexa-solutioning-enhance', {
      includeModel: true
    })

    // Fetch organization preferences
    const prefs = organizationId 
      ? await getPreferencesForPrompts(organizationId)
      : { generalApproach: '', solutioning: { enhance: '', formatting: '' } }

    // Invoke the prompt with the explanation + preferences
    const result = await promptTemplate.invoke({
      explanation: request.text,
      general_approach: prefs.generalApproach || '',
      enhance_preferences: prefs.solutioning?.enhance || '',
      formatting_preferences: prefs.solutioning?.formatting || ''
    })

    // Extract the text content from the result
    let enhancedText: string
    if (typeof result === 'string') {
      enhancedText = result
    } else if (result && typeof result === 'object' && 'content' in result) {
      enhancedText = (result as any).content
    } else if (result && typeof result === 'object' && 'text' in result) {
      enhancedText = (result as any).text
    } else {
      throw new Error('Unexpected response format from LangSmith')
    }

    if (!enhancedText) {
      throw new Error('Empty response from LangSmith')
    }

    return {
      success: true,
      enhancedText: enhancedText.trim()
    }

  } catch (error: unknown) {
    console.error('❌ Error in text enhancement:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Structure a solution using LangSmith nexa-solutioning-structure prompt
 */
export async function structureSolutionWithLangSmith(
  request: SolutionStructureRequest,
  organizationId?: string
): Promise<SolutionStructureResponse> {
  try {
    // Pull the prompt from LangSmith hub
    const promptTemplate = await hub.pull('nexa-solutioning-structure', {
      includeModel: true
    })

    // Fetch organization preferences
    const prefs = organizationId 
      ? await getPreferencesForPrompts(organizationId)
      : { generalApproach: '', solutioning: { structure: '' } }

    // Invoke the prompt with the AI analysis and solution explanation + preferences
    const result = await promptTemplate.invoke({
      ai_analysis: request.aiAnalysis,
      solution_explanation: request.solutionExplanation,
      general_approach: prefs.generalApproach || '',
      structure_preferences: prefs.solutioning?.structure || ''
    })

    // Extract the JSON content from the result
    let structuredResponse: any
    if (typeof result === 'string') {
      // If it's a string, try to parse it as JSON
      structuredResponse = JSON.parse(result)
    } else if (result && typeof result === 'object' && 'content' in result) {
      // If it's an AIMessage with content
      const content = (result as any).content
      structuredResponse = JSON.parse(content)
    } else if (result && typeof result === 'object' && 'text' in result) {
      // Alternative text property
      const text = (result as any).text
      structuredResponse = JSON.parse(text)
    } else {
      throw new Error('Unexpected response format from LangSmith')
    }

    // Validate the response structure
    if (!structuredResponse || typeof structuredResponse !== 'object') {
      throw new Error('Invalid JSON response from LangSmith')
    }

    const { title, steps, approach, difficulty } = structuredResponse

    if (!title || !steps || !approach || typeof difficulty !== 'number') {
      throw new Error('Missing required fields in LangSmith response')
    }

    return {
      success: true,
      structure: {
        title: title.trim(),
        steps: steps.trim(),
        approach: approach.trim(),
        difficulty: difficulty
      }
    }

  } catch (error: unknown) {
    console.error('❌ Error in solution structuring:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Analyze per-node stack using LangSmith nexa-solutioning-pernode prompt
 */
export async function analyzePerNodeStackWithLangSmith(
  request: PerNodeStackRequest,
  organizationId?: string
): Promise<PerNodeStackResponse> {
  try {
    // Pull the prompt from LangSmith hub
    const promptTemplate = await hub.pull('nexa-solutioning-pernode', {
      includeModel: true
    })

    // Fetch organization preferences
    const prefs = organizationId 
      ? await getPreferencesForPrompts(organizationId)
      : { generalApproach: '', solutioning: { stack: '' } }

    // Invoke the prompt with the context (AI analysis + solution steps) + preferences
    const result = await promptTemplate.invoke({
      context: request.context,
      general_approach: prefs.generalApproach || '',
      stack_preferences: prefs.solutioning?.stack || ''
    })

    // Extract the text content from the result
    let analysis: string
    if (typeof result === 'string') {
      analysis = result
    } else if (result && typeof result === 'object' && 'content' in result) {
      const content = (result as any).content
      // Handle AIMessage with content array structure
      if (Array.isArray(content) && content.length > 0 && content[0].text) {
        analysis = content[0].text
      } else if (typeof content === 'string') {
        analysis = content
      } else {
        analysis = String(content)
      }
    } else if (result && typeof result === 'object' && 'text' in result) {
      analysis = (result as any).text
    } else {
      throw new Error('Unexpected response format from LangSmith')
    }

    // Ensure analysis is a string before calling trim
    if (typeof analysis !== 'string') {
      analysis = String(analysis)
    }

    return {
      success: true,
      analysis: analysis.trim()
    }

  } catch (error: unknown) {
    console.error('❌ Error in per-node stack analysis:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Generate SOW using LangSmith nexa-push-tosow prompt
 */
export async function generateSOWWithLangSmith(
  request: SOWGenerationRequest,
  organizationId?: string
): Promise<SOWGenerationResponse> {
  try {
    console.log('📋 Starting SOW generation with LangSmith prompt...')
    console.log(`   - Content length: ${request.solutioningData.length} characters`)
    
    // Pull the prompt from LangSmith hub
    console.log('📥 Pulling nexa-push-tosow prompt from LangSmith...')
    const promptTemplate = await hub.pull('nexa-push-tosow', {
      includeModel: true
    })
    console.log('✅ Successfully pulled SOW generation prompt from LangSmith')

    // Fetch organization preferences
    const prefs = organizationId 
      ? await getPreferencesForPrompts(organizationId)
      : { generalApproach: '', pushing: { solutioningToSOW: '' } }

    // Invoke the prompt with the solutioning data + preferences
    const result = await promptTemplate.invoke({
      SOLUTIONING_DATA_WILL_BE_INSERTED_HERE: request.solutioningData,
      general_approach: prefs.generalApproach || '',
      solutioning_to_sow_preferences: prefs.pushing?.solutioningToSOW || ''
    })

    // Extract the JSON content from the result
    let sowData: any
    if (typeof result === 'string') {
      // If it's a string, try to parse it as JSON
      sowData = JSON.parse(result)
    } else if (result && typeof result === 'object' && 'content' in result) {
      // If it's an AIMessage with content
      const content = (result as any).content
      sowData = JSON.parse(content)
    } else if (result && typeof result === 'object' && 'text' in result) {
      // Alternative text property
      const text = (result as any).text
      sowData = JSON.parse(text)
    } else {
      throw new Error('Unexpected response format from LangSmith')
    }

    // Validate the response structure
    if (!sowData || typeof sowData !== 'object') {
      throw new Error('Invalid JSON response from LangSmith')
    }

    // Validate required SOW structure
    const { basic, project, scope, clauses, timeline } = sowData
    if (!basic || !project || !scope || !clauses || !timeline) {
      throw new Error('Missing required SOW sections in LangSmith response')
    }

    // Add metadata fields
    sowData.uiState = { activeMainTab: 'basic' }
    sowData.lastSaved = new Date().toISOString()
    sowData.version = 1

    console.log('✅ SOW generation completed successfully')
    console.log(`   - Project: ${basic.title}`)
    console.log(`   - Deliverables: ${scope.deliverables?.length || 0}`)
    console.log(`   - Timeline phases: ${timeline.phases?.length || 0}`)

    return {
      success: true,
      sowData
    }

  } catch (error: unknown) {
    console.error('❌ Error in SOW generation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Generate LOE using LangSmith nexa-push-toloe prompt
 */
export async function generateLOEWithLangSmith(
  request: LOEGenerationRequest,
  organizationId?: string
): Promise<LOEGenerationResponse> {
  try {
    console.log('📊 Starting LOE generation with LangSmith prompt...')
    console.log(`   - Content length: ${request.sowData.length} characters`)
    
    // Pull the prompt from LangSmith hub
    console.log('📥 Pulling nexa-push-toloe prompt from LangSmith...')
    const promptTemplate = await hub.pull('nexa-push-toloe', {
      includeModel: true
    })
    console.log('✅ Successfully pulled LOE generation prompt from LangSmith')

    // Fetch organization preferences
    const prefs = organizationId 
      ? await getPreferencesForPrompts(organizationId)
      : { generalApproach: '', pushing: { sowToLOE: '' } }

    // Invoke the prompt with the SOW data + preferences
    const result = await promptTemplate.invoke({
      SOW_DATA_WILL_BE_INSERTED_HERE: request.sowData,
      general_approach: prefs.generalApproach || '',
      sow_to_loe_preferences: prefs.pushing?.sowToLOE || ''
    })

    // Extract the JSON content from the result
    let loeData: any
    if (typeof result === 'string') {
      // If it's a string, try to parse it as JSON
      loeData = JSON.parse(result)
    } else if (result && typeof result === 'object' && 'content' in result) {
      // If it's an AIMessage with content
      const content = (result as any).content
      loeData = JSON.parse(content)
    } else if (result && typeof result === 'object' && 'text' in result) {
      // Alternative text property
      const text = (result as any).text
      loeData = JSON.parse(text)
    } else {
      throw new Error('Unexpected response format from LangSmith')
    }

    // Validate the response structure
    if (!loeData || typeof loeData !== 'object') {
      throw new Error('Invalid JSON response from LangSmith')
    }

    // Validate required LOE structure
    const { info, workstreams, resources, assumptions } = loeData
    if (!info || !workstreams || !resources || !assumptions) {
      throw new Error('Missing required LOE sections in LangSmith response')
    }

    // Add metadata fields
    loeData.lastSaved = new Date().toISOString()
    loeData.version = 1

    console.log('✅ LOE generation completed successfully')
    console.log(`   - Project: ${info.project}`)
    console.log(`   - Workstreams: ${workstreams.workstreams?.length || 0}`)
    console.log(`   - Resources: ${resources.resources?.length || 0}`)
    console.log(`   - Total effort: ${resources.buffer?.weeks || 0} weeks buffer`)

    return {
      success: true,
      loeData
    }

  } catch (error: unknown) {
    console.error('❌ Error in LOE generation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
