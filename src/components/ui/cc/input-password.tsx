'use client'
import { useState, forwardRef } from 'react'
import { LucideIcon, EyeIcon, EyeOffIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface InputPasswordProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  icon: LucideIcon
  label?: string
}

export const InputPassword = forwardRef<HTMLInputElement, InputPasswordProps>(
  ({ icon: Icon, label, className, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false)

    const toggleVisibility = () => setIsVisible(prevState => !prevState)

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
            type={isVisible ? 'text' : 'password'}
            className={className}
            style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleVisibility}
            className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
            aria-label={isVisible ? 'Hide password' : 'Show password'}
          >
            {isVisible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            <span className="sr-only">{isVisible ? 'Hide password' : 'Show password'}</span>
          </Button>
        </div>
      </div>
    )
  }
)

InputPassword.displayName = 'InputPassword'