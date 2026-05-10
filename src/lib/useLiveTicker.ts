import { useEffect, useState } from 'react'
import {
  fetchTickerDeals,
  fetchTickerInsider,
  fetchTickerPrices,
  symbolFromTicker,
  type LiveDealsBundle,
  type LiveInsiderBundle,
  type LivePriceHistory,
} from './liveData'

export interface LiveTickerState {
  loading: boolean
  prices: LivePriceHistory | null
  deals: LiveDealsBundle | null
  insider: LiveInsiderBundle | null
  /** Latest non-null source timestamp across the bundles, for the freshness badge. */
  latestSourceDate: string | null
}

/**
 * Fetches per-ticker live data from the ingestion `data` branch in parallel.
 * All three endpoints fail gracefully — the dashboard renders mock data
 * everywhere this hook returns null.
 */
export function useLiveTicker(ticker: string | null): LiveTickerState {
  const [state, setState] = useState<LiveTickerState>({
    loading: !!ticker,
    prices: null,
    deals: null,
    insider: null,
    latestSourceDate: null,
  })

  useEffect(() => {
    if (!ticker) {
      setState({ loading: false, prices: null, deals: null, insider: null, latestSourceDate: null })
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    const symbol = symbolFromTicker(ticker)

    Promise.all([
      fetchTickerPrices(symbol).catch(() => null),
      fetchTickerDeals(symbol).catch(() => null),
      fetchTickerInsider(symbol).catch(() => null),
    ]).then(([prices, deals, insider]) => {
      if (cancelled) return
      // freshest source date we can find — prices last row date is the best proxy
      let latest: string | null = null
      if (prices && prices.rows.length > 0) {
        latest = prices.rows[prices.rows.length - 1].date
      }
      setState({ loading: false, prices, deals, insider, latestSourceDate: latest })
    })
    return () => {
      cancelled = true
    }
  }, [ticker])

  return state
}
