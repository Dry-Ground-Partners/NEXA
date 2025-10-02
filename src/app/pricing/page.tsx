'use client'

import { Card } from '@/components/ui/card'
import { Check } from 'lucide-react'

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$19",
      period: "/month",
      credits: "1,000",
      features: [
        "Grid sessions & management",
        "Basic structuring tools",
        "Visual diagram creation",
        "Standard support"
      ]
    },
    {
      name: "Professional",
      price: "$49",
      period: "/month",
      credits: "5,000",
      features: [
        "Everything in Starter",
        "Advanced solutioning",
        "SoW generation",
        "LoE calculations",
        "Priority support"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/month",
      credits: "15,000",
      features: [
        "Everything in Professional",
        "Unlimited organizations",
        "Advanced analytics",
        "Custom integrations",
        "Dedicated support"
      ]
    }
  ]

  return (
    <div className="min-h-screen flex items-center justify-center nexa-background p-5">
      <Card variant="nexa" className="w-full max-w-4xl p-10">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <img
            src="/images/nexaicon.png?v=1"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              console.log('Image failed to load:', target.src)
              target.src = '/images/nexanonameicon.png?v=1'
            }}
            alt="NEXA"
            className="h-24 w-auto mx-auto object-contain mb-4"
          />
          <h1 className="text-white text-3xl font-bold mb-2">
            NEXA Studio Pricing
          </h1>
          <p className="text-nexa-muted text-lg">
            Choose the perfect plan for your AI-powered consulting needs
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`
                relative p-6 rounded-lg border transition-all duration-200
                ${plan.popular 
                  ? 'border-white/30 bg-white/5' 
                  : 'border-nexa-border bg-black/20'
                }
                hover:bg-white/10 hover:border-white/40
              `}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-white text-black text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-white text-xl font-semibold mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-white text-3xl font-bold">
                    {plan.price}
                  </span>
                  <span className="text-nexa-muted text-sm">
                    {plan.period}
                  </span>
                </div>
                <p className="text-nexa-muted text-sm">
                  {plan.credits} AI credits included
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span className="text-nexa-muted text-sm">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={`
                  w-full py-3 rounded-lg font-medium transition-all duration-200
                  ${plan.popular
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  }
                `}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 pt-6 border-t border-nexa-border">
          <p className="text-nexa-muted text-sm">
            All plans include our core AI tools and regular updates.
          </p>
          <p className="text-nexa-muted text-xs mt-2">
            Credits reset monthly. Unused credits do not roll over.
          </p>
        </div>
      </Card>
    </div>
  )
}






