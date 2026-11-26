import { useEffect } from 'react'

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · ByGrow Inbox` : 'ByGrow Inbox'
    return () => {
      document.title = previous
    }
  }, [title])
}
