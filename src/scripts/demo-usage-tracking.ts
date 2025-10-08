#!/usr/bin/env tsx

/**
 * Demo script to test the usage tracking system
 * This script will test the configuration system and demonstrate usage tracking
 */

import { eventRegistry } from '@/lib/config/event-registry'
import { planRegistry } from '@/lib/config/plan-registry'

async function testConfigurationSystem() {
  console.log('🔧 Testing Configuration System')
  console.log('==============================')

  try {
    // Test event registry
    console.log('\n📋 Loading event definitions...')
    const events = await eventRegistry.getAllEvents()
    console.log(`✅ Found ${Object.keys(events).length} event definitions:`)
    
    for (const [eventType, event] of Object.entries(events)) {
      console.log(`   • ${eventType}: ${event.description} (${event.baseCredits} credits)`)
    }

    // Test plan registry
    console.log('\n💰 Loading plan definitions...')
    const plans = await planRegistry.getAllPlans()
    console.log(`✅ Found ${Object.keys(plans).length} plan definitions:`)
    
    for (const [planName, plan] of Object.entries(plans)) {
      console.log(`   • ${plan.displayName}: $${plan.pricing.monthly}/mo (${plan.monthlyCredits} credits)`)
    }

    // Test cache info
    const eventCache = eventRegistry.getCacheInfo()
    const planCache = planRegistry.getCacheInfo()
    
    console.log('\n📊 Cache Status:')
    console.log(`   • Events: ${eventCache.size} items, last updated: ${eventCache.lastUpdate.toLocaleTimeString()}`)
    console.log(`   • Plans: ${planCache.size} items, last updated: ${planCache.lastUpdate.toLocaleTimeString()}`)

    return true

  } catch (error: unknown) {
    console.error('❌ Configuration test failed:', error)
    return false
  }
}

async function testHotReloading() {
  console.log('\n🔄 Testing Hot-Reloading')
  console.log('========================')

  try {
    // Create a test event
    console.log('➕ Creating test event...')
    await eventRegistry.updateEventDefinition('demo_test_event', {
      baseCredits: 1,
      description: 'Demo test event for hot-reloading',
      category: 'test'
    })

    // Verify it's immediately available
    const testEvent = await eventRegistry.getEventDefinition('demo_test_event')
    if (testEvent) {
      console.log('✅ Test event created and immediately available!')
      console.log(`   Event: ${testEvent.description} (${testEvent.baseCredits} credits)`)
    } else {
      console.log('❌ Test event not found after creation')
      return false
    }

    // Update the event
    console.log('📝 Updating test event...')
    await eventRegistry.updateEventDefinition('demo_test_event', {
      baseCredits: 5,
      description: 'Updated demo test event',
      category: 'test'
    })

    // Verify the update
    const updatedEvent = await eventRegistry.getEventDefinition('demo_test_event')
    if (updatedEvent && updatedEvent.baseCredits === 5) {
      console.log('✅ Test event updated successfully!')
      console.log(`   Updated: ${updatedEvent.description} (${updatedEvent.baseCredits} credits)`)
    } else {
      console.log('❌ Test event update failed')
      return false
    }

    // Clean up
    console.log('🧹 Cleaning up test event...')
    await eventRegistry.deleteEventDefinition('demo_test_event')
    
    const deletedEvent = await eventRegistry.getEventDefinition('demo_test_event')
    if (!deletedEvent) {
      console.log('✅ Test event deleted successfully!')
    } else {
      console.log('❌ Test event deletion failed')
      return false
    }

    return true

  } catch (error: unknown) {
    console.error('❌ Hot-reloading test failed:', error)
    return false
  }
}

async function demonstrateCreditsCalculation() {
  console.log('\n🧮 Demonstrating Credits Calculation')
  console.log('===================================')

  try {
    // Get a complex event to demonstrate multipliers
    const diagnoseEvent = await eventRegistry.getEventDefinition('structuring_diagnose')
    if (!diagnoseEvent) {
      console.log('❌ Diagnose event not found')
      return false
    }

    console.log(`📝 Event: ${diagnoseEvent.description}`)
    console.log(`💰 Base Credits: ${diagnoseEvent.baseCredits}`)
    
    if (diagnoseEvent.multipliers) {
      console.log('🔢 Available Multipliers:')
      
      if (diagnoseEvent.multipliers.complexity) {
        console.log(`   • Complexity: ${diagnoseEvent.multipliers.complexity.min}x - ${diagnoseEvent.multipliers.complexity.max}x`)
      }
      
      if (diagnoseEvent.multipliers.features) {
        console.log('   • Features:')
        for (const [feature, credits] of Object.entries(diagnoseEvent.multipliers.features)) {
          console.log(`     - ${feature}: +${credits} credits`)
        }
      }
    }

    // Demonstrate different scenarios
    console.log('\n📊 Credit Calculation Examples:')
    
    const scenarios = [
      { 
        name: 'Simple request', 
        data: {} 
      },
      { 
        name: 'Complex request', 
        data: { complexity: 2.0 } 
      },
      { 
        name: 'With Echo feature', 
        data: { echo: true } 
      },
      { 
        name: 'Complex + Echo + Traceback', 
        data: { complexity: 2.5, echo: true, traceback: true } 
      }
    ]

    for (const scenario of scenarios) {
      let credits = diagnoseEvent.baseCredits

      // Apply complexity multiplier
      if (diagnoseEvent.multipliers?.complexity && scenario.data.complexity) {
        const complexity = Math.max(
          diagnoseEvent.multipliers.complexity.min,
          Math.min(diagnoseEvent.multipliers.complexity.max, scenario.data.complexity)
        )
        credits *= complexity
      }

      // Apply feature multipliers
      if (diagnoseEvent.multipliers?.features) {
        for (const [feature, multiplier] of Object.entries(diagnoseEvent.multipliers.features)) {
          if (scenario.data[feature]) {
            credits += multiplier
          }
        }
      }

      console.log(`   • ${scenario.name}: ${Math.round(credits)} credits`)
    }

    return true

  } catch (error: unknown) {
    console.error('❌ Credits calculation demo failed:', error)
    return false
  }
}

async function showPlanComparison() {
  console.log('\n📋 Plan Comparison')
  console.log('==================')

  try {
    const plans = await planRegistry.getPlansSortedByPrice()
    
    console.log('Plan Features Comparison:')
    console.log('-'.repeat(80))
    
    // Header
    const headers = ['Plan', 'Price/mo', 'Credits', 'AI Calls', 'Members', 'Storage']
    console.log(headers.join('\t').padEnd(80))
    console.log('='.repeat(80))
    
    // Plans
    for (const plan of plans) {
      const row = [
        plan.displayName.substring(0, 12),
        `$${plan.pricing.monthly}`,
        plan.monthlyCredits === -1 ? '∞' : plan.monthlyCredits.toString(),
        plan.limits.aiCallsPerMonth === -1 ? '∞' : plan.limits.aiCallsPerMonth.toString(),
        plan.limits.teamMembersLimit === -1 ? '∞' : plan.limits.teamMembersLimit.toString(),
        `${plan.limits.storageLimit}MB`
      ]
      console.log(row.join('\t\t'))
    }

    // Test upgrade recommendation
    console.log('\n💡 Upgrade Recommendations:')
    const testScenarios = [
      { plan: 'free', usage: 80, description: '80% of free plan credits used' },
      { plan: 'starter', usage: 850, description: '85% of starter plan credits used' },
      { plan: 'professional', usage: 4200, description: '84% of professional plan credits used' }
    ]

    for (const scenario of testScenarios) {
      const recommendation = await planRegistry.getUpgradeRecommendation(scenario.plan, scenario.usage)
      console.log(`   • ${scenario.description}:`)
      if (recommendation.shouldUpgrade) {
        console.log(`     → ${recommendation.reason}`)
      } else {
        console.log(`     → No upgrade needed`)
      }
    }

    return true

  } catch (error: unknown) {
    console.error('❌ Plan comparison failed:', error)
    return false
  }
}

async function main() {
  console.log('🚀 NEXA Usage Tracking System Demo')
  console.log('==================================')
  console.log('This demo will test all components of Phase 1 implementation\n')

  const tests = [
    { name: 'Configuration System', fn: testConfigurationSystem },
    { name: 'Hot-Reloading', fn: testHotReloading },
    { name: 'Credits Calculation', fn: demonstrateCreditsCalculation },
    { name: 'Plan Comparison', fn: showPlanComparison }
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
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Results Summary')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Phase 1 implementation is ready!')
    console.log('\nNext steps:')
    console.log('• Start the development server: npm run dev')
    console.log('• Test the demo API: POST /api/demo/track-usage')
    console.log('• View configuration: GET /api/admin/config')
    console.log('• Begin Phase 2: API Integration & Tracking')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.')
  }
}

// Run the demo
main().catch(console.error)









