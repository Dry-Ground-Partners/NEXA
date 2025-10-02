import { NextRequest, NextResponse } from "next/server"
import { getErrorMessage } from '@/lib/utils'
import * as hub from "langchain/hub"
import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate } from "@langchain/core/prompts"

export async function POST(request: NextRequest) {
  try {
    console.log('🎨 Auto-Format: Starting formatting process...')
    
    const body = await request.json()
    const { title, steps, approach } = body

    if (!title && !steps && !approach) {
      return NextResponse.json({
        success: false,
        error: 'At least one field (title, steps, or approach) is required'
      }, { status: 400 })
    }

    console.log('📝 Auto-Format: Input data received:', {
      title: title ? `"${title.substring(0, 50)}..."` : 'empty',
      steps: steps ? `"${steps.substring(0, 50)}..."` : 'empty', 
      approach: approach ? `"${approach.substring(0, 50)}..."` : 'empty'
    })

    // Initialize the language model
    const model = new ChatOpenAI({
      temperature: 0.3,
      modelName: "gpt-4o-mini"
    })

    let prompt
    let chain

    try {
      // Try to pull the formatting prompt from LangChain Hub
      console.log('🔗 Auto-Format: Pulling prompt from LangChain Hub...')
      const hubPrompt = await hub.pull("nexa-solutioning-formatting")
      
      // Check if we can use the hub prompt directly
      if (hubPrompt && typeof hubPrompt.pipe === 'function') {
        chain = hubPrompt.pipe(model)
      } else {
        throw new Error('Hub prompt format not compatible')
      }
    } catch (hubError) {
      console.log('⚠️ Auto-Format: Hub prompt failed, using fallback prompt')
      
      // Fallback to manual prompt template
      prompt = ChatPromptTemplate.fromTemplate(`
Please enhance the following structured content by adding appropriate HTML formatting tags to make it more visually appealing and professional. 

IMPORTANT: Only add HTML formatting tags (like <strong>, <em>, <br>, <ul>, <li>, etc.) to enhance the presentation. Do NOT change the actual text content, meaning, or structure.

TITLE: {title}

STEPS: {steps}

APPROACH: {approach}

Please return the enhanced content in JSON format with the following structure:
{{
    "title": "Enhanced title with HTML formatting",
    "steps": "Enhanced steps with HTML formatting", 
    "approach": "Enhanced approach with HTML formatting"
}}

Remember: Only add HTML formatting tags, do not change the actual text content.
      `)
      
      chain = prompt.pipe(model)
    }

    console.log('🤖 Auto-Format: Invoking formatting chain...')
    
    // Invoke the chain with the input data
    const result = await chain.invoke({
      title: title || '',
      steps: steps || '',
      approach: approach || ''
    })

    console.log('✅ Auto-Format: Raw AI response received')

    // Extract the content from the result
    const content = result.content || result
    const contentString = typeof content === 'string' ? content : String(content)

    // Try to parse JSON response
    let formattedContent
    try {
      // Clean the content if it has markdown code blocks
      const cleanContent = contentString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      formattedContent = JSON.parse(cleanContent)
      
      console.log('✅ Auto-Format: Successfully parsed JSON response')
    } catch (parseError) {
      console.error('❌ Auto-Format: Failed to parse JSON, using fallback')
      
      // Fallback: return original content with basic formatting
      formattedContent = {
        title: title || '',
        steps: steps || '',
        approach: approach || ''
      }
    }

    console.log('🎨 Auto-Format: Formatting completed successfully')

    return NextResponse.json({
      success: true,
      formatted: formattedContent
    })

  } catch (error) {
    console.error('❌ Auto-Format: Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? getErrorMessage(error) : 'Auto-formatting failed'
    }, { status: 500 })
  }
}
