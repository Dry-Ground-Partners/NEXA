'use client'

import { useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuickActionButtonProps {
  icon: ReactNode
  title: string
  description: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  loadingIcon?: ReactNode
  className?: string
  variant?: 'default' | 'active' | 'success' | 'warning' | 'info'
}

export function QuickActionButton({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  loading = false,
  loadingIcon,
  className = '',
  variant = 'default'
}: QuickActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Variant colors
  const variantClasses = {
    default: 'border-nexa-border text-white hover:bg-white/10',
    active: 'bg-blue-900/40 border-blue-600 text-blue-200 hover:bg-blue-800/60',
    success: 'bg-green-900/40 border-green-600 text-green-200 hover:bg-green-800/60',
    warning: 'bg-yellow-900/40 border-yellow-600 text-yellow-200 hover:bg-yellow-800/60',
    info: 'bg-black border-blue-600 text-blue-200 hover:bg-blue-900/20'
  }

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* The Button */}
      <Button
        onClick={onClick}
        variant="outline"
        size="sm"
        disabled={disabled}
        className={cn(
          'h-8 w-8 p-0 transition-all duration-200',
          variantClasses[variant],
          className
        )}
        title={title}
      >
        {loading && loadingIcon ? loadingIcon : icon}
      </Button>

      {/* Hover Content Container - Pushes layout */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          isHovered ? 'ml-3 max-w-[280px] opacity-100' : 'ml-0 max-w-0 opacity-0'
        )}
      >
        {/* Button Name - Inline with button, pushes content */}
        <div className="text-white font-medium text-sm whitespace-nowrap">
          {title}
        </div>
      </div>

      {/* Divisor + Explanation Panel - Absolute positioned, hovers over content */}
      {isHovered && (
        <div 
          className="absolute left-0 top-full mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ minWidth: '320px' }}
        >
          {/* Divisor */}
          <div className="w-full h-px bg-gradient-to-r from-nexa-border via-white/20 to-nexa-border mb-2" />
          
          {/* Explanation Panel - Styled like sidebar */}
          <div className="bg-black/95 backdrop-blur-sm border border-nexa-border rounded-lg p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-1 flex-shrink-0 text-nexa-accent">
                {icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium text-sm mb-2">
                  {title}
                </h4>
                <p className="text-nexa-muted text-xs leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

