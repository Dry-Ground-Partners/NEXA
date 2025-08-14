'use client'

import { useEffect, useState } from 'react'

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    // Check cookies in browser
    const allCookies = document.cookie
    const authToken = getCookie('auth-token')
    
    // Check API
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setDebugInfo({
          allCookies,
          authToken: authToken ? authToken.substring(0, 20) + '...' : 'None',
          authTokenLength: authToken?.length || 0,
          apiResponse: data,
          timestamp: new Date().toISOString()
        })
      })
      .catch(err => {
        setDebugInfo({
          allCookies,
          authToken: authToken ? authToken.substring(0, 20) + '...' : 'None',
          authTokenLength: authToken?.length || 0,
          apiError: err.message,
          timestamp: new Date().toISOString()
        })
      })
  }, [])

  function getCookie(name: string) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
    return null
  }

  return (
    <div className="min-h-screen nexa-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-white text-2xl mb-6">🔍 Authentication Debug Info</h1>
        
        <div className="bg-black border border-gray-600 rounded-lg p-6">
          <pre className="text-green-400 text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="mt-6 space-y-4">
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            🔄 Refresh Debug Info
          </button>
          
          <button 
            onClick={() => {
              fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: 'admin@dryground.ai',
                  password: 'password123'
                })
              }).then(() => window.location.reload())
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded ml-4"
          >
            🔐 Test Login
          </button>
          
          <button 
            onClick={() => {
              fetch('/api/auth/logout', { method: 'POST' })
                .then(() => window.location.reload())
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded ml-4"
          >
            🚪 Test Logout
          </button>
        </div>
      </div>
    </div>
  )
}


