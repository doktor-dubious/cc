'use client'

import { forwardRef } from 'react'
import { LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface InputIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon
  label?: string
}

export const InputIcon = forwardRef<HTMLInputElement, InputIconProps>(
  ({ icon: Icon, label, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium">{label}</label>}
        <div className="relative">
          <Icon
            size={16}
            className="pointer-events-none text-muted-foreground"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          />
          <Input
            ref={ref}
            className={className}
            style={{ paddingLeft: '2.5rem' }}
            {...props}
          />
        </div>
      </div>
    )
  }
)

InputIcon.displayName = 'InputIcon'