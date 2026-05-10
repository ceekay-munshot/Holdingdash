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
import type { Company, TabKey } from './types'

type Stage = 'select' | 'loading' | 'dashboard' | 'compare'

export default function App() {
  const [stage, setStage] = useState<Stage>('select')
  const [company, setCompany] = useState<Company | null>(null)
  const [compareA, setCompareA] = useState<Company | null>(null)
  const [compareB, setCompareB] = useState<Company | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [verdictOpen, setVerdictOpen] = useState(false)
  const { addRecent } = useRecents()

  const overview = useMemo(() => (company ? getOverview(company.ticker) : null), [company])
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
        />
        <TabNavigation active={activeTab} onChange={setActiveTab} />
        <main key={activeTab} className="animate-fadeUp">
          {activeTab === 'overview' && (
            <OverviewTab overview={overview} onJumpTab={setActiveTab} />
          )}
          {activeTab === 'trends' && (
            <OwnershipTrendsTab overview={overview} trends={trends} />
          )}
          {activeTab === 'insider' && <InsiderDealsTab data={insider} />}
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
