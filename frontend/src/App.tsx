import { lazy, Suspense, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import DisclaimerModal from './components/ui/DisclaimerModal'
import GlobalLoader from './components/ui/GlobalLoader'
import { Toaster } from 'react-hot-toast'
/* ── Auth (always needed immediately) ── */
import Login from './pages/Login'

/* ── Main tab pages ── */
import Home from './pages/Home'
const Expenses     = lazy(() => import('./pages/Expenses'))
const Budgets      = lazy(() => import('./pages/Budgets'))
const Assets       = lazy(() => import('./pages/Assets'))
const Grow         = lazy(() => import('./pages/Grow'))
const Behavior     = lazy(() => import('./pages/Behavior'))

/* ── Transaction pages ── */
const ReviewQueue      = lazy(() => import('./pages/ReviewQueue'))
const TransactionsList = lazy(() => import('./pages/TransactionsList'))
const AddExpense       = lazy(() => import('./pages/AddExpense'))

/* ── Asset sub-pages ── */
const InvestmentsDetail = lazy(() => import('./pages/InvestmentsDetail'))
const MutualFundDetail  = lazy(() => import('./pages/MutualFundDetail'))
const SavingsDetail     = lazy(() => import('./pages/SavingsDetail'))
const LiabilitiesDetail = lazy(() => import('./pages/LiabilitiesDetail'))

/* ── Grow sub-pages ── */
const PersonalizedRecommendations = lazy(() => import('./pages/PersonalizedRecommendations'))
const PathDetailIndexFundSIP      = lazy(() => import('./pages/PathDetailIndexFundSIP'))

/* ── Special screens ── */
const Goals       = lazy(() => import('./pages/Goals'))
const MonthlyWrap = lazy(() => import('./pages/MonthlyWrap'))
const Settings    = lazy(() => import('./pages/Settings'))
const AskDekho    = lazy(() => import('./pages/AskDekho'))



/* ── Auth guard — checks for JWT token ── */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('dekho_token')
  const onboarded = localStorage.getItem('dekho_onboarded')
  return (token && onboarded) ? <>{children}</> : <Navigate to="/login" replace />
}

/* ── Disclaimer wrapper — shows splash once per session ── */
function DisclaimerWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('dekho_token')
    const seen  = localStorage.getItem('dekho_disclaimer_seen')
    // Only show on authenticated routes, and only once per install
    if (token && !seen && location.pathname !== '/login') {
      setShow(true)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem('dekho_disclaimer_seen', '1')
    setShow(false)
  }

  return (
    <>
      <Toaster position="top-center" />
      {children}
      {show && <DisclaimerModal mode="splash" onClose={dismiss} />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Login — outside shell ── */}
        <Route path="/login"      element={<Login />} />
        <Route path="/onboarding" element={<Navigate to="/login" replace />} />

        {/* ── Authenticated app — inside shell ── */}
        <Route
          path="/*"
          element={
            <RequireAuth>
              <DisclaimerWrapper>
              <AppShell>
                <Suspense fallback={<GlobalLoader />}>
                  <Routes>
                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/home" replace />} />

                    {/* ── Main tabs ── */}
                    <Route path="/home"         element={<Home />} />
                    <Route path="/expenses"     element={<Expenses />} />
                    <Route path="/budgets"      element={<Budgets />} />
                    <Route path="/assets"       element={<Assets />} />
                    <Route path="/grow"         element={<Grow />} />
                    <Route path="/behavior"     element={<Behavior />} />

                    {/* ── Transaction pages ── */}
                    <Route path="/transactions" element={<TransactionsList />} />
                    <Route path="/review"       element={<ReviewQueue />} />

                    {/* ── Goals (standalone) ── */}
                    <Route path="/goals"        element={<Goals />} />
                    
                    {/* ── Add Expense (standalone) ── */}
                    <Route path="/add-expense"  element={<AddExpense />} />

                    {/* ── Assets sub-pages ── */}
                    <Route path="/assets/investments"             element={<InvestmentsDetail />} />
                    <Route path="/assets/investments/mutual-fund" element={<MutualFundDetail />} />
                    <Route path="/assets/savings"                 element={<SavingsDetail />} />
                    <Route path="/assets/liabilities"             element={<LiabilitiesDetail />} />

                    {/* ── Grow sub-pages ── */}
                    <Route path="/grow/recommendations" element={<PersonalizedRecommendations />} />
                    <Route path="/grow/index-fund-sip"  element={<PathDetailIndexFundSIP />} />

                    {/* ── Special ── */}
                    <Route path="/monthly-wrap" element={<MonthlyWrap />} />
                    <Route path="/settings"     element={<Settings />} />
                    <Route path="/ask"          element={<AskDekho />} />
                    <Route path="/loader-preview" element={<GlobalLoader />} />

                    {/* ── Legacy redirects ── */}
                    <Route path="/opportunities" element={<Navigate to="/grow" replace />} />
                  </Routes>
                </Suspense>
                </AppShell>
              </DisclaimerWrapper>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
