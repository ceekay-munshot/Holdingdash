import { useEffect, useState } from 'react'
import type { Company } from '../types'
import { companyMaster as featured } from '../data/companyMaster'
import { fetchEquityMaster, type LiveCompany } from './liveData'

export interface EquityMasterState {
  loading: boolean
  source: 'featured' | 'live' | 'mixed'
  updated: string | null
  featured: Company[]
  all: Company[]
}

function fromLive(c: LiveCompany): Company {
  return {
    name: c.name,
    ticker: c.ticker,
    exchange: 'NSE',
    country: 'India',
  }
}

/**
 * Returns the equity master with `featured` (curated 10) and `all` (full
 * NSE list when live data is reachable). Featured always present so the
 * UI works even on first load before the network hop resolves.
 */
export function useEquityMaster(): EquityMasterState {
  const [state, setState] = useState<EquityMasterState>(() => ({
    loading: true,
    source: 'featured',
    updated: null,
    featured,
    all: featured,
  }))

  useEffect(() => {
    let cancelled = false
    fetchEquityMaster()
      .then((live) => {
        if (cancelled) return
        if (!live || !Array.isArray(live.companies) || live.companies.length === 0) {
          setState((s) => ({ ...s, loading: false }))
          return
        }
        // Merge: featured first (already curated), then any live company not in featured
        const featuredTickers = new Set(featured.map((c) => c.ticker))
        const liveCompanies = live.companies.map(fromLive)
        const merged: Company[] = [
          ...featured,
          ...liveCompanies.filter((c) => !featuredTickers.has(c.ticker)),
        ]
        setState({
          loading: false,
          source: 'live',
          updated: live.updated,
          featured,
          all: merged,
        })
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
