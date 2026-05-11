import { useEffect, useState } from 'react'
import {
  fetchTickerDeals,
  fetchTickerInsider,
  fetchTickerPrices,
  fetchTickerShareholding,
  symbolFromTicker,
  type LiveDealsBundle,
  type LiveInsiderBundle,
  type LivePriceHistory,
  type LiveShareholding,
} from './liveData'

export interface LiveTickerState {
  loading: boolean
  prices: LivePriceHistory | null
  deals: LiveDealsBundle | null
  insider: LiveInsiderBundle | null
  shareholding: LiveShareholding | null
  /** Latest non-null source timestamp across the bundles, for the freshness badge. */
  latestSourceDate: string | null
}

/**
 * Fetches per-ticker live data from the ingestion `data` branch in parallel.
 * All endpoints fail gracefully — the dashboard renders mock data
 * everywhere this hook returns null.
 */
export function useLiveTicker(ticker: string | null): LiveTickerState {
  const [state, setState] = useState<LiveTickerState>({
    loading: !!ticker,
    prices: null,
    deals: null,
    insider: null,
    shareholding: null,
    latestSourceDate: null,
  })

  useEffect(() => {
    if (!ticker) {
      setState({
        loading: false,
        prices: null,
        deals: null,
        insider: null,
        shareholding: null,
        latestSourceDate: null,
      })
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    const symbol = symbolFromTicker(ticker)

    Promise.all([
      fetchTickerPrices(symbol).catch(() => null),
      fetchTickerDeals(symbol).catch(() => null),
      fetchTickerInsider(symbol).catch(() => null),
      fetchTickerShareholding(symbol).catch(() => null),
    ]).then(([prices, deals, insider, shareholding]) => {
      if (cancelled) return
      let latest: string | null = null
      if (prices && prices.rows.length > 0) {
        latest = prices.rows[prices.rows.length - 1].date
      }
      setState({ loading: false, prices, deals, insider, shareholding, latestSourceDate: latest })
    })
    return () => {
      cancelled = true
    }
  }, [ticker])

  return state
}
