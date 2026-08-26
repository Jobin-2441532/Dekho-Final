/* ── Wealth page (formerly "Assets") — real net worth, category
   breakdown, and monthly signals, computed server-side from the
   user's actual Asset and Transaction rows. ── */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Settings, AlertTriangle } from 'lucide-react'
import { SkeletonCard, ErrorState } from '../components/ui/LoadingState'
import { api } from '../lib/api'
import styles from './Assets.module.css'

interface WealthProfile {
  netWorth: number
  savings: { total: number; monthsCovered: number }
  investments: { total: number; contributionThisMonth: number }
  liabilities: { obligationsThisMonth: number }
  cashflowDelta: number
  narrative: string
  attention: string | null
  trend: { label: string; value: number }[]
  movement: { merchant: string; category: string; date: string; amount: number; isPositive: boolean }[]
  hasAssets: boolean
  isSample: boolean
}

/* Mini sparkline using SVG */
function Sparkline({ data, color = '#6C482D' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const min = Math.min(...data, 0)
  const max = Math.max(...data, 0)
  const range = max - min || 1
  const w = 200, h = 60
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.sparkline} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Assets() {
  const navigate = useNavigate()
  const [data, setData] = useState<WealthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<WealthProfile>('/api/v1/wealth/profile')
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ padding: 'var(--space-5)' }}>
      <SkeletonCard />
      <div style={{ height: 'var(--space-4)' }} />
      <SkeletonCard />
    </div>
  )

  if (error || !data) return (
    <div style={{ padding: 'var(--space-5)' }}>
      <ErrorState message={error ?? undefined} />
    </div>
  )

  const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
  const savingsGoalMonths = 3
  const savingsPct = Math.min(100, Math.round((data.savings.monthsCovered / savingsGoalMonths) * 100))

  return (
    <div className={styles.page}>
      {/* ── Top Bar ── */}
      <div className={styles.topBar}>
        <p style={{ fontFamily: 'var(--font-headline)', fontSize: '24px', fontWeight: 'bold', color: 'var(--color-on-surface)', margin: 0 }}>Wealth</p>
        <button className={styles.iconBtn} onClick={() => navigate('/settings')} aria-label="Settings">
          <Settings size={18} strokeWidth={1.75} />
        </button>
      </div>

      {/* ── Net Worth Hero ── */}
      <div className={styles.px}>
        <div className={styles.heroCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className={styles.heroLabel}>NET WORTH</p>
            {data.isSample && (
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.02em', color: 'rgba(255,255,255,0.9)',
                background: 'rgba(255,255,255,0.16)', padding: '3px 9px', borderRadius: '999px',
              }}>
                SAMPLE DATA
              </span>
            )}
          </div>
          <h1 className={styles.heroAmount}>{fmt(data.netWorth)}</h1>
          <div className={styles.heroChange}>
            <span className={styles.heroPct}>{data.cashflowDelta >= 0 ? '↗' : '↘'} {fmt(Math.abs(data.cashflowDelta))}</span>
            <span className={styles.heroChangeSub}>this month's cashflow</span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5, margin: 0 }}>
            {data.narrative}
          </p>
        </div>
      </div>

      {/* ── Attention strip — only shown when there's a real signal ── */}
      {data.attention && (
        <div className={styles.px}>
          <div className={styles.attnStrip}>
            <AlertTriangle size={15} />
            <span>{data.attention}</span>
          </div>
        </div>
      )}

      {/* ── Category Cards ── */}
      <div className={styles.px}>
        <div className={styles.catGrid}>
          <button className={`${styles.catCard} ${styles.savings}`} onClick={() => navigate('/assets/savings')}>
            <div className={styles.catTop}>
              <div className={styles.catNameWrap}>
                <div className={styles.catIcon}>🐷</div>
                <div>
                  <p className={styles.catName}>Savings</p>
                  <p className={styles.catSub}>
                    {data.savings.monthsCovered > 0
                      ? `${data.savings.monthsCovered} months of expenses covered`
                      : 'Safe & accessible'}
                  </p>
                </div>
              </div>
              <p className={styles.catAmt}>{fmt(data.savings.total)}</p>
            </div>
            <div className={styles.catProgressTrack}>
              <div className={styles.catProgressFill} style={{ width: `${savingsPct}%` }} />
            </div>
          </button>

          <button className={`${styles.catCard} ${styles.investments}`} onClick={() => navigate('/assets/investments')}>
            <div className={styles.catTop}>
              <div className={styles.catNameWrap}>
                <div className={styles.catIcon}>🌱</div>
                <div>
                  <p className={styles.catName}>Investments</p>
                  <p className={styles.catSub}>SIP + mutual funds</p>
                </div>
              </div>
              <p className={styles.catAmt}>{fmt(data.investments.total)}</p>
            </div>
            <div className={styles.catFoot}>
              <span className={styles.catSub}>
                {data.investments.contributionThisMonth > 0 ? 'Added this month' : 'No contribution logged this month'}
              </span>
              {data.investments.contributionThisMonth > 0 && (
                <span className={styles.catChip}>+{fmt(data.investments.contributionThisMonth)}</span>
              )}
            </div>
          </button>

          <button className={`${styles.catCard} ${styles.liabilities}`} onClick={() => navigate('/assets/liabilities')}>
            <div className={styles.catTop}>
              <div className={styles.catNameWrap}>
                <div className={styles.catIcon}>💳</div>
                <div>
                  <p className={styles.catName}>Liabilities</p>
                  <p className={styles.catSub}>Credit card + EMI, this month</p>
                </div>
              </div>
              <p className={styles.catAmt}>{fmt(data.liabilities.obligationsThisMonth)}</p>
            </div>
            <div className={styles.catFoot}>
              <span className={styles.catSub}>
                {data.liabilities.obligationsThisMonth > 0 ? 'Paid this month' : 'Nothing logged this month'}
              </span>
              <ChevronRight size={16} className={styles.chevron} />
            </div>
          </button>
        </div>
      </div>

      {/* ── Cashflow trend (real, last 6 months) ── */}
      <div className={styles.px}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <p className={styles.chartTitle}>Cashflow trend</p>
          </div>
          <div className={styles.chartArea}>
            <Sparkline data={data.trend.map(t => t.value)} color="var(--color-primary)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {data.trend.map(t => (
              <span key={t.label} style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--color-muted)' }}>{t.label}</span>
            ))}
          </div>
          <p className={styles.chartInsight}>
            💡 Income minus expenses, month by month — a proxy for how your net worth is trending.
          </p>
        </div>
      </div>

      {/* ── Recent movement ── */}
      {data.movement.length > 0 && (
        <div className={styles.px}>
          <p className={styles.breakdownTitle} style={{ marginBottom: 'var(--space-3)' }}>Recent movement</p>
          <div className={styles.moveList}>
            {data.movement.map((m, i) => (
              <div key={i} className={styles.moveRow}>
                <div className={styles.moveIcon}>{m.isPositive ? '🌱' : '💳'}</div>
                <div className={styles.moveBody}>
                  <p className={styles.moveTitle}>{m.merchant}</p>
                  <p className={styles.moveSub}>{m.category} · {m.date}</p>
                </div>
                <span className={`${styles.moveAmt} ${m.isPositive ? styles.pos : styles.neg}`}>
                  {m.isPositive ? '+' : ''}{fmt(m.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
