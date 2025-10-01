/**
 * Image utility functions for Backdrop preferences
 * Handles file to Base64 conversion and validation
 */

export interface ImageData {
  data: string // Base64 string with data URI prefix
  filename: string
  mimeType: string
  sizeBytes: number
}

/**
 * Convert a File object to Base64 data URI
 */
export async function fileToBase64(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      const result = reader.result as string
      resolve({
        data: result, // Already includes "data:image/png;base64,..." prefix
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      })
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
  
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    }
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: PNG, JPEG, WebP, SVG`,
    }
  }
  
  return { valid: true }
}

/**
 * Create a preview URL from a File object
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Revoke a preview URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}





