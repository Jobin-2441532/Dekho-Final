/* Grow — Risk awareness check.
   Separates risk CAPACITY (objective, from real data) from risk TOLERANCE
   (subjective, self-reported) — an explanation for the user, not a product
   suitability score. See plan: this is awareness, not a recommendation engine. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, TrendingUp, Clock, Lightbulb } from 'lucide-react'
import { api } from '../lib/api'
import { SkeletonCard, ErrorState } from '../components/ui/LoadingState'
import Button from '../components/ui/Button'
import styles from './SubPage.module.css'

type Tolerance = 'cautious' | 'balanced' | 'growth'
type Experience = 'new' | 'some' | 'experienced'
type HorizonChoice = 'short' | 'medium' | 'long'

const HORIZON_YEARS: Record<HorizonChoice, number> = { short: 2, medium: 5, long: 10 }

const TOLERANCE_OPTIONS: { key: Tolerance; title: string; sub: string }[] = [
  { key: 'cautious', title: 'Sell some or all of it', sub: 'I\'d rather avoid further loss than wait it out' },
  { key: 'balanced', title: 'Hold and wait it out', sub: 'It\'s uncomfortable, but I can wait for a recovery' },
  { key: 'growth', title: 'See it as a buying opportunity', sub: 'Dips don\'t worry me much over the long run' },
]

const EXPERIENCE_OPTIONS: { key: Experience; title: string }[] = [
  { key: 'new', title: 'New to investing — haven\'t started yet' },
  { key: 'some', title: 'Some experience — invested a little before' },
  { key: 'experienced', title: 'Experienced — I invest regularly and understand the basics' },
]

const HORIZON_OPTIONS: { key: HorizonChoice; title: string; sub: string }[] = [
  { key: 'short', title: 'Under 3 years', sub: 'e.g. a near-term purchase or trip' },
  { key: 'medium', title: '3–7 years', sub: 'e.g. a down payment or education fund' },
  { key: 'long', title: '7+ years', sub: 'e.g. retirement or long-term wealth building' },
]

interface RiskProfile {
  capacity: { key: string; label: string; detail: string }
  tolerance: { key: string | null; label: string | null; isSet: boolean }
  experience: { key: string | null; label: string | null }
  horizon: { key: string | null; label: string | null; years: number | null }
  insights: string[]
  isComplete: boolean
  disclaimer: string
}

export default function GrowRiskCheck() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<RiskProfile | null>(null)
  const [editing, setEditing] = useState(false)

  const [tolerance, setTolerance] = useState<Tolerance | null>(null)
  const [experience, setExperience] = useState<Experience | null>(null)
  const [horizon, setHorizon] = useState<HorizonChoice | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    return api.get<RiskProfile>('/api/v1/grow/risk-profile')
      .then(p => { setProfile(p); setEditing(!p.isComplete) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const canSubmit = tolerance && experience && horizon

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      const result = await api.post<RiskProfile>('/api/v1/grow/risk-profile', {
        risk_tolerance: tolerance,
        risk_experience: experience,
        goal_horizon_years: HORIZON_YEARS[horizon],
      })
      setProfile(result)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your answers')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.px}><SkeletonCard /></div></div>
  }
  if (error && !profile) {
    return <div className={styles.page}><div className={styles.px}><ErrorState message={error} /></div></div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/grow')} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <div style={{ width: 36 }} />
      </div>

      <div className={styles.px}>
        <p className={styles.pageSubtitle}>RISK AWARENESS</p>
        <h1 className={styles.pageTitle}>Understand your risk profile</h1>
        <p className={styles.pageDesc}>
          This separates what you could handle financially (your capacity) from what you're comfortable with (your tolerance) — it's for your own understanding, not a product recommendation.
        </p>

        {editing ? (
          <>
            <div className={styles.questionBlock}>
              <p className={styles.questionLabel}>If an investment dropped 20% in a month, you'd most likely...</p>
              <div className={styles.choiceGroup}>
                {TOLERANCE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className={`${styles.choicePill} ${tolerance === opt.key ? styles.choicePillActive : ''}`}
                    onClick={() => setTolerance(opt.key)}
                  >
                    <span className={styles.choicePillTitle}>{opt.title}</span>
                    <span className={styles.choicePillSub}>{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.questionBlock}>
              <p className={styles.questionLabel}>How would you describe your investing experience?</p>
              <div className={styles.choiceGroup}>
                {EXPERIENCE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className={`${styles.choicePill} ${experience === opt.key ? styles.choicePillActive : ''}`}
                    onClick={() => setExperience(opt.key)}
                  >
                    <span className={styles.choicePillTitle}>{opt.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.questionBlock}>
              <p className={styles.questionLabel}>When do you expect to need this money?</p>
              <div className={styles.choiceGroup}>
                {HORIZON_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className={`${styles.choicePill} ${horizon === opt.key ? styles.choicePillActive : ''}`}
                    onClick={() => setHorizon(opt.key)}
                  >
                    <span className={styles.choicePillTitle}>{opt.title}</span>
                    <span className={styles.choicePillSub}>{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p style={{ color: 'var(--color-negative)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-3)' }}>{error}</p>}

            <Button fullWidth disabled={!canSubmit || saving} onClick={handleSubmit}>
              {saving ? 'Saving…' : 'See my risk profile'}
            </Button>
          </>
        ) : profile ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              <div className={styles.riskResultCard}>
                <p className={styles.riskResultLabel}><ShieldCheck size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />RISK CAPACITY (from your data)</p>
                <p className={styles.riskResultValue}>{profile.capacity.label}</p>
                <p className={styles.riskResultDetail}>{profile.capacity.detail}</p>
              </div>
              <div className={styles.riskResultCard}>
                <p className={styles.riskResultLabel}><TrendingUp size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />RISK TOLERANCE (self-reported)</p>
                <p className={styles.riskResultValue}>{profile.tolerance.label ?? 'Not set'}</p>
              </div>
              <div className={styles.riskResultCard}>
                <p className={styles.riskResultLabel}><Clock size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />TIME HORIZON</p>
                <p className={styles.riskResultValue}>{profile.horizon.label ?? 'Not set'}</p>
              </div>
            </div>

            <p className={styles.sectionTitle}>What this means</p>
            <div className={styles.insightList}>
              {profile.insights.map((insight, i) => (
                <div key={i} className={styles.insightRow}>
                  <Lightbulb size={16} color="var(--color-primary)" strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p className={styles.checkText}>{insight}</p>
                </div>
              ))}
            </div>

            <p className={styles.poweredBy} style={{ marginTop: 'var(--space-6)', textTransform: 'none', letterSpacing: 'normal' }}>
              {profile.disclaimer}
            </p>

            <div style={{ marginTop: 'var(--space-5)' }}>
              <Button fullWidth variant="secondary" onClick={() => setEditing(true)}>Retake the check</Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
