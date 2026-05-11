/**
 * Live data client. Reads from the ingestion `data` branch via jsDelivr CDN
 * (primary) with raw.githubusercontent.com as fallback. All endpoints return
 * `null` on any failure so callers can fall back to mock data gracefully.
 *
 * Branch layout (see ingestion/README.md):
 *   equity_master.json
 *   prices/latest.json
 *   deals/latest.json
 *   insider/latest.json                  (may be missing if NSE blocked)
 *   by_ticker/{SYMBOL}/{prices,deals,insider}.json
 */

const REPO_OWNER = 'ceekay-munshot'
const REPO_NAME = 'Holdingdash'
const DATA_BRANCH = 'data'

const PRIMARY_BASE = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@${DATA_BRANCH}`
const FALLBACK_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${DATA_BRANCH}`

/* ===== types mirroring the ingestion output ===== */

export interface LiveCompany {
  symbol: string
  ticker: string
  name: string
  isin: string
  series: string
  listingDate: string | null
  faceValue: number | null
  marketLot: number | null
  paidUpValue: number | null
}

export interface LiveEquityMaster {
  updated: string
  count: number
  companies: LiveCompany[]
}

export interface LivePriceRow {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface LivePriceHistory {
  symbol: string
  count: number
  rows: LivePriceRow[]
}

export interface LiveDealRow {
  date: string | null
  symbol: string
  securityName: string
  clientName: string
  buySell: string
  quantity: number
  price: number
  value: number // INR Cr
}

export interface LiveDealsBundle {
  symbol: string
  bulk: { count: number; rows: LiveDealRow[] }
  block: { count: number; rows: LiveDealRow[] }
}

export interface LiveInsiderRow {
  symbol: string
  company: string
  insider: string
  category: string
  type: string
  txnType: string
  quantity: number
  value: number
  fromDate: string
  toDate: string
  intimationDate: string
  broadcastDate: string
}

export interface LiveInsiderBundle {
  symbol: string
  count: number
  rows: LiveInsiderRow[]
}

export interface LiveShareholdingQuarter {
  period: string // e.g. "Mar 2024"
  periodIso: string | null // e.g. "2024-03-31"
  promoter: number
  fii: number
  dii: number
  public: number
  government: number
  others: number
}

export interface LiveShareholding {
  symbol: string
  source: string
  updated: string
  count: number
  quarters: LiveShareholdingQuarter[]
}

export type TopHolderCategory =
  | 'foreign_institutions'
  | 'domestic_institutions'
  | 'public'
  | 'government'

/** Per-holder map: period label ("Mar 2024") → percent string ("1.54"). Plus an
 *  optional __personUrl pointing at Screener's holder detail page. */
export interface LiveHolderPeriods {
  [period: string]: string
}

export interface LiveTopHolders {
  symbol: string
  source: string
  updated: string
  screenerCompanyId: string
  categories: {
    [cat in TopHolderCategory]?: {
      [holderName: string]: LiveHolderPeriods
    }
  }
}

/* ===== fetch helpers ===== */

const memoryCache = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

async function fetchJson<T>(path: string): Promise<T | null> {
  if (memoryCache.has(path)) return memoryCache.get(path) as T
  const existing = inflight.get(path)
  if (existing) return existing as Promise<T | null>

  const promise = (async () => {
    for (const base of [PRIMARY_BASE, FALLBACK_BASE]) {
      try {
        const res = await fetch(`${base}/${path}`, { cache: 'default' })
        if (!res.ok) continue
        const data = (await res.json()) as T
        memoryCache.set(path, data)
        return data
      } catch {
        // try next base
      }
    }
    return null
  })()

  inflight.set(path, promise as Promise<unknown>)
  try {
    return await promise
  } finally {
    inflight.delete(path)
  }
}

/* ===== public API ===== */

export function fetchEquityMaster(): Promise<LiveEquityMaster | null> {
  return fetchJson<LiveEquityMaster>('equity_master.json')
}

export function fetchTickerPrices(symbol: string): Promise<LivePriceHistory | null> {
  return fetchJson<LivePriceHistory>(`by_ticker/${encodeURIComponent(symbol)}/prices.json`)
}

export function fetchTickerDeals(symbol: string): Promise<LiveDealsBundle | null> {
  return fetchJson<LiveDealsBundle>(`by_ticker/${encodeURIComponent(symbol)}/deals.json`)
}

export function fetchTickerInsider(symbol: string): Promise<LiveInsiderBundle | null> {
  return fetchJson<LiveInsiderBundle>(`by_ticker/${encodeURIComponent(symbol)}/insider.json`)
}

export function fetchTickerShareholding(symbol: string): Promise<LiveShareholding | null> {
  return fetchJson<LiveShareholding>(`by_ticker/${encodeURIComponent(symbol)}/shareholding.json`)
}

export function fetchTickerTopHolders(symbol: string): Promise<LiveTopHolders | null> {
  return fetchJson<LiveTopHolders>(`by_ticker/${encodeURIComponent(symbol)}/top_holders.json`)
}

/** Strips the .NS suffix used in the dashboard's internal ticker format. */
export function symbolFromTicker(ticker: string): string {
  return ticker.replace(/\.NS$/i, '').replace(/\.BO$/i, '')
}
