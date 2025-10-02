import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizationAccess } from '@/lib/api-rbac'
import { prisma } from '@/lib/prisma'
import { eventRegistry } from '@/lib/config/event-registry'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    const url = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100) // Max 100 items
    const eventType = url.searchParams.get('eventType')
    const userId = url.searchParams.get('userId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const category = url.searchParams.get('category')
    const minCredits = url.searchParams.get('minCredits')
    const maxCredits = url.searchParams.get('maxCredits')
    const sessionId = url.searchParams.get('sessionId')

    console.log(`📊 API: Usage history request for org ${orgId}`, {
      page, limit, eventType, userId, startDate, endDate, category
    })

    // RBAC check - organization access required
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Organization access required' },
        { status: 403 }
      )
    }

    // Build filters for the query
    const where: any = { organizationId: orgId }
    
    // Event type filter
    if (eventType) {
      where.eventType = eventType
    }
    
    // User filter
    if (userId) {
      where.userId = userId
    }
    
    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }
    
    // Credits range filter
    if (minCredits || maxCredits) {
      where.creditsConsumed = {}
      if (minCredits) {
        where.creditsConsumed.gte = parseInt(minCredits)
      }
      if (maxCredits) {
        where.creditsConsumed.lte = parseInt(maxCredits)
      }
    }
    
    // Session filter
    if (sessionId) {
      where.sessionId = parseInt(sessionId)
    }

    // Get event definitions for category filtering and enrichment
    const eventDefinitions = await eventRegistry.getAllEvents()
    
    // Category filter (requires checking event definitions)
    let categoryFilteredEventTypes: string[] | undefined
    if (category) {
      categoryFilteredEventTypes = Object.entries(eventDefinitions)
        .filter(([_, def]) => def.category === category)
        .map(([eventType, _]) => eventType)
      
      if (categoryFilteredEventTypes.length === 0) {
        // No events match this category
        return NextResponse.json({
          success: true,
          events: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          },
          filters: { category, eventType, userId, startDate, endDate },
          summary: {
            totalCredits: 0,
            totalEvents: 0,
            uniqueUsers: 0,
            dateRange: { start: null, end: null }
          }
        })
      }
      
      where.eventType = { in: categoryFilteredEventTypes }
    }

    // Get usage events with pagination
    const [events, total] = await Promise.all([
      prisma.usageEvent.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, email: true }
          },
          session: {
            select: { id: true, uuid: true, title: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.usageEvent.count({ where })
    ])

    // Enrich events with event definitions
    const enrichedEvents = events.map(event => {
      const eventDef = eventDefinitions[event.eventType]
      
      return {
        id: event.id,
        eventType: event.eventType,
        eventName: eventDef?.description || event.eventType,
        category: eventDef?.category || 'unknown',
        creditsConsumed: event.creditsConsumed,
        user: {
          id: event.user.id,
          name: event.user.fullName || event.user.email,
          email: event.user.email
        },
        session: event.session ? {
          id: event.session.id,
          uuid: event.session.uuid,
          title: event.session.title || 'Untitled Session'
        } : null,
        eventData: event.eventData,
        createdAt: event.createdAt.toISOString(),
        // Additional calculated fields
        complexity: (event.eventData as any)?.complexity || 1.0,
        endpoint: (event.eventData as any)?.endpoint || 'unknown'
      }
    })

    // Calculate summary statistics
    const totalCredits = events.reduce((sum, event) => sum + event.creditsConsumed, 0)
    const uniqueUsers = new Set(events.map(event => event.userId)).size
    const dateRange = events.length > 0 ? {
      start: events[events.length - 1].createdAt.toISOString(),
      end: events[0].createdAt.toISOString()
    } : { start: null, end: null }

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    console.log(`✅ API: Found ${events.length} usage events for org ${orgId}`)

    return NextResponse.json({
      success: true,
      events: enrichedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      },
      filters: {
        eventType,
        userId,
        startDate,
        endDate,
        category,
        minCredits,
        maxCredits,
        sessionId
      },
      summary: {
        totalCredits,
        totalEvents: events.length,
        uniqueUsers,
        dateRange
      }
    })

  } catch (error: unknown) {
    console.error('❌ Usage history error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}




