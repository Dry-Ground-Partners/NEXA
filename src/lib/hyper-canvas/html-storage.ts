import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * HTML Storage Service for Hyper-Canvas
 * 
 * Manages HTML template storage separately from conversation history
 * to optimize token usage. Stores only the LATEST HTML per thread.
 */
export class HTMLStorageService {
  
  /**
   * Store latest HTML for a thread (replaces previous version)
   * 
   * @param threadId - Unique thread identifier
   * @param sessionId - Session UUID
   * @param htmlContent - Complete HTML document
   * @param modificationSummary - Optional description of what changed
   */
  async storeLatestHTML(
    threadId: string,
    sessionId: string,
    htmlContent: string,
    modificationSummary?: string
  ): Promise<void> {
    try {
      console.log(`📄 Storing HTML for thread: ${threadId}`)
      console.log(`   Session: ${sessionId}`)
      console.log(`   HTML size: ${htmlContent.length} characters`)
      console.log(`   Summary: ${modificationSummary || 'No summary provided'}`)
      
      // Get current session data
      const session = await prisma.$queryRaw<Array<{ threads: any }>>`
        SELECT threads FROM ai_architecture_sessions
        WHERE uuid = ${sessionId}::uuid
      `
      
      if (!session || session.length === 0) {
        throw new Error(`Session not found: ${sessionId}`)
      }
      
      // Parse existing threads array
      let threads = session[0].threads || []
      if (typeof threads === 'string') {
        threads = JSON.parse(threads)
      }
      
      // Find existing thread or create new entry
      const threadIndex = threads.findIndex((t: any) => t.thread_id === threadId)
      
      const threadData = {
        thread_id: threadId,
        name: threads[threadIndex]?.name || 'Editing conversation',
        created_at: threads[threadIndex]?.created_at || new Date().toISOString(),
        last_active: new Date().toISOString(),
        current_html: htmlContent,
        html_version: (threads[threadIndex]?.html_version || 0) + 1,
        metadata: {
          last_modification: modificationSummary || 'Document updated',
          html_size: htmlContent.length,
          timestamp: new Date().toISOString()
        }
      }
      
      if (threadIndex >= 0) {
        // Update existing thread
        threads[threadIndex] = threadData
      } else {
        // Add new thread
        threads.push(threadData)
      }
      
      // Update session with new threads data
      await prisma.$executeRaw`
        UPDATE ai_architecture_sessions
        SET threads = ${JSON.stringify(threads)}::jsonb
        WHERE uuid = ${sessionId}::uuid
      `
      
      console.log(`✅ HTML stored successfully`)
      console.log(`   Version: ${threadData.html_version}`)
      console.log(`   Size: ${htmlContent.length} characters`)
      
    } catch (error) {
      console.error('❌ Error storing HTML:', error)
      throw new Error(`Failed to store HTML: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Get latest HTML for a thread
   * 
   * @param threadId - Unique thread identifier
   * @param sessionId - Session UUID
   * @returns HTML content or null if not found
   */
  async getLatestHTML(
    threadId: string,
    sessionId: string
  ): Promise<string | null> {
    try {
      console.log(`📄 Retrieving HTML for thread: ${threadId}`)
      
      const session = await prisma.$queryRaw<Array<{ threads: any }>>`
        SELECT threads FROM ai_architecture_sessions
        WHERE uuid = ${sessionId}::uuid
      `
      
      if (!session || session.length === 0) {
        console.log(`⚠️ Session not found: ${sessionId}`)
        return null
      }
      
      // Parse threads array
      let threads = session[0].threads
      if (!threads) {
        console.log(`⚠️ No threads found in session`)
        return null
      }
      
      if (typeof threads === 'string') {
        threads = JSON.parse(threads)
      }
      
      // Find thread
      const thread = threads.find((t: any) => t.thread_id === threadId)
      
      if (!thread || !thread.current_html) {
        console.log(`⚠️ HTML not found for thread: ${threadId}`)
        return null
      }
      
      console.log(`✅ HTML retrieved successfully`)
      console.log(`   Version: ${thread.html_version || 'unknown'}`)
      console.log(`   Size: ${thread.current_html.length} characters`)
      
      return thread.current_html
      
    } catch (error) {
      console.error('❌ Error retrieving HTML:', error)
      return null
    }
  }
  
  /**
   * Check if HTML exists for a thread
   * 
   * @param threadId - Unique thread identifier
   * @param sessionId - Session UUID
   * @returns true if HTML exists and is not empty
   */
  async hasHTML(
    threadId: string,
    sessionId: string
  ): Promise<boolean> {
    try {
      const html = await this.getLatestHTML(threadId, sessionId)
      return html !== null && html.length > 0
    } catch (error) {
      console.error('❌ Error checking HTML existence:', error)
      return false
    }
  }
  
  /**
   * Get HTML metadata without retrieving full HTML content
   * 
   * @param threadId - Unique thread identifier
   * @param sessionId - Session UUID
   * @returns Metadata object or null if not found
   */
  async getHTMLMetadata(
    threadId: string,
    sessionId: string
  ): Promise<{
    thread_id: string
    version: number
    last_modified: string
    html_size: number
    summary?: string
  } | null> {
    try {
      console.log(`📊 Retrieving HTML metadata for thread: ${threadId}`)
      
      const session = await prisma.$queryRaw<Array<{ threads: any }>>`
        SELECT threads FROM ai_architecture_sessions
        WHERE uuid = ${sessionId}::uuid
      `
      
      if (!session || session.length === 0) {
        return null
      }
      
      let threads = session[0].threads
      if (!threads) {
        return null
      }
      
      if (typeof threads === 'string') {
        threads = JSON.parse(threads)
      }
      
      const thread = threads.find((t: any) => t.thread_id === threadId)
      
      if (!thread) {
        return null
      }
      
      const metadata = {
        thread_id: thread.thread_id,
        version: thread.html_version || 0,
        last_modified: thread.last_active || thread.created_at,
        html_size: thread.current_html?.length || 0,
        summary: thread.metadata?.last_modification
      }
      
      console.log(`✅ Metadata retrieved:`, metadata)
      
      return metadata
      
    } catch (error) {
      console.error('❌ Error retrieving metadata:', error)
      return null
    }
  }
  
  /**
   * Get all threads for a session
   * 
   * @param sessionId - Session UUID
   * @returns Array of thread metadata (without full HTML content)
   */
  async getAllThreads(sessionId: string): Promise<Array<{
    thread_id: string
    name: string
    version: number
    last_active: string
    html_size: number
  }>> {
    try {
      console.log(`📋 Retrieving all threads for session: ${sessionId}`)
      
      const session = await prisma.$queryRaw<Array<{ threads: any }>>`
        SELECT threads FROM ai_architecture_sessions
        WHERE uuid = ${sessionId}::uuid
      `
      
      if (!session || session.length === 0) {
        return []
      }
      
      let threads = session[0].threads
      if (!threads) {
        return []
      }
      
      if (typeof threads === 'string') {
        threads = JSON.parse(threads)
      }
      
      // Map to metadata only (exclude full HTML)
      const threadList = threads.map((thread: any) => ({
        thread_id: thread.thread_id,
        name: thread.name || 'Unnamed thread',
        version: thread.html_version || 0,
        last_active: thread.last_active || thread.created_at,
        html_size: thread.current_html?.length || 0
      }))
      
      console.log(`✅ Found ${threadList.length} threads`)
      
      return threadList
      
    } catch (error) {
      console.error('❌ Error retrieving threads:', error)
      return []
    }
  }
  
  /**
   * Delete HTML for a specific thread
   * 
   * @param threadId - Unique thread identifier
   * @param sessionId - Session UUID
   */
  async deleteHTML(
    threadId: string,
    sessionId: string
  ): Promise<void> {
    try {
      console.log(`🗑️ Deleting HTML for thread: ${threadId}`)
      
      const session = await prisma.$queryRaw<Array<{ threads: any }>>`
        SELECT threads FROM ai_architecture_sessions
        WHERE uuid = ${sessionId}::uuid
      `
      
      if (!session || session.length === 0) {
        throw new Error(`Session not found: ${sessionId}`)
      }
      
      let threads = session[0].threads || []
      if (typeof threads === 'string') {
        threads = JSON.parse(threads)
      }
      
      // Filter out the thread
      threads = threads.filter((t: any) => t.thread_id !== threadId)
      
      // Update session
      await prisma.$executeRaw`
        UPDATE ai_architecture_sessions
        SET threads = ${JSON.stringify(threads)}::jsonb
        WHERE uuid = ${sessionId}::uuid
      `
      
      console.log(`✅ HTML deleted successfully`)
      
    } catch (error) {
      console.error('❌ Error deleting HTML:', error)
      throw new Error(`Failed to delete HTML: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Update thread name
   * 
   * @param threadId - Unique thread identifier
   * @param sessionId - Session UUID
   * @param name - New thread name
   */
  async updateThreadName(
    threadId: string,
    sessionId: string,
    name: string
  ): Promise<void> {
    try {
      console.log(`✏️ Updating thread name: ${threadId} -> ${name}`)
      
      const session = await prisma.$queryRaw<Array<{ threads: any }>>`
        SELECT threads FROM ai_architecture_sessions
        WHERE uuid = ${sessionId}::uuid
      `
      
      if (!session || session.length === 0) {
        throw new Error(`Session not found: ${sessionId}`)
      }
      
      let threads = session[0].threads || []
      if (typeof threads === 'string') {
        threads = JSON.parse(threads)
      }
      
      const threadIndex = threads.findIndex((t: any) => t.thread_id === threadId)
      
      if (threadIndex < 0) {
        throw new Error(`Thread not found: ${threadId}`)
      }
      
      threads[threadIndex].name = name
      
      await prisma.$executeRaw`
        UPDATE ai_architecture_sessions
        SET threads = ${JSON.stringify(threads)}::jsonb
        WHERE uuid = ${sessionId}::uuid
      `
      
      console.log(`✅ Thread name updated successfully`)
      
    } catch (error) {
      console.error('❌ Error updating thread name:', error)
      throw new Error(`Failed to update thread name: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const htmlStorage = new HTMLStorageService()
