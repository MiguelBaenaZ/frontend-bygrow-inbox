import { cn, getInitials } from '@/lib/utils'

const avatarTints = [
  'bg-[#e3edda] text-[#1f5a45] dark:bg-[#203227] dark:text-[#d7eccf]',
  'bg-[#f1ecd8] text-[#594d1f] dark:bg-[#302b1d] dark:text-[#e8dfbd]',
  'bg-[#e6efea] text-[#285645] dark:bg-[#1d2e28] dark:text-[#cfe8dd]',
  'bg-[#eef8d9] text-[#3e5118] dark:bg-[#29331d] dark:text-[#e1f0c7]',
]

function tintFor(seed: string): string {
  let hash = 0
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % 10_000
  }
  return avatarTints[hash % avatarTints.length] ?? avatarTints[0]
}

interface UserAvatarProps {
  name?: string | null
  email?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-[11px]',
  lg: 'size-11 text-[13px]',
} as const

export function UserAvatar({ name, email, size = 'md', className }: UserAvatarProps) {
  const seed = email || name || 'bygrow'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        sizeClasses[size],
        tintFor(seed),
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name || email)}
    </span>
  )
}
