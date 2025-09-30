/**
 * Organization Preferences Service
 * Handles CRUD operations for organization-level preferences that influence AI prompts
 */

import { prisma } from '@/lib/db'
import type { OrganizationPreference } from '@prisma/client'

export interface PreferenceData {
  mainLogo?: {
    data: string // Base64
    filename: string
    mimeType: string
    sizeBytes: number
  } | null
  secondLogo?: {
    data: string // Base64
    filename: string
    mimeType: string
    sizeBytes: number
  } | null
  generalApproach?: string
  structuring?: {
    diagnose?: string
    echo?: string
    traceback?: string
    solution?: string
  }
  visuals?: {
    ideation?: string
    planning?: string
    sketching?: string
  }
  solutioning?: {
    structure?: string
    analysis?: string
    stack?: string
    enhance?: string
    formatting?: string
  }
  pushing?: {
    structuringToVisuals?: string
    visualsToSolutioning?: string
    solutioningToSOW?: string
    sowToLOE?: string
  }
}

export interface ChangeHistoryEntry {
  timestamp: string
  userId: string
  field: string
  oldValue: any
  newValue: any
}

/**
 * Get organization preferences by organization ID
 * Creates default preferences if they don't exist
 */
export async function getOrganizationPreferences(
  organizationId: string
): Promise<OrganizationPreference> {
  let preferences = await prisma.organizationPreference.findUnique({
    where: { organizationId },
  })

  // Create default preferences if they don't exist
  if (!preferences) {
    preferences = await prisma.organizationPreference.create({
      data: {
        organizationId,
        structuringPreferences: {
          diagnose: '',
          echo: '',
          traceback: '',
          solution: '',
        },
        visualsPreferences: {
          ideation: '',
          planning: '',
          sketching: '',
        },
        solutioningPreferences: {
          structure: '',
          analysis: '',
          stack: '',
          enhance: '',
          formatting: '',
        },
        pushingPreferences: {
          structuringToVisuals: '',
          visualsToSolutioning: '',
          solutioningToSOW: '',
          sowToLOE: '',
        },
      },
    })
  }

  return preferences
}

/**
 * Update organization preferences
 * Automatically tracks changes in the audit trail
 */
export async function updateOrganizationPreferences(
  organizationId: string,
  userId: string,
  data: PreferenceData
): Promise<OrganizationPreference> {
  // Get existing preferences to track changes
  const existing = await getOrganizationPreferences(organizationId)
  const changeHistory = (existing.changeHistory as ChangeHistoryEntry[]) || []

  // Build update data
  const updateData: any = {
    updatedBy: userId,
  }

  // Handle main logo
  if (data.mainLogo !== undefined) {
    if (data.mainLogo === null) {
      updateData.mainLogo = null
      updateData.mainLogoFilename = null
      updateData.mainLogoMimeType = null
      updateData.mainLogoSizeBytes = null
      
      if (existing.mainLogo) {
        changeHistory.push({
          timestamp: new Date().toISOString(),
          userId,
          field: 'mainLogo',
          oldValue: 'present',
          newValue: null,
        })
      }
    } else {
      updateData.mainLogo = data.mainLogo.data
      updateData.mainLogoFilename = data.mainLogo.filename
      updateData.mainLogoMimeType = data.mainLogo.mimeType
      updateData.mainLogoSizeBytes = data.mainLogo.sizeBytes
      
      if (existing.mainLogo !== data.mainLogo.data) {
        changeHistory.push({
          timestamp: new Date().toISOString(),
          userId,
          field: 'mainLogo',
          oldValue: existing.mainLogo ? 'present' : null,
          newValue: 'updated',
        })
      }
    }
  }

  // Handle second logo
  if (data.secondLogo !== undefined) {
    if (data.secondLogo === null) {
      updateData.secondLogo = null
      updateData.secondLogoFilename = null
      updateData.secondLogoMimeType = null
      updateData.secondLogoSizeBytes = null
      
      if (existing.secondLogo) {
        changeHistory.push({
          timestamp: new Date().toISOString(),
          userId,
          field: 'secondLogo',
          oldValue: 'present',
          newValue: null,
        })
      }
    } else {
      updateData.secondLogo = data.secondLogo.data
      updateData.secondLogoFilename = data.secondLogo.filename
      updateData.secondLogoMimeType = data.secondLogo.mimeType
      updateData.secondLogoSizeBytes = data.secondLogo.sizeBytes
      
      if (existing.secondLogo !== data.secondLogo.data) {
        changeHistory.push({
          timestamp: new Date().toISOString(),
          userId,
          field: 'secondLogo',
          oldValue: existing.secondLogo ? 'present' : null,
          newValue: 'updated',
        })
      }
    }
  }

  // Handle general approach
  if (data.generalApproach !== undefined) {
    updateData.generalApproach = data.generalApproach
    
    if (existing.generalApproach !== data.generalApproach) {
      changeHistory.push({
        timestamp: new Date().toISOString(),
        userId,
        field: 'generalApproach',
        oldValue: existing.generalApproach,
        newValue: data.generalApproach,
      })
    }
  }

  // Handle structuring preferences
  if (data.structuring !== undefined) {
    const existingStructuring = existing.structuringPreferences as any
    const newStructuring = { ...existingStructuring, ...data.structuring }
    updateData.structuringPreferences = newStructuring
    
    if (JSON.stringify(existingStructuring) !== JSON.stringify(newStructuring)) {
      changeHistory.push({
        timestamp: new Date().toISOString(),
        userId,
        field: 'structuringPreferences',
        oldValue: existingStructuring,
        newValue: newStructuring,
      })
    }
  }

  // Handle visuals preferences
  if (data.visuals !== undefined) {
    const existingVisuals = existing.visualsPreferences as any
    const newVisuals = { ...existingVisuals, ...data.visuals }
    updateData.visualsPreferences = newVisuals
    
    if (JSON.stringify(existingVisuals) !== JSON.stringify(newVisuals)) {
      changeHistory.push({
        timestamp: new Date().toISOString(),
        userId,
        field: 'visualsPreferences',
        oldValue: existingVisuals,
        newValue: newVisuals,
      })
    }
  }

  // Handle solutioning preferences
  if (data.solutioning !== undefined) {
    const existingSolutioning = existing.solutioningPreferences as any
    const newSolutioning = { ...existingSolutioning, ...data.solutioning }
    updateData.solutioningPreferences = newSolutioning
    
    if (JSON.stringify(existingSolutioning) !== JSON.stringify(newSolutioning)) {
      changeHistory.push({
        timestamp: new Date().toISOString(),
        userId,
        field: 'solutioningPreferences',
        oldValue: existingSolutioning,
        newValue: newSolutioning,
      })
    }
  }

  // Handle pushing preferences
  if (data.pushing !== undefined) {
    const existingPushing = existing.pushingPreferences as any
    const newPushing = { ...existingPushing, ...data.pushing }
    updateData.pushingPreferences = newPushing
    
    if (JSON.stringify(existingPushing) !== JSON.stringify(newPushing)) {
      changeHistory.push({
        timestamp: new Date().toISOString(),
        userId,
        field: 'pushingPreferences',
        oldValue: existingPushing,
        newValue: newPushing,
      })
    }
  }

  // Update change history
  updateData.changeHistory = changeHistory

  // Perform update
  const updated = await prisma.organizationPreference.update({
    where: { organizationId },
    data: updateData,
  })

  return updated
}

/**
 * Get preferences formatted for AI prompt injection
 */
export async function getPreferencesForPrompts(
  organizationId: string
): Promise<{
  generalApproach: string
  structuring: Record<string, string>
  visuals: Record<string, string>
  solutioning: Record<string, string>
  pushing: Record<string, string>
}> {
  const prefs = await getOrganizationPreferences(organizationId)

  return {
    generalApproach: prefs.generalApproach || '',
    structuring: prefs.structuringPreferences as Record<string, string>,
    visuals: prefs.visualsPreferences as Record<string, string>,
    solutioning: prefs.solutioningPreferences as Record<string, string>,
    pushing: prefs.pushingPreferences as Record<string, string>,
  }
}

/**
 * Validate image size constraints
 */
export function validateImageSize(sizeBytes: number): boolean {
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  return sizeBytes <= MAX_SIZE
}

/**
 * Validate MIME type
 */
export function validateImageMimeType(mimeType: string): boolean {
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
  return ALLOWED_TYPES.includes(mimeType)
}

/**
 * Validate general approach length
 */
export function validateGeneralApproachLength(text: string): boolean {
  const MAX_LENGTH = 5000
  return text.length <= MAX_LENGTH
}
