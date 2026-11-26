import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState } from 'react'

import { Input, type InputProps } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function PasswordInput({ className, disabled, ...props }: InputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        disabled={disabled}
      >
        {visible ? (
          <EyeOffIcon className="size-4" aria-hidden="true" />
        ) : (
          <EyeIcon className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
