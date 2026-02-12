import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ButtonAnimatedLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode
}

export const ButtonAnimatedLink = ({ children, className, href = '#', ...props }: ButtonAnimatedLinkProps) => {
  return (
    <Button
      variant="link"
      className={cn(
        'after:bg-primary relative !no-underline after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-bottom-right after:scale-x-0 after:transition-transform after:duration-500 after:ease-in-out hover:after:origin-bottom-left hover:after:scale-x-100', className
      )}
      asChild
    >
      <a href={href} {...props}>
        {children}
      </a>
    </Button>
  )
}