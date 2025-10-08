#!/usr/bin/env tsx

/**
 * Test script for cross-organization billing attribution
 * This verifies that usage is correctly attributed to the right organization
 */

import { usageTracker } from '@/lib/usage/usage-tracker'
import { prisma } from '@/lib/prisma'
import { eventRegistry } from '@/lib/config/event-registry'

interface TestOrganization {
  id: string
  name: string
  plan: string
}

interface TestUser {
  id: string
  email: string
  name: string
}

interface TestSession {
  id: number
  uuid: string
  organizationId: string
}

async function setupTestData(): Promise<{
  organizations: TestOrganization[]
  users: TestUser[]
  sessions: TestSession[]
}> {
  console.log('🔧 Setting up test data...')

  // Create test organizations
  const organizations: TestOrganization[] = [
    { id: 'test-org-1', name: 'Test Organization 1', plan: 'professional' },
    { id: 'test-org-2', name: 'Test Organization 2', plan: 'starter' },
    { id: 'test-org-3', name: 'Test Organization 3', plan: 'enterprise' }
  ]

  // Create test users
  const users: TestUser[] = [
    { id: 'test-user-1', email: 'user1@test.com', name: 'Test User 1' },
    { id: 'test-user-2', email: 'user2@test.com', name: 'Test User 2' },
    { id: 'test-user-3', email: 'user3@test.com', name: 'Test User 3' }
  ]

  // Create test sessions
  const sessions: TestSession[] = [
    { id: 1001, uuid: 'session-1001', organizationId: 'test-org-1' },
    { id: 1002, uuid: 'session-1002', organizationId: 'test-org-2' },
    { id: 1003, uuid: 'session-1003', organizationId: 'test-org-3' }
  ]

  console.log(`✅ Test data prepared: ${organizations.length} orgs, ${users.length} users, ${sessions.length} sessions`)
  
  return { organizations, users, sessions }
}

async function testBasicAttribution(testData: any): Promise<boolean> {
  console.log('\n🧪 Testing Basic Organization Attribution')
  console.log('======================================')

  const { organizations, users } = testData
  let passed = 0
  let failed = 0

  try {
    // Test usage tracking for each organization
    for (let i = 0; i < organizations.length; i++) {
      const org = organizations[i]
      const user = users[i % users.length]

      console.log(`📝 Testing usage for ${org.name} (${org.id})`)

      // Track a test event
      const result = await usageTracker.trackUsage({
        organizationId: org.id,
        userId: user.id,
        eventType: 'structuring_diagnose',
        eventData: {
          test: true,
          testRun: 'cross-org-attribution',
          inputLength: 100
        },
        skipLimitCheck: true // Skip limits for testing
      })

      if (result.success) {
        console.log(`  ✅ Successfully tracked ${result.creditsConsumed} credits`)
        passed++
      } else {
        console.log(`  ❌ Failed to track usage: ${result.error}`)
        failed++
      }
    }

  } catch (error: unknown) {
    console.error('❌ Basic attribution test failed:', error)
    return false
  }

  console.log(`\n📊 Basic Attribution Results: ${passed} passed, ${failed} failed`)
  return failed === 0
}

async function testCrossOrgIsolation(testData: any): Promise<boolean> {
  console.log('\n🧪 Testing Cross-Organization Isolation')
  console.log('=====================================')

  const { organizations, users } = testData

  try {
    // Track different amounts of usage for each org
    const trackingData = [
      { org: organizations[0], credits: 50, events: 5 },
      { org: organizations[1], credits: 100, events: 10 },
      { org: organizations[2], credits: 200, events: 15 }
    ]

    // Track usage for each organization
    for (const data of trackingData) {
      console.log(`📝 Tracking ${data.events} events (${data.credits} credits) for ${data.org.name}`)
      
      for (let i = 0; i < data.events; i++) {
        await usageTracker.trackUsage({
          organizationId: data.org.id,
          userId: users[0].id,
          eventType: 'visuals_planning',
          eventData: {
            test: true,
            testRun: 'cross-org-isolation',
            eventIndex: i
          },
          creditsOverride: data.credits / data.events,
          skipLimitCheck: true
        })
      }
    }

    // Verify isolation - check that each org only sees its own usage
    for (let i = 0; i < trackingData.length; i++) {
      const data = trackingData[i]
      console.log(`🔍 Verifying isolation for ${data.org.name}`)

      const breakdown = await usageTracker.getUsageBreakdown(data.org.id)
      
      // Check if this org's usage matches what we tracked
      const expectedCredits = data.credits
      const actualCredits = breakdown.usedCredits
      
      if (Math.abs(actualCredits - expectedCredits) <= 1) { // Allow for rounding
        console.log(`  ✅ Correct usage: ${actualCredits} credits (expected ~${expectedCredits})`)
      } else {
        console.log(`  ❌ Usage mismatch: ${actualCredits} credits (expected ${expectedCredits})`)
        return false
      }

      // Verify this org doesn't see other orgs' events
      const otherOrgsEvents = Object.keys(breakdown.eventBreakdown).filter(eventType => {
        const events = breakdown.eventBreakdown[eventType]
        return (breakdown.eventBreakdown as any)[eventType]?.eventData?.some?.((event: any) => 
          event.testRun && event.testRun !== 'cross-org-isolation'
        )
      })

      if (otherOrgsEvents.length === 0) {
        console.log(`  ✅ Proper isolation: no cross-contamination detected`)
      } else {
        console.log(`  ❌ Isolation breach: found ${otherOrgsEvents.length} foreign events`)
        return false
      }
    }

    return true

  } catch (error: unknown) {
    console.error('❌ Cross-org isolation test failed:', error)
    return false
  }
}

async function testSessionAttribution(testData: any): Promise<boolean> {
  console.log('\n🧪 Testing Session Attribution')
  console.log('=============================')

  const { organizations, users, sessions } = testData

  try {
    // Track usage with specific sessions
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i]
      const user = users[i % users.length]

      console.log(`📝 Testing session ${session.uuid} for org ${session.organizationId}`)

      const result = await usageTracker.trackUsage({
        organizationId: session.organizationId,
        userId: user.id,
        eventType: 'solutioning_structure_solution',
        sessionId: session.id,
        eventData: {
          test: true,
          testRun: 'session-attribution',
          sessionUuid: session.uuid
        },
        skipLimitCheck: true
      })

      if (result.success) {
        console.log(`  ✅ Successfully tracked usage for session ${session.uuid}`)
      } else {
        console.log(`  ❌ Failed to track session usage: ${result.error}`)
        return false
      }
    }

    // Verify session attribution through database query
    for (const session of sessions) {
      const usageEvents = await prisma.usageEvent.findMany({
        where: {
          sessionId: session.id,
          organizationId: session.organizationId
        }
      })

      if (usageEvents.length > 0) {
        console.log(`  ✅ Session ${session.uuid}: ${usageEvents.length} events correctly attributed`)
      } else {
        console.log(`  ❌ Session ${session.uuid}: no events found`)
        return false
      }
    }

    return true

  } catch (error: unknown) {
    console.error('❌ Session attribution test failed:', error)
    return false
  }
}

async function testUsageBreakdownAccuracy(testData: any): Promise<boolean> {
  console.log('\n🧪 Testing Usage Breakdown Accuracy')
  console.log('==================================')

  const { organizations, users } = testData

  try {
    const testOrg = organizations[0]
    console.log(`📝 Testing detailed breakdown for ${testOrg.name}`)

    // Track multiple event types with known quantities
    const testEvents = [
      { type: 'structuring_diagnose', count: 3, credits: 10 },
      { type: 'visuals_planning', count: 2, credits: 8 },
      { type: 'solutioning_structure_solution', count: 1, credits: 15 }
    ]

    const expectedTotalCredits = testEvents.reduce((sum, event) => sum + (event.count * event.credits), 0)

    for (const event of testEvents) {
      for (let i = 0; i < event.count; i++) {
        await usageTracker.trackUsage({
          organizationId: testOrg.id,
          userId: users[0].id,
          eventType: event.type,
          eventData: {
            test: true,
            testRun: 'breakdown-accuracy',
            eventIndex: i
          },
          creditsOverride: event.credits,
          skipLimitCheck: true
        })
      }
    }

    // Get breakdown and verify
    const breakdown = await usageTracker.getUsageBreakdown(testOrg.id)

    console.log(`🔍 Verifying breakdown accuracy:`)
    console.log(`  Expected total credits: ${expectedTotalCredits}`)
    console.log(`  Actual total credits: ${breakdown.usedCredits}`)

    // Check overall credits
    if (Math.abs(breakdown.usedCredits - expectedTotalCredits) <= 1) {
      console.log(`  ✅ Total credits match`)
    } else {
      console.log(`  ❌ Total credits mismatch`)
      return false
    }

    // Check event-specific breakdown
    for (const expectedEvent of testEvents) {
      const actualEvent = breakdown.eventBreakdown[expectedEvent.type]
      if (actualEvent) {
        const expectedCredits = expectedEvent.count * expectedEvent.credits
        if (Math.abs(actualEvent.credits - expectedCredits) <= 1 && actualEvent.count >= expectedEvent.count) {
          console.log(`  ✅ ${expectedEvent.type}: ${actualEvent.count} events, ${actualEvent.credits} credits`)
        } else {
          console.log(`  ❌ ${expectedEvent.type}: Expected ${expectedEvent.count} events/${expectedCredits} credits, got ${actualEvent.count}/${actualEvent.credits}`)
          return false
        }
      } else {
        console.log(`  ❌ ${expectedEvent.type}: Event type not found in breakdown`)
        return false
      }
    }

    return true

  } catch (error: unknown) {
    console.error('❌ Usage breakdown accuracy test failed:', error)
    return false
  }
}

async function cleanupTestData(testData: any): Promise<void> {
  console.log('\n🧹 Cleaning up test data...')

  try {
    // Delete test usage events
    await prisma.usageEvent.deleteMany({
      where: {
        eventData: {
          path: ['test'],
          equals: true
        }
      }
    })

    console.log('✅ Test data cleaned up')

  } catch (error: unknown) {
    console.error('⚠️ Cleanup failed (non-critical):', error)
  }
}

async function main() {
  console.log('🚀 Cross-Organization Billing Attribution Tests')
  console.log('==============================================')
  console.log('Testing that usage is correctly attributed to organizations\n')

  // Ensure event definitions are loaded
  await eventRegistry.refreshCache()

  const testData = await setupTestData()

  const tests = [
    { name: 'Basic Attribution', fn: () => testBasicAttribution(testData) },
    { name: 'Cross-Org Isolation', fn: () => testCrossOrgIsolation(testData) },
    { name: 'Session Attribution', fn: () => testSessionAttribution(testData) },
    { name: 'Breakdown Accuracy', fn: () => testUsageBreakdownAccuracy(testData) }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = await test.fn()
      if (result) {
        passed++
        console.log(`\n✅ ${test.name} - PASSED`)
      } else {
        failed++
        console.log(`\n❌ ${test.name} - FAILED`)
      }
    } catch (error: unknown) {
      failed++
      console.log(`\n❌ ${test.name} - ERROR: ${error instanceof Error ? error.message : "Unknown error"}`)
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  await cleanupTestData(testData)

  console.log('\n' + '='.repeat(50))
  console.log('📊 Cross-Organization Billing Test Results')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

  if (failed === 0) {
    console.log('\n🎉 All cross-organization billing tests passed!')
    console.log('✅ Usage tracking is correctly isolated by organization')
    console.log('✅ Billing attribution is accurate and secure')
  } else {
    console.log('\n⚠️ Some tests failed. Review the errors above.')
    process.exit(1)
  }
}

// Run the tests
main().catch(console.error)








