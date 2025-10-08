/**
 * Quick Test Script for HTML Storage Service
 * 
 * Run with: node test-html-storage.js
 * 
 * Make sure to:
 * 1. Set a real session UUID below
 * 2. Have your database running
 * 3. Run from project root
 */

// Import the service
const { htmlStorage } = require('./src/lib/hyper-canvas/html-storage')

// ⚠️ REPLACE THIS with a real session UUID from your database
const TEST_SESSION_ID = '00000000-0000-0000-0000-000000000000'

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Test Document</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #2563eb; }
  </style>
</head>
<body>
  <h1>HTML Storage Test Document</h1>
  <p>This is a test to verify the HTML storage service is working correctly.</p>
  <p>Timestamp: ${new Date().toISOString()}</p>
</body>
</html>`

async function runTest() {
  console.log('\n🧪 Testing HTML Storage Service')
  console.log('═'.repeat(60))
  
  const threadId = 'test_thread_' + Date.now()
  
  try {
    // Test 1: Store HTML
    console.log('\n📝 Test 1: Storing HTML...')
    await htmlStorage.storeLatestHTML(
      threadId,
      TEST_SESSION_ID,
      SAMPLE_HTML,
      'Initial test document'
    )
    console.log('✅ HTML stored successfully')
    
    // Test 2: Retrieve HTML
    console.log('\n📄 Test 2: Retrieving HTML...')
    const retrievedHTML = await htmlStorage.getLatestHTML(threadId, TEST_SESSION_ID)
    
    if (retrievedHTML === SAMPLE_HTML) {
      console.log('✅ HTML retrieved successfully and matches!')
    } else {
      console.log('❌ HTML mismatch!')
      console.log('Expected length:', SAMPLE_HTML.length)
      console.log('Retrieved length:', retrievedHTML?.length || 0)
    }
    
    // Test 3: Check existence
    console.log('\n🔍 Test 3: Checking existence...')
    const exists = await htmlStorage.hasHTML(threadId, TEST_SESSION_ID)
    console.log(exists ? '✅ HTML exists' : '❌ HTML not found')
    
    // Test 4: Get metadata
    console.log('\n📊 Test 4: Getting metadata...')
    const metadata = await htmlStorage.getHTMLMetadata(threadId, TEST_SESSION_ID)
    console.log('Metadata:', JSON.stringify(metadata, null, 2))
    
    // Test 5: Update HTML (version increment)
    console.log('\n📝 Test 5: Updating HTML (should increment version)...')
    await htmlStorage.storeLatestHTML(
      threadId,
      TEST_SESSION_ID,
      SAMPLE_HTML.replace('Test Document', 'Test Document - UPDATED'),
      'Updated test document'
    )
    
    const newMetadata = await htmlStorage.getHTMLMetadata(threadId, TEST_SESSION_ID)
    console.log('New metadata:', JSON.stringify(newMetadata, null, 2))
    
    if (newMetadata.version === 2) {
      console.log('✅ Version incremented correctly')
    } else {
      console.log('❌ Version did not increment')
    }
    
    // Test 6: List all threads
    console.log('\n📋 Test 6: Listing all threads...')
    const threads = await htmlStorage.getAllThreads(TEST_SESSION_ID)
    console.log(`Found ${threads.length} thread(s):`)
    threads.forEach(thread => {
      console.log(`  - ${thread.thread_id} (v${thread.version}, ${thread.html_size} bytes)`)
    })
    
    // Cleanup
    console.log('\n🗑️ Cleaning up test data...')
    await htmlStorage.deleteHTML(threadId, TEST_SESSION_ID)
    console.log('✅ Test data cleaned up')
    
    console.log('\n' + '═'.repeat(60))
    console.log('🎉 All tests passed!')
    console.log('═'.repeat(60))
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    console.error('\nMake sure:')
    console.error('1. Your database is running')
    console.error('2. TEST_SESSION_ID is a valid session UUID')
    console.error('3. The ai_architecture_sessions table has a threads column')
    process.exit(1)
  }
}

// Run the test
runTest()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
