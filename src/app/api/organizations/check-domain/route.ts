import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain parameter is required' },
        { status: 400 }
      )
    }

    // Check if an organization exists for this domain
    const organizationDomain = await prisma.organizationDomain.findFirst({
      where: { 
        domain: domain.toLowerCase() 
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })

    if (organizationDomain?.organization && organizationDomain.organization.status === 'active') {
      return NextResponse.json({
        success: true,
        exists: true,
        organizationName: organizationDomain.organization.name,
        organizationId: organizationDomain.organization.id,
        autoJoinRole: organizationDomain.autoJoinRole,
        verificationRequired: organizationDomain.verificationRequired
      })
    }

    return NextResponse.json({
      success: true,
      exists: false
    })

  } catch (error: unknown) {
    console.error('Domain check error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

