/**
 * Test file for HTML Storage Service
 * 
 * This is a manual test script to verify the HTML storage service works correctly.
 * Run with: npx ts-node src/lib/hyper-canvas/html-storage.test.ts
 * 
 * Or use the test functions from the Node REPL or your testing framework.
 */

import { htmlStorage } from './html-storage'

// Sample HTML for testing
const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Document</title>
  <style>
    body { font-family: Arial, sans-serif; }
    h1 { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Test Solutioning Document</h1>
  <p>This is a test document for the HTML storage service.</p>
  <div class="solution">
    <h2>Solution 1: Test Solution</h2>
    <p>This solution demonstrates the HTML storage functionality.</p>
  </div>
</body>
</html>
`

const MODIFIED_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Document - Modified</title>
  <style>
    body { font-family: Arial, sans-serif; }
    h1 { color: #dc2626; } /* Changed to red */
  </style>
</head>
<body>
  <h1>Test Solutioning Document - MODIFIED</h1>
  <p>This is a MODIFIED test document.</p>
  <div class="solution">
    <h2>Solution 1: Test Solution</h2>
    <p>This solution has been updated with aggressive timeline.</p>
  </div>
</body>
</html>
`

/**
 * Test 1: Store and retrieve HTML
 */
export async function testStoreAndRetrieve() {
  console.log('\n🧪 Test 1: Store and retrieve HTML')
  console.log('═'.repeat(50))
  
  // You need to replace these with actual IDs from your database
  const testThreadId = 'test_thread_' + Date.now()
  const testSessionId = '00000000-0000-0000-0000-000000000000' // Replace with real session UUID
  
  try {
    // Store HTML
    console.log('\n📝 Storing HTML...')
    await htmlStorage.storeLatestHTML(
      testThreadId,
      testSessionId,
      SAMPLE_HTML,
      'Initial test document'
    )
    
    // Retrieve HTML
    console.log('\n📄 Retrieving HTML...')
    const retrievedHTML = await htmlStorage.getLatestHTML(testThreadId, testSessionId)
    
    // Verify
    if (retrievedHTML === SAMPLE_HTML) {
      console.log('✅ Test PASSED: HTML matches exactly')
    } else {
      console.log('❌ Test FAILED: HTML does not match')
      console.log('Expected length:', SAMPLE_HTML.length)
      console.log('Retrieved length:', retrievedHTML?.length || 0)
    }
    
  } catch (error) {
    console.error('❌ Test FAILED with error:', error)
  }
}

/**
 * Test 2: Update HTML (replace with new version)
 */
export async function testUpdateHTML() {
  console.log('\n🧪 Test 2: Update HTML')
  console.log('═'.repeat(50))
  
  const testThreadId = 'test_thread_' + Date.now()
  const testSessionId = '00000000-0000-0000-0000-000000000000'
  
  try {
    // Store initial HTML
    console.log('\n📝 Storing initial HTML...')
    await htmlStorage.storeLatestHTML(
      testThreadId,
      testSessionId,
      SAMPLE_HTML,
      'Initial version'
    )
    
    // Get metadata v1
    const metadata1 = await htmlStorage.getHTMLMetadata(testThreadId, testSessionId)
    console.log('Version 1 metadata:', metadata1)
    
    // Update with modified HTML
    console.log('\n📝 Storing modified HTML...')
    await htmlStorage.storeLatestHTML(
      testThreadId,
      testSessionId,
      MODIFIED_HTML,
      'Made timeline more aggressive'
    )
    
    // Get metadata v2
    const metadata2 = await htmlStorage.getHTMLMetadata(testThreadId, testSessionId)
    console.log('Version 2 metadata:', metadata2)
    
    // Verify version incremented
    if (metadata2 && metadata2.version === 2) {
      console.log('✅ Test PASSED: Version incremented correctly')
    } else {
      console.log('❌ Test FAILED: Version did not increment')
    }
    
    // Verify HTML was replaced (not appended)
    const retrievedHTML = await htmlStorage.getLatestHTML(testThreadId, testSessionId)
    if (retrievedHTML === MODIFIED_HTML) {
      console.log('✅ Test PASSED: HTML replaced correctly')
    } else {
      console.log('❌ Test FAILED: HTML was not replaced')
    }
    
  } catch (error) {
    console.error('❌ Test FAILED with error:', error)
  }
}

/**
 * Test 3: Check HTML existence
 */
export async function testHasHTML() {
  console.log('\n🧪 Test 3: Check HTML existence')
  console.log('═'.repeat(50))
  
  const testThreadId = 'test_thread_' + Date.now()
  const nonExistentThreadId = 'nonexistent_thread'
  const testSessionId = '00000000-0000-0000-0000-000000000000'
  
  try {
    // Check non-existent HTML
    console.log('\n🔍 Checking non-existent HTML...')
    const hasHTML1 = await htmlStorage.hasHTML(nonExistentThreadId, testSessionId)
    
    if (!hasHTML1) {
      console.log('✅ Test PASSED: Non-existent HTML returns false')
    } else {
      console.log('❌ Test FAILED: Non-existent HTML returned true')
    }
    
    // Store HTML
    console.log('\n📝 Storing HTML...')
    await htmlStorage.storeLatestHTML(
      testThreadId,
      testSessionId,
      SAMPLE_HTML,
      'Test document'
    )
    
    // Check existing HTML
    console.log('\n🔍 Checking existing HTML...')
    const hasHTML2 = await htmlStorage.hasHTML(testThreadId, testSessionId)
    
    if (hasHTML2) {
      console.log('✅ Test PASSED: Existing HTML returns true')
    } else {
      console.log('❌ Test FAILED: Existing HTML returned false')
    }
    
  } catch (error) {
    console.error('❌ Test FAILED with error:', error)
  }
}

/**
 * Test 4: Get metadata
 */
export async function testGetMetadata() {
  console.log('\n🧪 Test 4: Get metadata')
  console.log('═'.repeat(50))
  
  const testThreadId = 'test_thread_' + Date.now()
  const testSessionId = '00000000-0000-0000-0000-000000000000'
  
  try {
    // Store HTML with summary
    console.log('\n📝 Storing HTML...')
    await htmlStorage.storeLatestHTML(
      testThreadId,
      testSessionId,
      SAMPLE_HTML,
      'Compressed timeline by 30%'
    )
    
    // Get metadata
    console.log('\n📊 Getting metadata...')
    const metadata = await htmlStorage.getHTMLMetadata(testThreadId, testSessionId)
    
    console.log('Metadata:', JSON.stringify(metadata, null, 2))
    
    if (metadata && metadata.summary === 'Compressed timeline by 30%') {
      console.log('✅ Test PASSED: Metadata retrieved correctly')
    } else {
      console.log('❌ Test FAILED: Metadata incorrect')
    }
    
  } catch (error) {
    console.error('❌ Test FAILED with error:', error)
  }
}

/**
 * Test 5: Multiple threads in same session
 */
export async function testMultipleThreads() {
  console.log('\n🧪 Test 5: Multiple threads in same session')
  console.log('═'.repeat(50))
  
  const thread1 = 'test_thread_1_' + Date.now()
  const thread2 = 'test_thread_2_' + Date.now()
  const testSessionId = '00000000-0000-0000-0000-000000000000'
  
  try {
    // Store HTML for thread 1
    console.log('\n📝 Storing HTML for thread 1...')
    await htmlStorage.storeLatestHTML(
      thread1,
      testSessionId,
      SAMPLE_HTML,
      'Thread 1 document'
    )
    
    // Store HTML for thread 2
    console.log('\n📝 Storing HTML for thread 2...')
    await htmlStorage.storeLatestHTML(
      thread2,
      testSessionId,
      MODIFIED_HTML,
      'Thread 2 document'
    )
    
    // Get all threads
    console.log('\n📋 Getting all threads...')
    const threads = await htmlStorage.getAllThreads(testSessionId)
    
    console.log(`Found ${threads.length} threads:`)
    threads.forEach(thread => {
      console.log(`  - ${thread.thread_id} (v${thread.version}, ${thread.html_size} bytes)`)
    })
    
    // Verify both threads exist
    const hasThread1 = threads.some(t => t.thread_id === thread1)
    const hasThread2 = threads.some(t => t.thread_id === thread2)
    
    if (hasThread1 && hasThread2) {
      console.log('✅ Test PASSED: Both threads stored correctly')
    } else {
      console.log('❌ Test FAILED: Not all threads found')
    }
    
    // Verify they have different HTML
    const html1 = await htmlStorage.getLatestHTML(thread1, testSessionId)
    const html2 = await htmlStorage.getLatestHTML(thread2, testSessionId)
    
    if (html1 !== html2) {
      console.log('✅ Test PASSED: Threads have separate HTML')
    } else {
      console.log('❌ Test FAILED: Threads have same HTML')
    }
    
  } catch (error) {
    console.error('❌ Test FAILED with error:', error)
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('\n🚀 Running HTML Storage Service Tests')
  console.log('═'.repeat(50))
  console.log('⚠️  Make sure to update testSessionId with a real session UUID')
  console.log('═'.repeat(50))
  
  await testStoreAndRetrieve()
  await testUpdateHTML()
  await testHasHTML()
  await testGetMetadata()
  await testMultipleThreads()
  
  console.log('\n✅ All tests completed!')
}

// Uncomment to run tests:
// runAllTests().catch(console.error)

/**
 * Quick smoke test with minimal setup
 * Returns true if basic functionality works
 */
export async function smokeTest(sessionId: string): Promise<boolean> {
  const threadId = 'smoke_test_' + Date.now()
  
  try {
    // Store
    await htmlStorage.storeLatestHTML(
      threadId,
      sessionId,
      '<html><body>Test</body></html>',
      'Smoke test'
    )
    
    // Retrieve
    const html = await htmlStorage.getLatestHTML(threadId, sessionId)
    
    // Cleanup
    await htmlStorage.deleteHTML(threadId, sessionId)
    
    return html === '<html><body>Test</body></html>'
  } catch (error) {
    console.error('Smoke test failed:', error)
    return false
  }
}
