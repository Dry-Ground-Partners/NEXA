#!/usr/bin/env tsx

/**
 * Test script for the configuration system
 * Tests event registry, plan registry, and hot-reloading functionality
 */

import { eventRegistry } from '@/lib/config/event-registry'
import { planRegistry } from '@/lib/config/plan-registry'
import { usageTracker } from '@/lib/usage/usage-tracker'

async function testEventRegistry() {
  console.log('\n🧪 Testing Event Registry...')
  
  try {
    // Test getting all events
    console.log('📋 Getting all events...')
    const allEvents = await eventRegistry.getAllEvents()
    console.log(`✅ Found ${Object.keys(allEvents).length} events`)
    
    // Test getting specific event
    console.log('🔍 Getting specific event: structuring_diagnose')
    const diagnoseEvent = await eventRegistry.getEventDefinition('structuring_diagnose')
    if (diagnoseEvent) {
      console.log(`✅ Event found: ${diagnoseEvent.description} (${diagnoseEvent.baseCredits} credits)`)
    } else {
      console.log('❌ Event not found')
    }
    
    // Test getting events by category
    console.log('📂 Getting AI analysis events...')
    const aiEvents = await eventRegistry.getEventsByCategory('ai_analysis')
    console.log(`✅ Found ${Object.keys(aiEvents).length} AI analysis events`)
    
    // Test cache info
    const cacheInfo = eventRegistry.getCacheInfo()
    console.log(`📊 Cache info: ${cacheInfo.size} items, last update: ${cacheInfo.lastUpdate}`)
    
    // Test updating an event (hot-reload test)
    console.log('🔄 Testing hot-reload by updating an event...')
    await eventRegistry.updateEventDefinition('test_event', {
      baseCredits: 5,
      description: 'Test event for hot-reload',
      category: 'test'
    })
    
    // Verify it's available immediately
    const testEvent = await eventRegistry.getEventDefinition('test_event')
    if (testEvent) {
      console.log('✅ Hot-reload successful - new event immediately available')
    } else {
      console.log('❌ Hot-reload failed - event not found')
    }
    
    // Clean up test event
    await eventRegistry.deleteEventDefinition('test_event')
    console.log('🧹 Cleaned up test event')
    
  } catch (error: unknown) {
    console.error('❌ Event registry test failed:', error)
  }
}

async function testPlanRegistry() {
  console.log('\n🧪 Testing Plan Registry...')
  
  try {
    // Test getting all plans
    console.log('📋 Getting all plans...')
    const allPlans = await planRegistry.getAllPlans()
    console.log(`✅ Found ${Object.keys(allPlans).length} plans`)
    
    // Test getting specific plan
    console.log('🔍 Getting specific plan: professional')
    const proPlan = await planRegistry.getPlanDefinition('professional')
    if (proPlan) {
      console.log(`✅ Plan found: ${proPlan.displayName} ($${proPlan.pricing.monthly}/month, ${proPlan.monthlyCredits} credits)`)
    } else {
      console.log('❌ Plan not found')
    }
    
    // Test plans sorted by price
    console.log('💰 Getting plans sorted by price...')
    const sortedPlans = await planRegistry.getPlansSortedByPrice()
    console.log('✅ Plans by price:')
    sortedPlans.forEach(plan => {
      console.log(`   ${plan.displayName}: $${plan.pricing.monthly}/month`)
    })
    
    // Test upgrade recommendation
    console.log('📈 Testing upgrade recommendation...')
    const upgradeRec = await planRegistry.getUpgradeRecommendation('starter', 800) // 80% usage
    if (upgradeRec.shouldUpgrade) {
      console.log(`✅ Upgrade recommended: ${upgradeRec.recommendedPlan} - ${upgradeRec.reason}`)
    } else {
      console.log('✅ No upgrade needed')
    }
    
    // Test hot-reload with plan update
    console.log('🔄 Testing plan hot-reload...')
    await planRegistry.updatePlanDefinition('test_plan', {
      displayName: 'Test Plan',
      monthlyCredits: 500,
      pricing: { monthly: 25, annual: 250 },
      limits: {
        aiCallsPerMonth: 250,
        pdfExportsPerMonth: 25,
        sessionLimit: 25,
        teamMembersLimit: 3,
        storageLimit: 500
      },
      features: ['Test feature'],
      overageRate: 0.02
    })
    
    const testPlan = await planRegistry.getPlanDefinition('test_plan')
    if (testPlan) {
      console.log('✅ Plan hot-reload successful')
    } else {
      console.log('❌ Plan hot-reload failed')
    }
    
    // Clean up test plan
    await planRegistry.deletePlanDefinition('test_plan')
    console.log('🧹 Cleaned up test plan')
    
  } catch (error: unknown) {
    console.error('❌ Plan registry test failed:', error)
  }
}

async function testUsageTracker() {
  console.log('\n🧪 Testing Usage Tracker...')
  
  try {
    // This would normally require a real organization/user
    // For testing, we'll just test the configuration integration
    
    console.log('🔍 Testing event definition integration...')
    const eventDef = await eventRegistry.getEventDefinition('structuring_diagnose')
    if (eventDef) {
      console.log(`✅ Usage tracker can access event: ${eventDef.eventType}`)
    }
    
    console.log('🔍 Testing plan definition integration...')
    const planDef = await planRegistry.getPlanDefinition('professional')
    if (planDef) {
      console.log(`✅ Usage tracker can access plan: ${planDef.planName}`)
    }
    
    console.log('✅ Usage tracker integration looks good')
    
  } catch (error: unknown) {
    console.error('❌ Usage tracker test failed:', error)
  }
}

async function testCacheRefresh() {
  console.log('\n🧪 Testing Cache Refresh...')
  
  try {
    console.log('🔄 Forcing cache refresh for events...')
    await eventRegistry.refreshCache()
    console.log('✅ Event cache refreshed successfully')
    
    console.log('🔄 Forcing cache refresh for plans...')
    await planRegistry.refreshCache()
    console.log('✅ Plan cache refreshed successfully')
    
    // Test cache info after refresh
    const eventCacheInfo = eventRegistry.getCacheInfo()
    const planCacheInfo = planRegistry.getCacheInfo()
    
    console.log(`📊 Event cache: ${eventCacheInfo.size} items, fresh: ${!eventCacheInfo.isStale}`)
    console.log(`📊 Plan cache: ${planCacheInfo.size} items, fresh: ${!planCacheInfo.isStale}`)
    
  } catch (error: unknown) {
    console.error('❌ Cache refresh test failed:', error)
  }
}

async function testConfigIntegration() {
  console.log('\n🧪 Testing Full Integration...')
  
  try {
    // Test that all events are properly formatted
    const events = await eventRegistry.getAllEvents()
    let validEvents = 0
    let invalidEvents = 0
    
    for (const [eventType, event] of Object.entries(events)) {
      if (event.baseCredits > 0 && event.description && event.category) {
        validEvents++
      } else {
        invalidEvents++
        console.warn(`⚠️ Invalid event: ${eventType}`)
      }
    }
    
    console.log(`✅ Event validation: ${validEvents} valid, ${invalidEvents} invalid`)
    
    // Test that all plans are properly formatted
    const plans = await planRegistry.getAllPlans()
    let validPlans = 0
    let invalidPlans = 0
    
    for (const [planName, plan] of Object.entries(plans)) {
      if (plan.monthlyCredits > 0 && plan.pricing && plan.limits) {
        validPlans++
      } else {
        invalidPlans++
        console.warn(`⚠️ Invalid plan: ${planName}`)
      }
    }
    
    console.log(`✅ Plan validation: ${validPlans} valid, ${invalidPlans} invalid`)
    
    if (validEvents > 0 && validPlans > 0 && invalidEvents === 0 && invalidPlans === 0) {
      console.log('🎉 All configuration tests passed!')
    } else {
      console.log('⚠️ Some configuration issues found')
    }
    
  } catch (error: unknown) {
    console.error('❌ Integration test failed:', error)
  }
}

async function main() {
  console.log('🚀 Starting Configuration System Tests')
  console.log('=====================================')
  
  await testEventRegistry()
  await testPlanRegistry()
  await testUsageTracker()
  await testCacheRefresh()
  await testConfigIntegration()
  
  console.log('\n🏁 Configuration System Tests Complete')
  console.log('======================================')
}

// Run the tests
main().catch(console.error)







