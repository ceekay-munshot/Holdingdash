import { useCallback, useEffect, useState } from 'react'
import type { Company } from '../types'

const STORAGE_KEY = 'holdingdash:recents'
const MAX_RECENTS = 5

function readRecents(): Company[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (c) =>
          c &&
          typeof c.name === 'string' &&
          typeof c.ticker === 'string' &&
          typeof c.exchange === 'string' &&
          typeof c.country === 'string',
      )
      .slice(0, MAX_RECENTS)
  } catch {
    return []
  }
}

function writeRecents(list: Company[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)))
  } catch {
    // ignore (private mode etc.)
  }
}

export function useRecents() {
  const [recents, setRecents] = useState<Company[]>(() => readRecents())

  useEffect(() => {
    writeRecents(recents)
  }, [recents])

  const addRecent = useCallback((company: Company) => {
    setRecents((prev) => {
      const without = prev.filter((c) => c.ticker !== company.ticker)
      return [company, ...without].slice(0, MAX_RECENTS)
    })
  }, [])

  const clearRecents = useCallback(() => setRecents([]), [])

  return { recents, addRecent, clearRecents }
}
