import { NextRequest, NextResponse } from 'next/server'
import { eventRegistry } from '@/lib/config/event-registry'
import { planRegistry } from '@/lib/config/plan-registry'
import { getUserRoleFromRequest } from '@/lib/api-rbac'

/**
 * Admin API for managing configuration
 * This endpoint allows hot-reloading of event and plan definitions
 */

export async function GET(request: NextRequest) {
  try {
    // For now, allow any authenticated user to view config
    // In production, you might want to restrict this to admins only
    const { user } = await getUserRoleFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const type = url.searchParams.get('type') // 'events' | 'plans' | 'cache-info'

    switch (type) {
      case 'events':
        const events = await eventRegistry.getAllEvents()
        return NextResponse.json({
          success: true,
          data: events,
          count: Object.keys(events).length
        })

      case 'plans':
        const plans = await planRegistry.getAllPlans()
        return NextResponse.json({
          success: true,
          data: plans,
          count: Object.keys(plans).length
        })

      case 'cache-info':
        const eventCacheInfo = eventRegistry.getCacheInfo()
        const planCacheInfo = planRegistry.getCacheInfo()
        return NextResponse.json({
          success: true,
          data: {
            events: eventCacheInfo,
            plans: planCacheInfo
          }
        })

      default:
        // Return both events and plans by default
        const [allEvents, allPlans] = await Promise.all([
          eventRegistry.getAllEvents(),
          planRegistry.getAllPlans()
        ])
        
        return NextResponse.json({
          success: true,
          data: {
            events: allEvents,
            plans: allPlans
          },
          counts: {
            events: Object.keys(allEvents).length,
            plans: Object.keys(allPlans).length
          }
        })
    }

  } catch (error: unknown) {
    console.error('Config API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for admin permissions
    const { user, role } = await getUserRoleFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // For now, allow any authenticated user to update config
    // In production, restrict to admin/owner roles only
    // if (!['owner', 'admin'].includes(role || '')) {
    //   return NextResponse.json(
    //     { error: 'Admin privileges required' },
    //     { status: 403 }
    //   )
    // }

    const body = await request.json()
    const { type, action, data } = body

    switch (type) {
      case 'event':
        switch (action) {
          case 'update':
            await eventRegistry.updateEventDefinition(data.eventType, data.config)
            return NextResponse.json({
              success: true,
              message: `Event ${data.eventType} updated successfully`
            })

          case 'delete':
            await eventRegistry.deleteEventDefinition(data.eventType)
            return NextResponse.json({
              success: true,
              message: `Event ${data.eventType} deleted successfully`
            })

          case 'refresh':
            await eventRegistry.refreshCache()
            return NextResponse.json({
              success: true,
              message: 'Event cache refreshed successfully'
            })

          default:
            return NextResponse.json(
              { error: 'Invalid action for event' },
              { status: 400 }
            )
        }

      case 'plan':
        switch (action) {
          case 'update':
            await planRegistry.updatePlanDefinition(data.planName, data.config)
            return NextResponse.json({
              success: true,
              message: `Plan ${data.planName} updated successfully`
            })

          case 'delete':
            await planRegistry.deletePlanDefinition(data.planName)
            return NextResponse.json({
              success: true,
              message: `Plan ${data.planName} deleted successfully`
            })

          case 'refresh':
            await planRegistry.refreshCache()
            return NextResponse.json({
              success: true,
              message: 'Plan cache refreshed successfully'
            })

          default:
            return NextResponse.json(
              { error: 'Invalid action for plan' },
              { status: 400 }
            )
        }

      case 'cache':
        switch (action) {
          case 'refresh-all':
            await Promise.all([
              eventRegistry.refreshCache(),
              planRegistry.refreshCache()
            ])
            return NextResponse.json({
              success: true,
              message: 'All caches refreshed successfully'
            })

          default:
            return NextResponse.json(
              { error: 'Invalid cache action' },
              { status: 400 }
            )
        }

      default:
        return NextResponse.json(
          { error: 'Invalid configuration type' },
          { status: 400 }
        )
    }

  } catch (error: unknown) {
    console.error('Config update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update configuration' },
      { status: 500 }
    )
  }
}




