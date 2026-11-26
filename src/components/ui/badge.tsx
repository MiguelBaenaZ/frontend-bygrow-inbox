import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-secondary text-secondary-foreground',
        neutral: 'border-border bg-muted text-muted-foreground',
        bot: 'border-transparent bg-secondary text-secondary-foreground',
        human: 'border-border bg-sheet text-foreground',
        open: 'border-brote/60 bg-brote-soft text-brote-ink',
        warning: 'border-warning/30 bg-warning-soft text-warning-ink',
        danger: 'border-transparent bg-danger-soft text-danger-ink',
        outline: 'border-border bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
