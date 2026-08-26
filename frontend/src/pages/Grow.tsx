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
          <Sparkles size={18} className={styles.readinessIcon} strokeWidth={2} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className={styles.readinessBadgeLabel}>YOUR STATUS</span>
            <span className={styles.readinessBadgeText}>
              {profile.emergencyFund.monthsCovered >= 3
                ? `Your emergency fund covers ${profile.emergencyFund.monthsCovered} months — you're in a good position to explore investing.`
                : `Your emergency fund covers ${profile.emergencyFund.monthsCovered} months. Building it toward 3 months is a strong next step.`}
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
          <div className={styles.guardrailTrack}>
            <div className={styles.guardrailFill} style={{ width: `${pct}%` }} />
          </div>
          <p className={styles.guardrailPct}>{doneCount} of {profile.checklist.length} criteria met ({pct}%)</p>
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
              <div>
                <p className={styles.checkLabel}>{item.label}</p>
                <p className={styles.recWhy} style={{ margin: 0 }}>{item.detail}</p>
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
