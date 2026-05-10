import { useMemo, useState } from 'react'
import { LineChart as LineChartIcon, ArrowLeftRight, ShieldAlert } from 'lucide-react'
import './App.css'
import CompanyLaunchPanel from './components/CompanyLaunchPanel'
import LoadingProgress from './components/LoadingProgress'
import DashboardHeader from './components/DashboardHeader'
import TabNavigation from './components/TabNavigation'
import OverviewTab from './components/OverviewTab'
import PlaceholderTab from './components/PlaceholderTab'
import { getOverview } from './data/mockOverview'
import type { Company, TabKey } from './types'

type Stage = 'select' | 'loading' | 'dashboard'

export default function App() {
  const [stage, setStage] = useState<Stage>('select')
  const [company, setCompany] = useState<Company | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const overview = useMemo(() => (company ? getOverview(company.ticker) : null), [company])

  function handleLaunch(c: Company) {
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
  }

  function handleExport(kind: 'excel' | 'pdf') {
    // placeholder
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
    return <CompanyLaunchPanel onLaunch={handleLaunch} />
  }
  if (stage === 'loading' && company) {
    return <LoadingProgress company={company} onDone={handleLoadDone} />
  }
  if (stage === 'dashboard' && company && overview) {
    return (
      <div className="min-h-screen bg-ink-50/50">
        <DashboardHeader
          company={company}
          onBack={handleBack}
          onExportExcel={() => handleExport('excel')}
          onExportPdf={() => handleExport('pdf')}
        />
        <TabNavigation active={activeTab} onChange={setActiveTab} />
        <main key={activeTab} className="animate-fadeUp">
          {activeTab === 'overview' && (
            <OverviewTab overview={overview} onJumpTab={setActiveTab} />
          )}
          {activeTab === 'trends' && (
            <PlaceholderTab
              tab="trends"
              icon={LineChartIcon}
              onBackToOverview={() => setActiveTab('overview')}
            />
          )}
          {activeTab === 'insider' && (
            <PlaceholderTab
              tab="insider"
              icon={ArrowLeftRight}
              onBackToOverview={() => setActiveTab('overview')}
            />
          )}
          {activeTab === 'governance' && (
            <PlaceholderTab
              tab="governance"
              icon={ShieldAlert}
              onBackToOverview={() => setActiveTab('overview')}
            />
          )}
        </main>

        <footer className="mx-auto max-w-7xl px-6 py-8 text-center text-[11px] text-ink-400">
          HoldingDash · Mock data preview · {company.ticker}
        </footer>
      </div>
    )
  }

  return null
}
