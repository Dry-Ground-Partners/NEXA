import { PrismaClient } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'
import type { StructuringSessionData, VisualsSessionData, SolutioningSessionData, SOWSessionData, LOESessionData, SessionResponse, SessionSummary } from '@/lib/sessions'

const prisma = new PrismaClient()

/**
 * Create a new structuring session (SERVER-SIDE ONLY)
 */
export async function createStructuringSession(
  data: StructuringSessionData
): Promise<SessionResponse | null> {
  try {
    const user = await getCurrentUser()
    console.log('🔍 Debug - User object:', JSON.stringify(user, null, 2))
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    if (!user.organizationMemberships || user.organizationMemberships.length === 0) {
      console.log('❌ Debug - No organization memberships found')
      throw new Error('No organization memberships found')
    }

    const organizationId = user.organizationMemberships[0].organization.id
    console.log('✅ Debug - Using organization:', organizationId)

    const session = await prisma.aIArchitectureSession.create({
      data: {
        userId: user.id,
        organizationId: organizationId,
        title: data.basic.title || null,
        client: data.basic.client || null,
        sessionType: 'structuring',
        diagramTextsJson: data as any, // Per user request: save to diagram_texts_json
        isTemplate: false,
        tags: []
      }
    })

    return {
      id: session.id.toString(),
      uuid: session.uuid,
      title: session.title,
      client: session.client,
      sessionType: session.sessionType,
      isTemplate: session.isTemplate,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      data: session.diagramTextsJson
    }
  } catch (error) {
    console.error('Error creating structuring session:', error)
    return null
  }
}

/**
 * Update an existing structuring session (SERVER-SIDE ONLY)
 */
export async function updateStructuringSession(
  sessionId: string,
  data: StructuringSessionData
): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Update version number
    const updatedData = {
      ...data,
      version: (data.version || 0) + 1,
      lastSaved: new Date().toISOString()
    }

    await prisma.aIArchitectureSession.update({
      where: {
        uuid: sessionId,
        userId: user.id // Ensure user can only update their own sessions
      },
      data: {
        title: updatedData.basic.title || null,
        client: updatedData.basic.client || null,
        diagramTextsJson: updatedData as any,
        updatedAt: new Date()
      }
    })

    return true
  } catch (error) {
    console.error('Error updating structuring session:', error)
    return false
  }
}

/**
 * Create a new visuals session (SERVER-SIDE ONLY)
 */
export async function createVisualsSession(
  data: VisualsSessionData
): Promise<SessionResponse | null> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    if (!user.organizationMemberships || user.organizationMemberships.length === 0) {
      console.log('❌ Debug - No organization memberships found')
      throw new Error('No organization memberships found')
    }

    const organizationId = user.organizationMemberships[0].organization.id
    console.log('✅ Debug - Using organization:', organizationId)

    const session = await prisma.aIArchitectureSession.create({
      data: {
        userId: user.id,
        organizationId: organizationId,
        title: data.basic.title || null,
        client: data.basic.client || null,
        sessionType: 'visuals',
        visualAssetsJson: data as any, // Save to visual_assets_json column
        isTemplate: false,
        tags: []
      }
    })

    return {
      id: session.id.toString(),
      uuid: session.uuid,
      title: session.title,
      client: session.client,
      sessionType: session.sessionType,
      isTemplate: session.isTemplate,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      data: session.visualAssetsJson
    }
  } catch (error) {
    console.error('Error creating visuals session:', error)
    return null
  }
}

/**
 * Update an existing visuals session (SERVER-SIDE ONLY)
 */
export async function updateVisualsSession(
  sessionId: string,
  data: VisualsSessionData
): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Update version number
    const updatedData = {
      ...data,
      version: (data.version || 0) + 1,
      lastSaved: new Date().toISOString()
    }

    await prisma.aIArchitectureSession.update({
      where: {
        uuid: sessionId,
        userId: user.id // Ensure user can only update their own sessions
      },
      data: {
        title: updatedData.basic.title || null,
        client: updatedData.basic.client || null,
        visualAssetsJson: updatedData as any, // Save to visual_assets_json column
        updatedAt: new Date()
      }
    })

    return true
  } catch (error) {
    console.error('Error updating visuals session:', error)
    return false
  }
}

/**
 * Get a structuring session by UUID (SERVER-SIDE ONLY)
 */
export async function getStructuringSession(
  sessionId: string
): Promise<SessionResponse | null> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const session = await prisma.aIArchitectureSession.findFirst({
      where: {
        uuid: sessionId,
        userId: user.id,
        deletedAt: null
      }
    })

    if (!session) {
      return null
    }

    return {
      id: session.id.toString(),
      uuid: session.uuid,
      title: session.title,
      client: session.client,
      sessionType: session.sessionType,
      isTemplate: session.isTemplate,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      data: session.diagramTextsJson
    }
  } catch (error) {
    console.error('Error getting structuring session:', error)
    return null
  }
}

/**
 * Delete a structuring session (soft delete) (SERVER-SIDE ONLY)
 */
export async function deleteStructuringSession(
  sessionId: string
): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    await prisma.aIArchitectureSession.update({
      where: {
        uuid: sessionId,
        userId: user.id
      },
      data: {
        deletedAt: new Date()
      }
    })

    return true
  } catch (error) {
    console.error('Error deleting structuring session:', error)
    return false
  }
}

/**
 * Get user's sessions (all types) with content availability info (SERVER-SIDE ONLY)
 */
export async function getUserStructuringSessions(): Promise<SessionSummary[]> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return []
    }

    const sessions = await prisma.aIArchitectureSession.findMany({
      where: {
        userId: user.id,
        deletedAt: null
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        uuid: true,
        title: true,
        client: true,
        sessionType: true,
        createdAt: true,
        updatedAt: true,
        diagramTextsJson: true,    // For Structure tag
        visualAssetsJson: true,    // For Visuals tag  
        sessionObjects: true,      // For Solution tag
        sowObjects: true,          // For Work tag
        loeObjects: true           // For Effort tag
      }
    })

    return sessions.map(session => {
      const contentFlags = {
        structure: isValidContent(session.diagramTextsJson),
        visuals: isValidContent(session.visualAssetsJson),
        solution: isValidContent(session.sessionObjects),
        work: isValidContent(session.sowObjects),
        effort: isValidContent(session.loeObjects)
      }
      
      console.log(`🗄️ DB: Session "${session.title || 'Untitled'}" (${session.sessionType}) content availability:`, contentFlags)
      
      return {
        id: session.id.toString(),
        uuid: session.uuid,
        title: session.title,
        client: session.client,
        sessionType: session.sessionType,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        // Add content availability flags
        availableContent: contentFlags
      }
    })
  } catch (error) {
    console.error('Error getting user sessions:', error)
    return []
  }
}

/**
 * Helper function to check if content is valid (not null and not empty object)
 */
function isValidContent(content: any): boolean {
  if (content === null || content === undefined) {
    return false
  }
  
  // Check if it's an empty object
  if (typeof content === 'object' && Object.keys(content).length === 0) {
    return false
  }
  
  // For arrays, check if they have content
  if (Array.isArray(content) && content.length === 0) {
    return false
  }
  
  // For strings, check if they're not empty
  if (typeof content === 'string' && content.trim().length === 0) {
    return false
  }
  
  return true
}

// Clean up database connections
export async function disconnectSessionDatabase() {
  await prisma.$disconnect()
}

/**
 * Create a new solutioning session (SERVER-SIDE ONLY)
 */
export async function createSolutioningSession(
  data: SolutioningSessionData
): Promise<SessionResponse | null> {
  try {
    const user = await getCurrentUser()
    console.log('🔍 Debug - User object:', JSON.stringify(user, null, 2))
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    if (!user.organizationMemberships || user.organizationMemberships.length === 0) {
      console.log('❌ Debug - No organization memberships found')
      throw new Error('No organization memberships found')
    }

    const organizationId = user.organizationMemberships[0].organization.id
    console.log('✅ Debug - Using organization:', organizationId)

    const session = await prisma.aIArchitectureSession.create({
      data: {
        userId: user.id,
        organizationId: organizationId,
        title: data.basic.title || null,
        client: data.basic.recipient || null,
        sessionType: 'solutioning',
        sessionObjects: data as any, // Save solutioning data to session_objects column
        isTemplate: false,
        tags: []
      }
    })

    return {
      id: session.id.toString(),
      uuid: session.uuid,
      title: session.title,
      client: session.client,
      sessionType: session.sessionType,
      isTemplate: session.isTemplate,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      data: session.sessionObjects as any
    }
  } catch (error) {
    console.error('💥 createSolutioningSession error:', error)
    return null
  }
}

/**
 * Update an existing solutioning session (SERVER-SIDE ONLY)
 */
export async function updateSolutioningSession(
  uuid: string, 
  data: SolutioningSessionData
): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Increment version for conflict detection
    const updatedData = {
      ...data,
      version: (data.version || 0) + 1,
      lastSaved: new Date().toISOString()
    }

    await prisma.aIArchitectureSession.update({
      where: { 
        uuid: uuid,
        userId: user.id // Ensure user can only update their own sessions
      },
      data: {
        title: updatedData.basic.title || null,
        client: updatedData.basic.recipient || null,
        sessionObjects: updatedData as any,
        updatedAt: new Date()
      }
    })

    console.log('✅ updateSolutioningSession: Session updated successfully')
    return true
  } catch (error) {
    console.error('💥 updateSolutioningSession error:', error)
    return false
  }
}

/**
 * Create a new SOW session (SERVER-SIDE ONLY)
 */
export async function createSOWSession(
  data: SOWSessionData
): Promise<SessionResponse | null> {
  try {
    const user = await getCurrentUser()
    console.log('🔍 Debug - User object:', JSON.stringify(user, null, 2))
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    if (!user.organizationMemberships || user.organizationMemberships.length === 0) {
      console.log('❌ Debug - No organization memberships found')
      throw new Error('No organization memberships found')
    }

    const organizationId = user.organizationMemberships[0].organization.id
    console.log('✅ Debug - Using organization:', organizationId)

    const session = await prisma.aIArchitectureSession.create({
      data: {
        userId: user.id,
        organizationId: organizationId,
        title: data.basic.title || null,
        client: data.basic.client || null,
        sessionType: 'sow',
        sowObjects: data as any, // Save SOW data to sow_objects column
        isTemplate: false,
        tags: []
      }
    })

    return {
      id: session.id.toString(),
      uuid: session.uuid,
      title: session.title,
      client: session.client,
      sessionType: session.sessionType,
      isTemplate: session.isTemplate,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      data: session.sowObjects as any
    }
  } catch (error) {
    console.error('💥 createSOWSession error:', error)
    return null
  }
}

/**
 * Update an existing SOW session (SERVER-SIDE ONLY)
 */
export async function updateSOWSession(
  uuid: string, 
  data: SOWSessionData
): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Increment version for conflict detection
    const updatedData = {
      ...data,
      version: (data.version || 0) + 1,
      lastSaved: new Date().toISOString()
    }

    await prisma.aIArchitectureSession.update({
      where: { 
        uuid: uuid,
        userId: user.id // Ensure user can only update their own sessions
      },
      data: {
        title: updatedData.basic.title || null,
        client: updatedData.basic.client || null,
        sowObjects: updatedData as any, // Save to sow_objects column
        updatedAt: new Date()
      }
    })

    console.log('✅ updateSOWSession: Session updated successfully')
    return true
  } catch (error) {
    console.error('💥 updateSOWSession error:', error)
    return false
  }
}

/**
 * Create a new LOE session (SERVER-SIDE ONLY)
 */
export async function createLOESession(
  data: LOESessionData
): Promise<SessionResponse | null> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    if (!user.organizationMemberships || user.organizationMemberships.length === 0) {
      throw new Error('No organization memberships found')
    }

    const organizationId = user.organizationMemberships[0].organization.id

    const session = await prisma.aIArchitectureSession.create({
      data: {
        userId: user.id,
        organizationId: organizationId,
        title: data.info.project || null,
        client: data.info.client || null,
        sessionType: 'loe',
        loeObjects: data as any, // Save LOE data to loe_objects column
        isTemplate: false,
        tags: []
      }
    })

    console.log('✅ createLOESession: Session created successfully:', session.uuid)
    return {
      id: session.id.toString(),
      uuid: session.uuid,
      title: session.title,
      client: session.client,
      sessionType: session.sessionType,
      isTemplate: session.isTemplate,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      data: session.loeObjects
    }
  } catch (error) {
    console.error('💥 createLOESession error:', error)
    return null
  }
}

/**
 * Update an existing LOE session (SERVER-SIDE ONLY)
 */
export async function updateLOESession(
  uuid: string,
  data: LOESessionData
): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Update version number
    const updatedData = {
      ...data,
      version: (data.version || 0) + 1,
      lastSaved: new Date().toISOString()
    }

    await prisma.aIArchitectureSession.update({
      where: {
        uuid: uuid,
        userId: user.id
      },
      data: {
        title: updatedData.info.project || null,
        client: updatedData.info.client || null,
        loeObjects: updatedData as any, // Save to loe_objects column
        updatedAt: new Date()
      }
    })

    console.log('✅ updateLOESession: Session updated successfully')
    return true
  } catch (error) {
    console.error('💥 updateLOESession error:', error)
    return false
  }
}

/**
 * Get a session by UUID - returns the most appropriate data type available
 * Prioritizes visuals data if available, falls back to structuring data
 */
export async function getSession(
  sessionId: string
): Promise<SessionResponse | null> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const session = await prisma.aIArchitectureSession.findFirst({
      where: {
        uuid: sessionId,
        userId: user.id,
        deletedAt: null
      }
    })

    if (!session) {
      return null
    }

    // Determine which data to return based on availability
    // For visuals pages, prioritize visual_assets_json if it exists
    let data = null
    let sessionType = 'structuring' // default

    if (isValidContent(session.visualAssetsJson)) {
      data = session.visualAssetsJson
      sessionType = 'visuals'
      console.log('📊 API: Returning visuals data')
    } else if (isValidContent(session.sessionObjects)) {
      data = session.sessionObjects  
      sessionType = 'solutioning'
      console.log('📊 API: Returning solutioning data')
    } else if (isValidContent(session.sowObjects)) {
      data = session.sowObjects
      sessionType = 'sow'
      console.log('📊 API: Returning SOW data')
    } else if (isValidContent(session.loeObjects)) {
      data = session.loeObjects
      sessionType = 'loe'
      console.log('📊 API: Returning LOE data')
    } else if (isValidContent(session.diagramTextsJson)) {
      data = session.diagramTextsJson
      sessionType = 'structuring'
      console.log('📊 API: Returning structuring data')
    }

    return {
      id: session.id.toString(),
      uuid: session.uuid,
      title: session.title,
      client: session.client,
      sessionType: sessionType,
      isTemplate: session.isTemplate,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      data: data
    }
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * Add visuals data to an existing session (for structuring → visuals workflow)
 */
export async function updateSessionWithVisuals(
  sessionId: string,
  visualsData: VisualsSessionData
): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    console.log(`🎨 Adding visuals data to session: ${sessionId}`)
    console.log(`   - Diagram sets: ${visualsData.diagramSets?.length || 0}`)
    console.log(`   - Basic info: ${visualsData.basic?.title || 'N/A'}`)

    await prisma.aIArchitectureSession.update({
      where: {
        uuid: sessionId,
        userId: user.id
      },
      data: {
        visualAssetsJson: visualsData as any, // Add to visual_assets_json column
        updatedAt: new Date()
      }
    })

    console.log('✅ updateSessionWithVisuals: Successfully added visuals to session')
    return true
  } catch (error) {
    console.error('💥 updateSessionWithVisuals error:', error)
    return false
  }
}
