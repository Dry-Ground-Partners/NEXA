#!/usr/bin/env tsx

/**
 * Seed initial event and plan definitions using Prisma client
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const eventDefinitions = [
  // STRUCTURING EVENTS
  {
    eventType: 'structuring_diagnose',
    config: {
      baseCredits: 10,
      description: 'Problem analysis in Structuring',
      category: 'ai_analysis',
      endpoint: '/api/structuring/diagnose',
      multipliers: {
        complexity: { min: 1.0, max: 2.5 },
        features: { echo: 5, traceback: 3 }
      }
    }
  },
  {
    eventType: 'structuring_generate_solution',
    config: {
      baseCredits: 15,
      description: 'Solution generation with optional enhancements',
      category: 'ai_analysis',
      endpoint: '/api/structuring/generate-solution',
      multipliers: {
        features: { echo: 5, traceback: 3 }
      }
    }
  },

  // VISUALS EVENTS
  {
    eventType: 'visuals_planning',
    config: {
      baseCredits: 8,
      description: 'Visual planning generation',
      category: 'ai_visual',
      endpoint: '/api/visuals/planning'
    }
  },
  {
    eventType: 'visuals_sketch',
    config: {
      baseCredits: 12,
      description: 'Visual sketch creation (the arrows)',
      category: 'ai_visual',
      endpoint: '/api/visuals/sketch'
    }
  },

  // SOLUTIONING EVENTS
  {
    eventType: 'solutioning_image_analysis',
    config: {
      baseCredits: 8,
      description: 'Image analysis in Solutioning',
      category: 'ai_analysis',
      endpoint: '/api/solutioning/image-analysis'
    }
  },
  {
    eventType: 'solutioning_ai_enhance',
    config: {
      baseCredits: 12,
      description: 'AI enhancement in Solutioning',
      category: 'ai_enhancement',
      endpoint: '/api/solutioning/ai-enhance'
    }
  },
  {
    eventType: 'solutioning_structure_solution',
    config: {
      baseCredits: 15,
      description: 'Structure solution generation',
      category: 'ai_analysis',
      endpoint: '/api/solutioning/structure-solution'
    }
  },
  {
    eventType: 'solutioning_node_stack',
    config: {
      baseCredits: 6,
      description: 'Per node stack generation',
      category: 'ai_analysis',
      endpoint: '/api/solutioning/node-stack',
      multipliers: {
        complexity: { min: 1.0, max: 3.0 }
      }
    }
  },
  {
    eventType: 'solutioning_formatting',
    config: {
      baseCredits: 5,
      description: 'Solution formatting',
      category: 'formatting',
      endpoint: '/api/solutioning/formatting'
    }
  },
  {
    eventType: 'solutioning_hyper_canvas',
    config: {
      baseCredits: 10,
      description: 'Hyper-canvas usage',
      category: 'ai_canvas',
      endpoint: '/api/solutioning/hyper-canvas'
    }
  },

  // DATA PUSH EVENTS
  {
    eventType: 'push_structuring_to_visuals',
    config: {
      baseCredits: 3,
      description: 'Push data from Structuring to Visuals',
      category: 'data_transfer',
      endpoint: '/api/push/structuring-to-visuals'
    }
  },
  {
    eventType: 'push_visuals_to_solutioning',
    config: {
      baseCredits: 3,
      description: 'Push data from Visuals to Solutioning',
      category: 'data_transfer',
      endpoint: '/api/push/visuals-to-solutioning'
    }
  },
  {
    eventType: 'push_solutioning_to_sow',
    config: {
      baseCredits: 5,
      description: 'Push data from Solutioning to SoW',
      category: 'data_transfer',
      endpoint: '/api/push/solutioning-to-sow'
    }
  },
  {
    eventType: 'push_sow_to_loe',
    config: {
      baseCredits: 5,
      description: 'Push data from SoW to LoE',
      category: 'data_transfer',
      endpoint: '/api/push/sow-to-loe'
    }
  }
]

const planDefinitions = [
  {
    planName: 'free',
    config: {
      displayName: 'Free Plan',
      monthlyCredits: 100,
      pricing: {
        monthly: 0,
        annual: 0
      },
      limits: {
        aiCallsPerMonth: 50,
        pdfExportsPerMonth: 5,
        sessionLimit: 10,
        teamMembersLimit: 1,
        storageLimit: 100
      },
      features: [
        'Basic AI tools',
        'PDF exports',
        'Community support'
      ],
      overageRate: 0
    }
  },
  {
    planName: 'starter',
    config: {
      displayName: 'Starter Plan',
      monthlyCredits: 1000,
      pricing: {
        monthly: 19,
        annual: 190
      },
      limits: {
        aiCallsPerMonth: 500,
        pdfExportsPerMonth: 50,
        sessionLimit: 50,
        teamMembersLimit: 5,
        storageLimit: 1000
      },
      features: [
        'All AI tools',
        'Unlimited PDFs',
        'Email support'
      ],
      overageRate: 0.015
    }
  },
  {
    planName: 'professional',
    config: {
      displayName: 'Professional Plan',
      monthlyCredits: 5000,
      pricing: {
        monthly: 49,
        annual: 490
      },
      limits: {
        aiCallsPerMonth: 2000,
        pdfExportsPerMonth: 200,
        sessionLimit: 200,
        teamMembersLimit: 20,
        storageLimit: 5000
      },
      features: [
        'Advanced AI',
        'Priority support',
        'Custom branding'
      ],
      overageRate: 0.01
    }
  },
  {
    planName: 'enterprise',
    config: {
      displayName: 'Enterprise Plan',
      monthlyCredits: 15000,
      pricing: {
        monthly: 99,
        annual: 990
      },
      limits: {
        aiCallsPerMonth: -1,
        pdfExportsPerMonth: -1,
        sessionLimit: -1,
        teamMembersLimit: -1,
        storageLimit: 20000
      },
      features: [
        'Unlimited AI',
        'Dedicated support',
        'SSO',
        'API access'
      ],
      overageRate: 0.005
    }
  }
]

async function seedEventDefinitions() {
  console.log('🌱 Seeding event definitions...')
  
  for (const event of eventDefinitions) {
    try {
      await prisma.eventDefinition.upsert({
        where: { eventType: event.eventType },
        update: { config: event.config },
        create: { 
          eventType: event.eventType, 
          config: event.config 
        }
      })
      console.log(`✅ Event: ${event.eventType}`)
    } catch (error: unknown) {
      console.error(`❌ Failed to seed event ${event.eventType}:`, error)
    }
  }
  
  console.log(`🎉 Seeded ${eventDefinitions.length} event definitions`)
}

async function seedPlanDefinitions() {
  console.log('🌱 Seeding plan definitions...')
  
  for (const plan of planDefinitions) {
    try {
      await prisma.planDefinition.upsert({
        where: { planName: plan.planName },
        update: { config: plan.config },
        create: { 
          planName: plan.planName, 
          config: plan.config 
        }
      })
      console.log(`✅ Plan: ${plan.planName}`)
    } catch (error: unknown) {
      console.error(`❌ Failed to seed plan ${plan.planName}:`, error)
    }
  }
  
  console.log(`🎉 Seeded ${planDefinitions.length} plan definitions`)
}

async function main() {
  console.log('🚀 Starting initial data seeding...')
  console.log('================================')
  
  try {
    await seedEventDefinitions()
    await seedPlanDefinitions()
    
    console.log('\n🎉 Seeding completed successfully!')
    console.log('You can now test the configuration system.')
    
  } catch (error: unknown) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)









