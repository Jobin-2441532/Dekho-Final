/* Grow page — Stitch "Grow Home" + "Readiness Guardrail" */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Sparkles, BookOpen, Target, Gauge, LineChart } from 'lucide-react'
import { api } from '../lib/api'
import { SkeletonCard, ErrorState } from '../components/ui/LoadingState'
import styles from './Grow.module.css'

interface ChecklistItem {
  key: string
  label: string
  done: boolean
  detail: string
  progress: number
}

/* Radial progress gauge — SVG stroke-dasharray, themed via CSS custom properties
   so it follows the app's palette (and dark mode) instead of hardcoded colors. */
function RadialGauge({
  pct, size = 96, strokeWidth = 9, color = 'var(--color-primary)',
  caption, showValue = true,
}: { pct: number; size?: number; strokeWidth?: number; color?: string; caption?: string; showValue?: boolean }) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  const offset = c * (1 - clamped / 100)

  return (
    <div className={styles.gaugeWrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--bg-surface-high)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
        {showValue && (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className={styles.gaugeValue} style={{ fontSize: size * 0.24 }}>
            {Math.round(clamped)}%
          </text>
        )}
      </svg>
      {caption && <span className={styles.gaugeCaption}>{caption}</span>}
    </div>
  )
}

interface GrowProfile {
  isInvestmentEligible: boolean
  priority: 'emergency_fund' | 'goal_planning' | 'investment_education'
  monthlyIncome: number
  monthlyExpenseEstimate: number
  emergencyFund: { monthsCovered: number; liquidTotal: number }
  riskComfort: string | null
  riskLabel: string
  checklist: ChecklistItem[]
  suggestedMonthlyAmount: number
  disclaimer: string
}

/* Educational "next step" ideas — generic categories, not specific securities
   or named schemes (see plan: Grow shows illustrative options, not advice). */
function buildNextSteps(profile: GrowProfile) {
  return [
    {
      id: 'sip',
      emoji: '📈',
      title: profile.suggestedMonthlyAmount > 0
        ? `Explore a ₹${profile.suggestedMonthlyAmount.toLocaleString('en-IN')}/mo SIP`
        : 'Explore SIPs as a category',
      subtitle: 'Index fund SIP · illustrative example',
      risk: 'MARKET-LINKED',
      riskColor: '#2E7D32',
      horizon: '7+ years',
      why: `Your risk profile: ${profile.riskLabel}. A SIP is a way of investing periodically — it isn't risk-free, and returns aren't guaranteed.`,
      to: '/grow/recommendations',
    },
    {
      id: 'fd',
      emoji: '🔒',
      title: 'Learn about Fixed Deposits',
      subtitle: 'Low-risk, fixed-return category',
      risk: 'LOW RISK',
      riskColor: '#1565C0',
      horizon: '1+ years',
      why: 'A good place to park money you may need soon, once your emergency fund is covered.',
      to: '/assets/savings',
    },
    {
      id: 'debt',
      emoji: '💳',
      title: 'Review high-interest debt first',
      subtitle: 'Credit cards & short-term loans',
      risk: 'PRIORITY',
      riskColor: '#B45309',
      horizon: 'This month',
      why: 'Paying off high-interest debt (12%+ p.a.) usually beats any investment return.',
      to: '/assets/liabilities',
    },
  ]
}

function QuickLinks() {
  const navigate = useNavigate()
  return (
    <div className={styles.quickLinks}>
      <button className={styles.quickLinkBtn} onClick={() => navigate('/grow/guide')}>
        <BookOpen size={16} strokeWidth={1.75} /> Read Guidelines
      </button>
      <button className={styles.quickLinkBtn} onClick={() => navigate('/goals')}>
        <Target size={16} strokeWidth={1.75} /> Set a Goal
      </button>
      <button className={styles.quickLinkBtn} onClick={() => navigate('/grow/risk-check')}>
        <Gauge size={16} strokeWidth={1.75} /> Risk Check
      </button>
      <button className={styles.quickLinkBtn} onClick={() => navigate('/grow/market')}>
        <LineChart size={16} strokeWidth={1.75} /> Market
      </button>
    </div>
  )
}

function GrowHome({ profile }: { profile: GrowProfile }) {
  const navigate = useNavigate()
  const steps = buildNextSteps(profile)

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <p className={styles.pageTitle}>Grow</p>
        <div className={styles.avatarBtn}>AK</div>
      </div>

      <div className={styles.px}><QuickLinks /></div>

      {/* Action center */}
      <div className={styles.px}>
        <div className={styles.actionCenterCard}>
          <p className={styles.actionLabel}>ACTION CENTER</p>
          <h1 className={styles.actionTitle}>Your next growth step</h1>

        <div className={styles.readinessBadge}>
          <RadialGauge
            pct={Math.min(profile.emergencyFund.monthsCovered / 3, 1) * 100}
            size={56} strokeWidth={6} showValue={false}
            color={profile.emergencyFund.monthsCovered >= 3 ? 'var(--color-positive)' : 'var(--color-primary)'}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className={styles.readinessBadgeLabel}>EMERGENCY FUND</span>
            <span className={styles.readinessBadgeText}>
              {profile.emergencyFund.monthsCovered >= 3
                ? `${profile.emergencyFund.monthsCovered} months covered — a good position to explore investing.`
                : `${profile.emergencyFund.monthsCovered} of 3 months covered. Building toward 3 is a strong next step.`}
            </span>
          </div>
        </div>

        <p className={styles.suggestedLabel}>Suggested monthly amount to explore</p>
        <p className={styles.suggestedAmt}>₹{profile.suggestedMonthlyAmount.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className={styles.px} style={{ marginTop: 'var(--space-4)' }}>
        <div className={styles.aiRecCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Sparkles size={18} color="rgba(255,255,255,0.8)" strokeWidth={1.75} />
            <p className={styles.aiRecLabel}>BASED ON YOUR DATA</p>
          </div>
          <h1 className={styles.aiRecTitle}>
            Based on your financial health
          </h1>
          <p className={styles.aiRecSub}>
            Dekho looked at your income, expenses, savings and goals to suggest what to explore next — this is educational, not personalized investment advice.
          </p>
        </div>
      </div>


      {/* Your Next Steps */}
      <div className={styles.px} style={{ marginTop: 'var(--space-5)' }}>
        <p className={styles.pathsTitle}>Your Next Steps</p>
        <div className={styles.recList}>
          {steps.map((rec, i) => (
            <button
              key={rec.id}
              className={styles.recCard}
              onClick={() => navigate(rec.to)}
            >
              <div className={styles.recNum}>{i + 1}</div>
              <div className={styles.recBody}>
                <div className={styles.recHeader}>
                  <div className={styles.recTitleRow}>
                    <span className={styles.recEmoji}>{rec.emoji}</span>
                    <div>
                      <p className={styles.recTitle}>{rec.title}</p>
                      <p className={styles.recSub}>{rec.subtitle}</p>
                    </div>
                  </div>
                  <span className={styles.recRisk} style={{ color: rec.riskColor }}>{rec.risk}</span>
                </div>
                <p className={styles.recWhy}>{rec.why}</p>
                <div className={styles.recMeta}>
                  <span>⏱ {rec.horizon}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CTA button */}
      <div className={styles.px} style={{ marginTop: 'var(--space-6)' }}>
        <button
          className={styles.ctaBtn}
          onClick={() => navigate('/grow/recommendations')}
        >
          Explore educational options
        </button>
        <p className={styles.poweredBy}>{profile.disclaimer}</p>
      </div>
    </div>
  )
}

function ReadinessGuardrail({ profile }: { profile: GrowProfile }) {
  const navigate = useNavigate()
  const doneCount = profile.checklist.filter(c => c.done).length
  const pct = Math.round((doneCount / profile.checklist.length) * 100)

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <p className={styles.pageTitle}>Grow</p>
        <div className={styles.avatarBtn}>AK</div>
      </div>

      <div className={styles.px}><QuickLinks /></div>

      {/* Not ready card */}
      <div className={styles.px}>
        <div className={styles.guardrailCard}>
          <AlertTriangle size={24} color="#B45309" strokeWidth={1.75} />
          <h1 className={styles.guardrailTitle}>Almost ready to invest</h1>
          <p className={styles.guardrailSub}>
            Complete a few financial health checks before you start growing your wealth.
          </p>
          <RadialGauge pct={pct} size={120} strokeWidth={11} color="var(--color-warning)" />
          <p className={styles.guardrailPct}>{doneCount} of {profile.checklist.length} criteria met</p>
        </div>
      </div>

      {/* Checklist */}
      <div className={styles.px}>
        <p className={styles.pathsTitle}>Your Readiness Checklist</p>
        <div className={styles.checkList}>
          {profile.checklist.map((item) => (
            <div key={item.key} className={`${styles.checkItem} ${item.done ? styles.checkDone : ''}`}>
              {item.done
                ? <CheckCircle2 size={18} color="var(--color-positive)" strokeWidth={1.75} />
                : <div className={styles.checkCircle} />
              }
              <div className={styles.checkBody}>
                <p className={styles.checkLabel}>{item.label}</p>
                <div className={styles.checkTrack}>
                  <div
                    className={styles.checkFill}
                    style={{
                      transform: `scaleX(${item.progress})`,
                      background: item.done ? 'var(--color-positive)' : 'var(--color-warning)',
                    }}
                  />
                </div>
                <span className={styles.checkDetail}>{item.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Go to budgets CTA */}
      <div className={styles.px}>
        <button className={styles.ctaBtn} onClick={() => navigate('/budgets')}>
          Work on missing criteria →
        </button>
        <p className={styles.poweredBy}>{profile.disclaimer}</p>
      </div>
    </div>
  )
}

export default function Grow() {
  const [profile, setProfile] = useState<GrowProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<GrowProfile>('/api/v1/grow/profile')
      .then(setProfile)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.px}><SkeletonCard /></div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={styles.page}>
        <div className={styles.px}><ErrorState message={error ?? undefined} /></div>
      </div>
    )
  }

  return profile.isInvestmentEligible ? <GrowHome profile={profile} /> : <ReadinessGuardrail profile={profile} />
}
