import { useMemo, useState } from 'react'
import './App.css'
import CompanyLaunchPanel from './components/CompanyLaunchPanel'
import LoadingProgress from './components/LoadingProgress'
import DashboardHeader from './components/DashboardHeader'
import TabNavigation from './components/TabNavigation'
import OverviewTab from './components/OverviewTab'
import OwnershipTrendsTab from './components/OwnershipTrendsTab'
import InsiderDealsTab from './components/InsiderDealsTab'
import GovernanceRiskTab from './components/GovernanceRiskTab'
import CompareView from './components/CompareView'
import InvestmentVerdictDrawer from './components/InvestmentVerdictDrawer'
import { getOverview } from './data/mockOverview'
import { getOwnershipTrends } from './data/mockHolders'
import { getInsiderDeals } from './data/mockInsiders'
import { getGovernance } from './data/mockGovernance'
import { useRecents } from './lib/recents'
import { useLiveTicker } from './lib/useLiveTicker'
import type { Company, OwnershipQuarter, TabKey } from './types'
import type { LiveShareholdingQuarter } from './lib/liveData'

/** Convert a Screener quarter ("Mar 2024" / "2024-03-31") to "Q4 FY24" label. */
function toFiscalLabel(q: LiveShareholdingQuarter): string {
  const iso = q.periodIso
  if (!iso) return q.period
  const parts = iso.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  let qNum: number
  let fy: number
  if (month === 6) { qNum = 1; fy = year }
  else if (month === 9) { qNum = 2; fy = year }
  else if (month === 12) { qNum = 3; fy = year + 1 }
  else if (month === 3) { qNum = 4; fy = year }
  else return q.period
  return `Q${qNum} FY${fy % 100}`
}

/** Map live shareholding quarters → mock OwnershipQuarter[] shape so the
 *  existing chart and stats just work. Public bucket folds in government +
 *  others so the four series sum to ~100. */
function mapLiveToOwnership(q: LiveShareholdingQuarter): OwnershipQuarter {
  return {
    quarter: toFiscalLabel(q),
    promoter: q.promoter,
    fii: q.fii,
    dii: q.dii,
    public: +(q.public + q.government + q.others).toFixed(2),
  }
}

type Stage = 'select' | 'loading' | 'dashboard' | 'compare'

export default function App() {
  const [stage, setStage] = useState<Stage>('select')
  const [company, setCompany] = useState<Company | null>(null)
  const [compareA, setCompareA] = useState<Company | null>(null)
  const [compareB, setCompareB] = useState<Company | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [verdictOpen, setVerdictOpen] = useState(false)
  const { addRecent } = useRecents()

  const live = useLiveTicker(company?.ticker ?? null)
  const isShareholdingLive =
    !!live.shareholding && Array.isArray(live.shareholding.quarters) && live.shareholding.quarters.length > 0

  const overview = useMemo(() => {
    if (!company) return null
    const base = getOverview(company.ticker)
    if (isShareholdingLive && live.shareholding) {
      const liveQuarters = live.shareholding.quarters.map(mapLiveToOwnership)
      return { ...base, ownership20q: liveQuarters }
    }
    return base
  }, [company, isShareholdingLive, live.shareholding])

  const trends = useMemo(() => (company ? getOwnershipTrends(company.ticker) : null), [company])
  const insider = useMemo(() => (company ? getInsiderDeals(company.ticker) : null), [company])
  const governance = useMemo(() => (company ? getGovernance(company.ticker) : null), [company])

  function handleLaunch(c: Company) {
    addRecent(c)
    setCompany(c)
    setActiveTab('overview')
    setStage('loading')
  }

  function handleLoadDone() {
    setStage('dashboard')
  }

  function handleBack() {
    setStage('select')
    setCompany(null)
    setVerdictOpen(false)
  }

  function handleCompare(a: Company, b: Company) {
    addRecent(a)
    addRecent(b)
    setCompareA(a)
    setCompareB(b)
    setStage('compare')
  }

  function handleCompareSwap() {
    setCompareA(compareB)
    setCompareB(compareA)
  }

  function handleCompareSelectSingle(c: Company) {
    addRecent(c)
    setCompany(c)
    setActiveTab('overview')
    setCompareA(null)
    setCompareB(null)
    setStage('loading')
  }

  function handleCompareBack() {
    setCompareA(null)
    setCompareB(null)
    setStage('select')
  }

  function handleExport(kind: 'excel' | 'pdf') {
    const tabName =
      activeTab === 'overview'
        ? 'Overview'
        : activeTab === 'trends'
        ? 'Ownership Trends'
        : activeTab === 'insider'
        ? 'Insider & Deals'
        : 'Governance Risk'
    alert(`Export ${kind.toUpperCase()} for "${tabName}" — coming soon.`)
  }

  if (stage === 'select') {
    return <CompanyLaunchPanel onLaunch={handleLaunch} onCompare={handleCompare} />
  }
  if (stage === 'loading' && company) {
    return <LoadingProgress company={company} onDone={handleLoadDone} />
  }
  if (stage === 'compare' && compareA && compareB) {
    return (
      <CompareView
        a={compareA}
        b={compareB}
        onBack={handleCompareBack}
        onSwap={handleCompareSwap}
        onSelectSingle={handleCompareSelectSingle}
      />
    )
  }
  if (stage === 'dashboard' && company && overview && trends && insider && governance) {
    return (
      <div className="min-h-screen bg-ink-50/50">
        <DashboardHeader
          company={company}
          onBack={handleBack}
          onExportExcel={() => handleExport('excel')}
          onExportPdf={() => handleExport('pdf')}
          onOpenVerdict={() => setVerdictOpen(true)}
          liveSourceDate={live.latestSourceDate}
          liveLoading={live.loading}
        />
        <TabNavigation active={activeTab} onChange={setActiveTab} />
        <main key={activeTab} className="animate-fadeUp">
          {activeTab === 'overview' && (
            <OverviewTab
              overview={overview}
              onJumpTab={setActiveTab}
              shareholdingLive={isShareholdingLive}
              shareholdingSource={live.shareholding?.source}
            />
          )}
          {activeTab === 'trends' && (
            <OwnershipTrendsTab
              overview={overview}
              trends={trends}
              shareholdingLive={isShareholdingLive}
              shareholdingSource={live.shareholding?.source}
            />
          )}
          {activeTab === 'insider' && (
            <InsiderDealsTab
              data={insider}
              livePrices={live.prices}
              liveDeals={live.deals}
            />
          )}
          {activeTab === 'governance' && (
            <GovernanceRiskTab data={governance} companyName={company.name} />
          )}
        </main>

        <footer className="mx-auto max-w-7xl px-6 py-8 text-center text-[11px] text-ink-400">
          HoldingDash · Mock data preview · {company.ticker}
        </footer>

        <InvestmentVerdictDrawer
          open={verdictOpen}
          company={company}
          overview={overview}
          trends={trends}
          insider={insider}
          governance={governance}
          onClose={() => setVerdictOpen(false)}
          onJumpTab={(t) => {
            setVerdictOpen(false)
            setActiveTab(t)
          }}
        />
      </div>
    )
  }

  return null
}
