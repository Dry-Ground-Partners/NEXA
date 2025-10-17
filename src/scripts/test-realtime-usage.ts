#!/usr/bin/env tsx

/**
 * Real-time usage testing script
 * This script tests the frontend components with live data updates
 */

import { eventRegistry } from '@/lib/config/event-registry'
import { usageTracker } from '@/lib/usage/usage-tracker'
import { prisma } from '@/lib/prisma'

interface TestUser {
  id: string
  email: string
  name: string
}

interface TestOrganization {
  id: string
  name: string
  planType: string
}

async function setupTestEnvironment(): Promise<{
  users: TestUser[]
  organizations: TestOrganization[]
}> {
  console.log('🔧 Setting up test environment...')

  const users: TestUser[] = [
    { id: 'test-user-rt-1', email: 'realtime1@test.com', name: 'RealTime User 1' },
    { id: 'test-user-rt-2', email: 'realtime2@test.com', name: 'RealTime User 2' },
    { id: 'test-user-rt-3', email: 'realtime3@test.com', name: 'RealTime User 3' }
  ]

  const organizations: TestOrganization[] = [
    { id: 'test-org-rt-1', name: 'RealTime Test Org 1', planType: 'professional' },
    { id: 'test-org-rt-2', name: 'RealTime Test Org 2', planType: 'starter' }
  ]

  console.log(`✅ Test environment ready: ${users.length} users, ${organizations.length} orgs`)
  return { users, organizations }
}

async function simulateRealTimeUsage(users: TestUser[], organizations: TestOrganization[]): Promise<void> {
  console.log('\n🚀 Starting real-time usage simulation...')
  console.log('This will generate usage events every 2-3 seconds for 30 seconds')
  console.log('Open your browser to /organizations and switch to the Usage tab to see live updates')

  const eventTypes = [
    'structuring_diagnose',
    'structuring_generate_solution',
    'visuals_planning',
    'visuals_sketch',
    'solutioning_structure_solution',
    'solutioning_ai_enhance'
  ]

  const startTime = Date.now()
  const duration = 30 * 1000 // 30 seconds
  let eventCount = 0

  console.log('\n📊 Real-time events:')
  console.log('Time        | Org | User | Event                    | Credits')
  console.log('------------------------------------------------------------------------')

  while (Date.now() - startTime < duration) {
    try {
      // Random selections
      const org = organizations[Math.floor(Math.random() * organizations.length)]
      const user = users[Math.floor(Math.random() * users.length)]
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]

      // Random event data
      const eventData = {
        test: true,
        realTimeTest: true,
        eventIndex: eventCount,
        complexity: Math.random() * 1.5 + 1.0, // 1.0 - 2.5
        echo: Math.random() > 0.7,
        traceback: Math.random() > 0.8,
        inputLength: Math.floor(Math.random() * 1000) + 100
      }

      // Track the usage
      const result = await usageTracker.trackUsage({
        organizationId: org.id,
        userId: user.id,
        eventType,
        eventData,
        skipLimitCheck: true // Skip limits for testing
      })

      if (result.success) {
        const timestamp = new Date().toLocaleTimeString()
        const orgShort = org.name.slice(-1)
        const userShort = user.name.slice(-1)
        const eventShort = eventType.replace(/_/g, ' ').slice(0, 22)
        
        console.log(
          `${timestamp} | ${orgShort}   | ${userShort}    | ${eventShort.padEnd(22)} | ${result.creditsConsumed.toString().padStart(7)}`
        )
        
        eventCount++
      } else {
        console.log(`❌ ${new Date().toLocaleTimeString()} | Failed: ${result.error}`)
      }

    } catch (error: unknown) {
      console.error(`❌ ${new Date().toLocaleTimeString()} | Error:`, error instanceof Error ? error.message : "Unknown error")
    }

    // Random delay between 2-4 seconds
    const delay = Math.random() * 2000 + 2000
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  console.log('------------------------------------------------------------------------')
  console.log(`✅ Simulation complete! Generated ${eventCount} events in 30 seconds`)
}

async function testDashboardAPIs(organizations: TestOrganization[]): Promise<void> {
  console.log('\n🧪 Testing Dashboard APIs...')

  for (const org of organizations) {
    console.log(`\n📊 Testing dashboard for ${org.name}:`)

    try {
      // Simulate API calls that the frontend would make
      const dashboardUrl = `http://localhost:5000/api/organizations/${org.id}/usage/dashboard`
      const historyUrl = `http://localhost:5000/api/organizations/${org.id}/usage/history?limit=5`

      console.log(`   📈 Dashboard API: ${dashboardUrl}`)
      console.log(`   📋 History API: ${historyUrl}`)

      // Get usage breakdown using our service directly
      const breakdown = await usageTracker.getUsageBreakdown(org.id)
      
      console.log(`   ✅ Dashboard data:`)
      console.log(`      - Total Credits: ${breakdown.totalCredits === Infinity ? '∞' : breakdown.totalCredits.toLocaleString()}`)
      console.log(`      - Used Credits: ${breakdown.usedCredits.toLocaleString()}`)
      console.log(`      - Remaining: ${breakdown.remainingCredits === Infinity ? '∞' : breakdown.remainingCredits.toLocaleString()}`)
      console.log(`      - Percentage: ${breakdown.percentageUsed.toFixed(1)}%`)
      console.log(`      - Event Types: ${Object.keys(breakdown.eventBreakdown).length}`)
      console.log(`      - Users: ${Object.keys(breakdown.userBreakdown).length}`)

    } catch (error: unknown) {
      console.error(`   ❌ API test failed:`, error instanceof Error ? error.message : "Unknown error")
    }
  }
}

async function generateUsageReport(organizations: TestOrganization[]): Promise<void> {
  console.log('\n📋 Usage Report Summary')
  console.log('=======================')

  for (const org of organizations) {
    console.log(`\n🏢 ${org.name} (${org.planType})`)
    
    try {
      const breakdown = await usageTracker.getUsageBreakdown(org.id)
      
      console.log(`   💰 Credits: ${breakdown.usedCredits.toLocaleString()} used`)
      
      if (Object.keys(breakdown.eventBreakdown).length > 0) {
        console.log(`   🔥 Top Events:`)
        Object.entries(breakdown.eventBreakdown)
          .sort(([,a], [,b]) => (b as any).credits - (a as any).credits)
          .slice(0, 3)
          .forEach(([eventType, data], index) => {
            console.log(`      ${index + 1}. ${eventType}: ${(data as any).credits} credits (${(data as any).count} calls)`)
          })
      }

      if (Object.keys(breakdown.userBreakdown).length > 0) {
        console.log(`   👥 Users:`)
        Object.entries(breakdown.userBreakdown)
          .sort(([,a], [,b]) => (b as any).credits - (a as any).credits)
          .forEach(([userName, data]) => {
            console.log(`      - ${userName}: ${(data as any).credits} credits`)
          })
      }

      // Recent activity
      const recentEvents = await prisma.usageEvent.findMany({
        where: {
          organizationId: org.id,
          eventData: {
            path: ['realTimeTest'],
            equals: true
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          user: {
            select: { fullName: true, email: true }
          }
        }
      })

      if (recentEvents.length > 0) {
        console.log(`   🕒 Recent Activity:`)
        recentEvents.forEach(event => {
          const timeAgo = Math.round((Date.now() - event.createdAt.getTime()) / 1000)
          console.log(`      - ${event.eventType}: ${event.creditsConsumed} credits (${timeAgo}s ago)`)
        })
      }

    } catch (error: unknown) {
      console.error(`   ❌ Report error:`, error instanceof Error ? error.message : "Unknown error")
    }
  }
}

async function testFrontendInstructions(): Promise<void> {
  console.log('\n🖥️  Frontend Testing Instructions')
  console.log('================================')
  console.log('')
  console.log('1. 🚀 Start your development server:')
  console.log('   npm run dev')
  console.log('')
  console.log('2. 🌐 Open your browser to:')
  console.log('   http://localhost:5000/organizations')
  console.log('')
  console.log('3. 🎯 Navigate to Usage tab to see:')
  console.log('   ✅ Real-time credit counters')
  console.log('   ✅ Live usage dashboard with charts')
  console.log('   ✅ Dynamic event breakdown')
  console.log('   ✅ User activity tracking')
  console.log('')
  console.log('4. 🔄 Test real-time updates:')
  console.log('   - Run this script again with --simulate flag')
  console.log('   - Watch the dashboard update live every 2-3 seconds')
  console.log('   - Switch between Dashboard and History views')
  console.log('   - Apply filters in the History tab')
  console.log('')
  console.log('5. ⚡ Test the Usage Context:')
  console.log('   - useUsageDashboard() hook provides real-time data')
  console.log('   - useUsageHistory() hook handles filtering/pagination')
  console.log('   - Components auto-refresh every 30 seconds')
  console.log('')
  console.log('6. 🧪 API Endpoints to test:')
  console.log('   GET /api/organizations/[orgId]/usage/dashboard')
  console.log('   GET /api/organizations/[orgId]/usage/history')
  console.log('   GET /api/organizations/[orgId]/usage/management')
  console.log('')
}

async function cleanupTestData(): Promise<void> {
  console.log('\n🧹 Cleaning up test data...')

  try {
    // Delete real-time test events
    const deleted = await prisma.usageEvent.deleteMany({
      where: {
        eventData: {
          path: ['realTimeTest'],
          equals: true
        }
      }
    })

    console.log(`✅ Cleaned up ${deleted.count} test events`)

  } catch (error: unknown) {
    console.error('⚠️ Cleanup error (non-critical):', error instanceof Error ? error.message : "Unknown error")
  }
}

async function main() {
  const args = process.argv.slice(2)
  const shouldSimulate = args.includes('--simulate')
  const shouldCleanup = args.includes('--cleanup')

  console.log('🧪 Real-Time Usage Testing Suite')
  console.log('================================')

  if (shouldCleanup) {
    await cleanupTestData()
    return
  }

  // Ensure event definitions are loaded
  await eventRegistry.refreshCache()

  if (shouldSimulate) {
    console.log('🎬 Running real-time simulation...')
    const { users, organizations } = await setupTestEnvironment()
    
    await simulateRealTimeUsage(users, organizations)
    await testDashboardAPIs(organizations)
    await generateUsageReport(organizations)
    
    console.log('\n✨ Simulation complete! Check your frontend for live updates.')
  } else {
    // Just show instructions
    await testFrontendInstructions()
    
    console.log('💡 Usage:')
    console.log('   npx tsx src/scripts/test-realtime-usage.ts --simulate   (run simulation)')
    console.log('   npx tsx src/scripts/test-realtime-usage.ts --cleanup    (clean test data)')
    console.log('   npx tsx src/scripts/test-realtime-usage.ts              (show instructions)')
  }
}

// Run the test
main().catch(console.error)






















