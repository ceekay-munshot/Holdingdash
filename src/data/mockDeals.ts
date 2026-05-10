import type { BulkBlockDeal } from '../types'

interface DealConfig {
  deals: BulkBlockDeal[]
  read: string
}

const CONFIGS: Record<string, DealConfig> = {
  'RELIANCE.NS': {
    read: 'Bulk and block deal flow shows institutional rotation rather than exits. Net flow is mildly positive at small premiums.',
    deals: [
      { date: '2026-04-22', buyer: 'Government of Singapore', seller: 'Vanguard Group', dealType: 'Block', value: 412.5, premiumPct: 0.4, signal: 'Institutional Accumulation' },
      { date: '2026-03-18', buyer: 'SBI Mutual Fund', seller: 'BlackRock', dealType: 'Block', value: 286.8, premiumPct: 0.2, signal: 'Churn' },
      { date: '2026-02-09', buyer: 'ICICI Pru Mutual Fund', seller: 'Capital Group', dealType: 'Block', value: 198.4, premiumPct: -0.6, signal: 'Churn' },
      { date: '2026-01-15', buyer: 'Norges Bank', seller: 'Open Market', dealType: 'Bulk', value: 142.0, premiumPct: 0.8, signal: 'Institutional Accumulation' },
      { date: '2025-12-04', buyer: 'HDFC Mutual Fund', seller: 'Fidelity', dealType: 'Block', value: 162.3, premiumPct: -0.3, signal: 'Neutral' },
    ],
  },
  'HDFCBANK.NS': {
    read: 'Bulk and block deal flow is constructive. Multiple institutions accumulated post-merger at modest premiums.',
    deals: [
      { date: '2026-04-29', buyer: 'GIC Singapore', seller: 'Capital Group', dealType: 'Block', value: 612.0, premiumPct: 0.5, signal: 'Institutional Accumulation' },
      { date: '2026-04-08', buyer: 'SBI Mutual Fund', seller: 'BlackRock', dealType: 'Block', value: 488.0, premiumPct: 0.3, signal: 'Churn' },
      { date: '2026-03-12', buyer: 'LIC of India', seller: 'Vanguard Group', dealType: 'Block', value: 402.5, premiumPct: 0.6, signal: 'Institutional Accumulation' },
      { date: '2026-02-19', buyer: 'Nippon Mutual Fund', seller: 'JPMorgan AM', dealType: 'Block', value: 286.4, premiumPct: -0.1, signal: 'Churn' },
      { date: '2026-01-26', buyer: 'Government of Singapore', seller: 'Schroders', dealType: 'Block', value: 318.2, premiumPct: 0.8, signal: 'Institutional Accumulation' },
      { date: '2025-12-15', buyer: 'Axis Mutual Fund', seller: 'Norges Bank', dealType: 'Block', value: 162.0, premiumPct: 0.2, signal: 'Neutral' },
    ],
  },
  'INFY.NS': {
    read: 'Bulk and block deal flow is neutral. Mostly two-way institutional churn at small premiums or discounts.',
    deals: [
      { date: '2026-04-15', buyer: 'ICICI Pru Mutual Fund', seller: 'Capital Group', dealType: 'Block', value: 244.6, premiumPct: 0.3, signal: 'Churn' },
      { date: '2026-03-08', buyer: 'Government of Singapore', seller: 'BlackRock', dealType: 'Block', value: 188.4, premiumPct: -0.2, signal: 'Churn' },
      { date: '2026-02-21', buyer: 'HDFC Mutual Fund', seller: 'Norges Bank', dealType: 'Block', value: 162.8, premiumPct: 0.5, signal: 'Institutional Accumulation' },
      { date: '2026-01-12', buyer: 'SBI Life', seller: 'Fidelity', dealType: 'Block', value: 108.3, premiumPct: -0.4, signal: 'Neutral' },
      { date: '2025-12-22', buyer: 'Open Market', seller: 'Capital Group', dealType: 'Bulk', value: 92.0, premiumPct: -0.7, signal: 'Large Exit' },
    ],
  },
  'TCS.NS': {
    read: 'Deal flow is light and neutral. Tata Sons holding has not transacted; the few deals are institutional churn.',
    deals: [
      { date: '2026-04-19', buyer: 'HDFC Mutual Fund', seller: 'Capital Group', dealType: 'Block', value: 188.2, premiumPct: 0.2, signal: 'Churn' },
      { date: '2026-02-28', buyer: 'LIC of India', seller: 'Vanguard Group', dealType: 'Block', value: 142.6, premiumPct: 0.1, signal: 'Neutral' },
      { date: '2026-01-09', buyer: 'ICICI Pru Mutual Fund', seller: 'Norges Bank', dealType: 'Block', value: 98.4, premiumPct: -0.3, signal: 'Churn' },
      { date: '2025-12-04', buyer: 'Open Market', seller: 'Schroders', dealType: 'Bulk', value: 64.2, premiumPct: -0.4, signal: 'Neutral' },
    ],
  },
  'LT.NS': {
    read: 'Deal flow is constructive. Two large institutional buys at small premiums in the last quarter.',
    deals: [
      { date: '2026-04-25', buyer: 'LIC of India', seller: 'BlackRock', dealType: 'Block', value: 384.0, premiumPct: 0.6, signal: 'Institutional Accumulation' },
      { date: '2026-03-20', buyer: 'SBI Mutual Fund', seller: 'Vanguard Group', dealType: 'Block', value: 248.6, premiumPct: 0.4, signal: 'Institutional Accumulation' },
      { date: '2026-02-12', buyer: 'HDFC Life', seller: 'Capital Group', dealType: 'Block', value: 168.0, premiumPct: 0.2, signal: 'Churn' },
      { date: '2026-01-08', buyer: 'Open Market', seller: 'Fidelity', dealType: 'Bulk', value: 92.3, premiumPct: -0.2, signal: 'Neutral' },
    ],
  },
  'DMART.NS': {
    read: 'Deal flow is light and neutral. Float thinness keeps absolute volumes small.',
    deals: [
      { date: '2026-04-18', buyer: 'Government of Singapore', seller: 'Open Market', dealType: 'Bulk', value: 142.6, premiumPct: 0.3, signal: 'Institutional Accumulation' },
      { date: '2026-03-22', buyer: 'Nippon Mutual Fund', seller: 'Open Market', dealType: 'Bulk', value: 96.4, premiumPct: 0.5, signal: 'Institutional Accumulation' },
      { date: '2026-02-08', buyer: 'Open Market', seller: 'Capital Group', dealType: 'Bulk', value: 62.2, premiumPct: -0.4, signal: 'Neutral' },
      { date: '2025-12-19', buyer: 'Open Market', seller: 'Vanguard Group', dealType: 'Bulk', value: 48.0, premiumPct: -0.6, signal: 'Neutral' },
    ],
  },
  'TITAN.NS': {
    read: 'Deal flow is mildly constructive. A new pension fund entered via a block trade at a premium.',
    deals: [
      { date: '2026-04-23', buyer: 'CPP Investments (Canada)', seller: 'Capital Group', dealType: 'Block', value: 286.0, premiumPct: 0.7, signal: 'Institutional Accumulation' },
      { date: '2026-03-10', buyer: 'Nippon Mutual Fund', seller: 'Schroders', dealType: 'Block', value: 142.6, premiumPct: 0.3, signal: 'Churn' },
      { date: '2026-02-19', buyer: 'LIC of India', seller: 'Norges Bank', dealType: 'Block', value: 98.4, premiumPct: -0.2, signal: 'Churn' },
      { date: '2026-01-14', buyer: 'Open Market', seller: 'Fidelity', dealType: 'Bulk', value: 64.2, premiumPct: -0.5, signal: 'Neutral' },
    ],
  },
  'BAJFINANCE.NS': {
    read: 'Deal flow shows large exits. Three FIIs exited via block deals at small discounts in the last quarter.',
    deals: [
      { date: '2026-04-28', buyer: 'Open Market', seller: 'GQG Partners', dealType: 'Block', value: 488.6, premiumPct: -0.8, signal: 'Large Exit' },
      { date: '2026-04-12', buyer: 'Open Market', seller: 'Capital Group', dealType: 'Block', value: 362.4, premiumPct: -0.6, signal: 'Large Exit' },
      { date: '2026-03-17', buyer: 'HDFC Life', seller: 'Vanguard Group', dealType: 'Block', value: 248.0, premiumPct: -0.4, signal: 'Churn' },
      { date: '2026-02-09', buyer: 'Open Market', seller: 'BlackRock', dealType: 'Block', value: 188.6, premiumPct: -1.1, signal: 'Large Exit' },
      { date: '2026-01-21', buyer: 'SBI Mutual Fund', seller: 'JPMorgan AM', dealType: 'Block', value: 142.2, premiumPct: -0.2, signal: 'Churn' },
    ],
  },
  'ASIANPAINT.NS': {
    read: 'Deal flow is mostly exits. FIIs continue to trim via block trades at discounts.',
    deals: [
      { date: '2026-04-22', buyer: 'Open Market', seller: 'Vanguard Group', dealType: 'Block', value: 312.4, premiumPct: -0.6, signal: 'Large Exit' },
      { date: '2026-03-29', buyer: 'ICICI Pru Life', seller: 'BlackRock', dealType: 'Block', value: 244.0, premiumPct: -0.4, signal: 'Churn' },
      { date: '2026-03-04', buyer: 'Open Market', seller: 'Capital Group', dealType: 'Block', value: 198.6, premiumPct: -0.8, signal: 'Large Exit' },
      { date: '2026-02-12', buyer: 'Open Market', seller: 'Norges Bank', dealType: 'Block', value: 142.4, premiumPct: -0.3, signal: 'Churn' },
      { date: '2026-01-08', buyer: 'Open Market', seller: 'Fidelity', dealType: 'Bulk', value: 88.2, premiumPct: -0.7, signal: 'Large Exit' },
    ],
  },
  'MARUTI.NS': {
    read: 'Deal flow is mildly constructive. Domestic insurance accumulated at small premiums.',
    deals: [
      { date: '2026-04-20', buyer: 'LIC of India', seller: 'JPMorgan AM', dealType: 'Block', value: 286.6, premiumPct: 0.5, signal: 'Institutional Accumulation' },
      { date: '2026-03-12', buyer: 'SBI Mutual Fund', seller: 'BlackRock', dealType: 'Block', value: 198.0, premiumPct: 0.3, signal: 'Churn' },
      { date: '2026-02-19', buyer: 'HDFC Life', seller: 'Capital Group', dealType: 'Block', value: 142.4, premiumPct: 0.4, signal: 'Institutional Accumulation' },
      { date: '2026-01-09', buyer: 'Open Market', seller: 'Schroders', dealType: 'Bulk', value: 88.2, premiumPct: -0.4, signal: 'Neutral' },
    ],
  },
}

const DEFAULT: DealConfig = CONFIGS['RELIANCE.NS']

export function getDeals(ticker: string): BulkBlockDeal[] {
  return (CONFIGS[ticker] ?? DEFAULT).deals
}

export function getDealsRead(ticker: string): string {
  return (CONFIGS[ticker] ?? DEFAULT).read
}
