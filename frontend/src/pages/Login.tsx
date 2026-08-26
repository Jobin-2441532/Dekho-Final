/* ── Login / Sign-up with mandatory bank statement selection ── */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, CheckCircle2, FileText, ChevronRight, Fingerprint, AlertTriangle } from 'lucide-react'
import Button from '../components/ui/Button'
import FloatingInput from '../components/ui/FloatingInput'
import { useBiometric } from '../hooks/useBiometric'
import styles from './Onboarding.module.css'

const BASE_URL = import.meta.env.VITE_API_URL || ''

/* ── Types ───────────────────────────────────────────────────────────────── */
interface StatementMeta {
  id:           string
  label:        string
  salary:       string
  date_range:   string
  transactions: number
  profile:      string
  icon:         string
  color:        string
}

function parseApiError(data: any, fallback: string): string {
  if (!data) return fallback
  if (Array.isArray(data.detail)) return data.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
  if (typeof data.detail  === 'string') return data.detail
  if (typeof data.message === 'string') return data.message
  return fallback
}

/* ── Statement Card ──────────────────────────────────────────────────────── */
function StatementCard({
  meta, selected, onClick,
}: { meta: StatementMeta; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: selected ? `${meta.color}18` : 'var(--bg-surface)',
        border: `2px solid ${selected ? meta.color : 'var(--bg-surface-high)'}`,
        borderRadius: 16,
        padding: '14px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: selected ? `0 0 0 3px ${meta.color}22` : 'none',
        transform: selected ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${meta.color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>
        {meta.icon}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{
            fontWeight: 700, fontSize: 13,
            color: selected ? meta.color : 'var(--color-on-surface)',
            fontFamily: 'var(--font-headline)',
          }}>
            {meta.label}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: meta.color,
            background: `${meta.color}18`,
            borderRadius: 6, padding: '2px 7px',
          }}>
            {meta.date_range}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
          Income: {meta.salary}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
            📊 {meta.transactions} transactions
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{meta.profile}</span>
        </div>
        {/* Sample data highlight */}
        <div style={{
          marginTop: 7,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          background: 'rgba(245,158,11,0.13)',
          border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: 6,
          padding: '3px 8px',
          fontSize: 11,
          fontWeight: 600,
          color: '#d97706',
          fontFamily: 'var(--font-body)',
        }}>
          📅 Sample data · {meta.date_range}
        </div>
      </div>

      {/* Check */}
      <div style={{ flexShrink: 0 }}>
        {selected
          ? <CheckCircle2 size={20} color={meta.color} fill={`${meta.color}22`} />
          : <ChevronRight size={18} color="var(--color-muted)" />}
      </div>
    </button>
  )
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function Login() {
  const navigate = useNavigate()

  // Step: 'pick' = choosing statement | 'auth' = credentials form | 'lock' = mandatory app-lock setup (signup only)
  const [step,      setStep]      = useState<'pick' | 'auth' | 'lock'>('auth')
  const [isLogin,   setIsLogin]   = useState(true)
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [importing, setImporting] = useState(false)
  const { isSupported: lockSupported, register: registerLock } = useBiometric()
  const [lockStatus, setLockStatus] = useState<'idle' | 'trying' | 'failed'>('idle')

  const [statements, setStatements] = useState<StatementMeta[]>([])
  const [selected,   setSelected]   = useState<string>('')

  // Load statement metadata from backend
  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/import/statements`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setStatements(data)
        } else {
          throw new Error('Data is not an array')
        }
      })
      .catch((e) => {
        console.error('Failed to fetch statements:', e)
        // Fallback static metadata if backend unreachable
        setStatements([
          { id: 'Statement9',  label: 'Statement 9',  salary: '₹50,000 / month', date_range: 'Recent', transactions: 64, profile: 'Mid-income, Bangalore',    icon: '🏙️', color: '#8B6347' },
          { id: 'Statement10', label: 'Statement 10', salary: '₹52,000 / month', date_range: 'Recent', transactions: 64, profile: 'Upper-mid, Hyderabad',    icon: '💼', color: '#6C8B47' },
          { id: 'Statement11', label: 'Statement 11', salary: '₹47,000 / month', date_range: 'Recent', transactions: 64, profile: 'Moderate spend, Chennai', icon: '🌊', color: '#47688B' },
        ])
      })
  }, [])

  const selectedMeta = statements.find(s => s.id === selected)

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please enter your email and password'); return }
    if (!isLogin && !name.trim()) { setError('Please enter your name'); return }

    setLoading(true)
    setError('')

    try {
      let token = ''

      if (isLogin) {
        const formData = new URLSearchParams()
        formData.append('username', email)
        formData.append('password', password)
        const res  = await fetch(`${BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(parseApiError(data, 'Login failed'))
        token = data.access_token
      } else {
        const res  = await fetch(`${BASE_URL}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email, password, income_range: '5-10L', monthly_budget: 50000 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(parseApiError(data, 'Registration failed'))
        token = data.access_token
      }

      localStorage.setItem('dekho_token', token)

      // ── ONLY import the selected bank statement on registration ──────────────
      if (!isLogin && selected) {
        setLoading(false)
        setImporting(true)
        const importRes = await fetch(`${BASE_URL}/api/v1/import/statement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ statement: selected }),
        })
        if (!importRes.ok) {
          const errData = await importRes.json()
          console.warn('Import warning:', errData)
          // Non-fatal — still proceed to home
        }
      }

      if (!isLogin) {
        // New accounts must set up App Lock before entering the app.
        setImporting(false)
        setStep('lock')
        return
      }

      localStorage.setItem('dekho_onboarded', 'true')
      navigate('/home')
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
      setImporting(false)
    }
  }

  const completeSignUp = () => {
    localStorage.setItem('dekho_onboarded', 'true')
    navigate('/home')
  }

  const handleSetUpLock = async () => {
    setLockStatus('trying')
    const success = await registerLock(name || email)
    if (success) {
      completeSignUp()
    } else {
      setLockStatus('failed')
    }
  }

  // ── Step 1: Statement Picker ───────────────────────────────────────────────
  if (step === 'pick') {
    return (
      <div className={styles.screen}>
        <div className={styles.inner}>
          {/* Logo */}
          <div className={styles.logo} style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src="/logo-nobg.png" alt="Dekho Logo" style={{ width: 120, height: 120, objectFit: 'contain', marginBottom: '-28px' }} />
            <span className={styles.logoName}>Dekho</span>
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
              <FileText size={18} color="var(--color-primary)" />
              <h1 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-headline)', color: 'var(--color-on-surface)' }}>
                Choose your bank statement
              </h1>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
              Your transactions will be loaded from the selected statement
            </p>
          </div>

          {/* Statement cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {statements.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 20, fontSize: 13 }}>
                Loading statements...
              </div>
            ) : statements.map(s => (
              <StatementCard
                key={s.id}
                meta={s}
                selected={selected === s.id}
                onClick={() => setSelected(s.id)}
              />
            ))}
          </div>

          {/* Selected badge */}
          {selectedMeta && (
            <div style={{
              background: `${selectedMeta.color}12`,
              border: `1px solid ${selectedMeta.color}30`,
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12,
              color: selectedMeta.color,
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: 16,
              fontFamily: 'var(--font-body)',
            }}>
              ✓ {selectedMeta.label} selected — {selectedMeta.transactions} transactions will be loaded
            </div>
          )}

          {/* Continue button */}
          <Button
            fullWidth
            onClick={() => setStep('auth')}
            disabled={!selected}
          >
            Continue →
          </Button>

          <div className={styles.privacyNote} style={{ marginTop: 20 }}>
            <Lock size={12} />
            <span>Statement data stays on your device only.</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: Mandatory App Lock (signup only, cannot be skipped) ────────────
  if (step === 'lock') {
    return (
      <div className={styles.screen}>
        <div className={styles.inner}>
          <div className={styles.logo} style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src="/logo-nobg.png" alt="Dekho Logo" style={{ width: 120, height: 120, objectFit: 'contain', marginBottom: '-28px' }} />
            <span className={styles.logoName}>Dekho</span>
          </div>

          <div className={styles.heading}>
            <h1>Secure your account</h1>
            <p>Dekho is a finance app, so an app lock is required — it uses your device's own fingerprint, face, or screen-lock, never a password we store.</p>
          </div>

          <div className={styles.features}>
            <div className={styles.featureRow}>
              <span className={styles.featureEmoji}>🔐</span>
              <div className={styles.featureText}>
                <strong>Why this is required</strong>
                <span>Your financial data stays locked behind your device's own biometrics, even if someone else picks up your phone.</span>
              </div>
            </div>
          </div>

          {lockStatus === 'failed' && (
            <div className={styles.featureRow} style={{ color: 'var(--color-negative)' }}>
              <AlertTriangle size={18} />
              <div className={styles.featureText}>
                <strong>That didn't work</strong>
                <span>Please try again — you'll need to complete this to continue.</span>
              </div>
            </div>
          )}

          <div className={styles.navRow}>
            {lockSupported ? (
              <Button fullWidth onClick={handleSetUpLock} loading={lockStatus === 'trying'} iconLeft={<Fingerprint size={16} />}>
                {lockStatus === 'failed' ? 'Try again' : 'Set up App Lock'}
              </Button>
            ) : (
              <>
                <div className={styles.privacyNote}>
                  <AlertTriangle size={12} />
                  <span>Your browser doesn't support device lock. You can set it up later from Settings on a supported device.</span>
                </div>
                <Button fullWidth onClick={completeSignUp}>
                  Continue →
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Credentials Form ──────────────────────────────────────────────
  return (
    <div className={styles.screen}>
      <div className={styles.inner}>
        {/* Logo */}
        <div className={styles.logo} style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/logo-nobg.png" alt="Dekho Logo" style={{ width: 120, height: 120, objectFit: 'contain', marginBottom: '-28px' }} />
          <span className={styles.logoName}>Dekho</span>
        </div>

        {/* Selected statement chip (only for signup) */}
        {!isLogin && selectedMeta && (
          <button
            onClick={() => setStep('pick')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: `${selectedMeta.color}15`,
              border: `1.5px solid ${selectedMeta.color}40`,
              borderRadius: 12, padding: '8px 14px',
              marginBottom: 20, cursor: 'pointer', width: '100%',
            }}
          >
            <span style={{ fontSize: 18 }}>{selectedMeta.icon}</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: selectedMeta.color, fontFamily: 'var(--font-headline)' }}>
                {selectedMeta.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                {selectedMeta.transactions} transactions · Tap to change
              </div>
            </div>
            <CheckCircle2 size={16} color={selectedMeta.color} />
          </button>
        )}

        <div className={styles.heading} style={{ marginBottom: 24 }}>
          <h1>{isLogin ? 'Welcome back' : 'Create account'}</h1>
          <p>Your calm finance companion</p>
        </div>

        {/* Form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 24 }}>
          {!isLogin && (
            <FloatingInput label="Full name" type="text" value={name} onChange={e => setName(e.target.value)} />
          )}
          <FloatingInput label="Email address" type="email"    value={email}    onChange={e => setEmail(e.target.value)}    />
          <FloatingInput label="Password"      type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        {error && (
          <p style={{ color: 'var(--color-critical)', fontSize: '0.875rem', marginBottom: 16, textAlign: 'center' }}>
            {error}
          </p>
        )}

        {importing && (
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 12, padding: '12px 16px',
            marginBottom: 16, textAlign: 'center', fontSize: 13, color: 'var(--color-primary)',
            fontWeight: 600, fontFamily: 'var(--font-body)',
          }}>
            ⏳ Loading your {selectedMeta?.transactions} transactions...
          </div>
        )}

        <div className={styles.navRow} style={{ flexDirection: 'column', gap: 16 }}>
          <Button fullWidth onClick={handleSubmit} disabled={loading || importing || (!isLogin && !selected)}>
            {importing ? 'Importing data...' : loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up & Load Data')}
          </Button>

          <button
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => { 
              if (isLogin) {
                setIsLogin(false)
                setStep('pick') // Go to pick statement for new accounts
              } else {
                setIsLogin(true)
              }
              setError('')
            }}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>

          <div className={styles.privacyNote} style={{ marginTop: 8 }}>
            <Lock size={12} />
            <span>Secure authentication via FinanceAI.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
