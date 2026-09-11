import { cn } from '@/utils/cn'

const variants = {
  default: 'bg-primary-700 text-white hover:bg-primary-600',
  destructive: 'bg-red-600 text-white hover:bg-red-500',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary-700 dark:text-primary-400 underline-offset-4 hover:underline',
}

const sizes = {
  default: 'h-11 px-4 py-2',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-12 px-8',
  icon: 'h-11 w-11',
}

export function Button({ className, variant = 'default', size = 'default', children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
