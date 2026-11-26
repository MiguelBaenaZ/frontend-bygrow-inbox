import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTheme } from '@/features/theme/theme-context'

function Toaster({ ...props }: ToasterProps) {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            'font-sans !rounded-lg !border !border-border !bg-sheet !text-foreground !shadow-[var(--shadow-float)]',
          title: '!text-sm !font-semibold',
          description: '!text-[13px] !text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground !font-medium',
          cancelButton: '!bg-muted !text-foreground',
          closeButton: '!bg-sheet !border-border !text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
