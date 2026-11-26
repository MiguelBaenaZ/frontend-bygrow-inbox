import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function getInitials(name: string | null | undefined, fallback = '?'): string {
  const clean = name?.trim()
  if (!clean) return fallback
  const parts = clean.split(/\s+/).filter(Boolean)
  const first = parts[0]
  if (!first) return fallback
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined
  if (!last) return first.slice(0, 2).toUpperCase()
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .trim()
}

export function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value)
  }
  return Promise.reject(new Error('clipboard_unavailable'))
}
