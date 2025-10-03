'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Save, AlertCircle } from 'lucide-react'

interface DrawioEditorProps {
  /** Current diagram XML (from sketch field) */
  diagramXML: string | null
  /** Callback when diagram is saved with XML and PNG */
  onSave: (xml: string, png: string) => void
  /** Callback when editor is closed */
  onClose: () => void
  /** Whether the modal is open */
  isOpen: boolean
}

const BLANK_DIAGRAM_XML = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>'
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export function DrawioEditor({ 
  diagramXML, 
  onSave, 
  onClose, 
  isOpen 
}: DrawioEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentXML, setCurrentXML] = useState<string | null>(diagramXML)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get draw.io URL from environment
  // Note: Using embed.diagrams.net specifically for embedding (bypasses some CSP restrictions)
  const DRAWIO_URL = process.env.NEXT_PUBLIC_DRAWIO_URL || 'https://embed.diagrams.net'
  const embedUrl = `${DRAWIO_URL}/?embed=1&proto=json&spin=1&libraries=1&noSaveBtn=1&ui=atlas`

  // Listen for messages from draw.io
  useEffect(() => {
    if (!isOpen) return

    const handleMessage = (event: MessageEvent) => {
      // Security: validate origin (accept both diagrams.net and custom domain)
      const validOrigins = ['diagrams.net', 'draw.io']
      const isValidOrigin = validOrigins.some(origin => event.origin.includes(origin)) || 
                           event.origin === DRAWIO_URL

      if (!isValidOrigin) {
        console.warn('⚠️ Ignoring message from unknown origin:', event.origin)
        return
      }

      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data

        console.log('📨 Draw.io message:', message.event || message.action)

        switch (message.event) {
          case 'init':
            console.log('✅ Draw.io initialized')
            setIsInitialized(true)
            setError(null)
            // Will trigger loadDiagram via useEffect
            break

          case 'autosave':
            console.log('💾 Autosave triggered')
            setCurrentXML(message.xml)
            setError(null)
            break

          case 'save':
            console.log('💾 Manual save triggered')
            setCurrentXML(message.xml)
            setError(null)
            break

          case 'export':
            console.log('🖼️ Export received')
            handleExport(message.data, message.xml)
            break

          case 'exit':
            console.log('🚪 Editor exit')
            onClose()
            break

          default:
            console.log('ℹ️ Unhandled event:', message.event)
        }
      } catch (error: unknown) {
        console.error('❌ Error processing draw.io message:', error)
        setError('Failed to process editor message')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isOpen, DRAWIO_URL, currentXML, onClose])

  // Load diagram when initialized
  useEffect(() => {
    if (isInitialized && isOpen) {
      loadDiagram()
    }
  }, [isInitialized, isOpen])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsInitialized(false)
      setCurrentXML(diagramXML)
      setError(null)
      setIsExporting(false)
    }
  }, [isOpen, diagramXML])

  // Load diagram into editor
  const loadDiagram = () => {
    if (!iframeRef.current?.contentWindow || !isInitialized) {
      console.warn('⚠️ Cannot load diagram: iframe not ready')
      return
    }

    const xmlToLoad = currentXML || BLANK_DIAGRAM_XML

    console.log('📤 Loading diagram into editor...')
    
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        action: 'load',
        xml: xmlToLoad,
        autosave: 1  // Enable autosave
      }),
      '*'
    )
  }

  // Request PNG export
  const exportPNG = () => {
    if (!iframeRef.current?.contentWindow) {
      setError('Editor not ready for export')
      return
    }

    if (!currentXML) {
      setError('No diagram to export')
      return
    }

    setIsExporting(true)
    setError(null)

    console.log('📤 Requesting PNG export...')
    
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        action: 'export',
        format: 'png'  // Plain PNG (we store XML separately in sketch field)
      }),
      '*'
    )
  }

  // Handle export data
  const handleExport = (base64Data: string, xml?: string) => {
    setIsExporting(false)

    if (!base64Data) {
      setError('Export failed: No image data received')
      return
    }

    // Validate size
    const sizeInBytes = base64Data.length * 0.75 // Approximate Base64 to binary size
    if (sizeInBytes > MAX_SIZE_BYTES) {
      setError(`Image too large: ${Math.round(sizeInBytes / 1024 / 1024)}MB (max ${MAX_SIZE_MB}MB)`)
      return
    }

    // Ensure data URI format
    const pngDataURI = base64Data.startsWith('data:') 
      ? base64Data 
      : `data:image/png;base64,${base64Data}`

    // Use current XML (from autosave) or fallback to received XML
    const finalXML = currentXML || xml || BLANK_DIAGRAM_XML

    console.log('✅ Export successful:', {
      xmlLength: finalXML.length,
      pngSize: Math.round(sizeInBytes / 1024) + 'KB'
    })

    onSave(finalXML, pngDataURI)
  }

  // Handle save button click
  const handleSaveClick = () => {
    if (!currentXML) {
      setError('No changes to save')
      return
    }

    exportPNG()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full h-full max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Draw.io Advanced Editing
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isInitialized ? 'Editor ready' : 'Loading editor...'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSaveClick}
              disabled={!isInitialized || isExporting || !currentXML}
              variant="default"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Save & Close'}
            </Button>
            
            <Button 
              onClick={onClose} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">Error</p>
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Editor iframe */}
        <div className="flex-1 relative overflow-hidden">
          {!isInitialized && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading Draw.io editor...</p>
              </div>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full border-0"
            title="Draw.io Editor"
            allow="clipboard-read; clipboard-write"
          />
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 Tip: Changes are auto-saved. Click "Save & Close" to export the diagram as an image.
            {currentXML && ` | Current size: ${Math.round(currentXML.length / 1024)}KB`}
          </p>
        </div>
      </div>
    </div>
  )
}

