/* ── Path Detail: Index Fund SIP — generic category explainer.
   No named scheme/AMC, no fabricated historical returns presented as fact,
   no brokerage redirect claim — see plan for the regulatory reasoning. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Info } from 'lucide-react'
import { api } from '../lib/api'
import styles from './SubPage.module.css'

const CHECKLIST = [
  'Tracks a broad market index (e.g. Nifty 50, Sensex) rather than picking individual stocks',
  'Typically lower expense ratios than actively managed funds, since there\'s no active stock-picking',
  'Passive by design — performance follows the index, for better or worse',
  'Many funds allow SIPs starting from a few hundred to a few thousand rupees',
  'Generally liquid — most can be redeemed on any business day, subject to the fund\'s exit load rules',
]

const ILLUSTRATION_RATE = 0.10 // assumed, for illustration only — not a promised or historical return
const DURATIONS = [5, 10, 15]

function projectedValue(monthly: number, years: number, annualRate: number): number {
  const r = annualRate / 12
  const n = years * 12
  if (r === 0) return Math.round(monthly * n)
  return Math.round(monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r))
}

export default function PathDetailIndexFundSIP() {
  const navigate = useNavigate()
  const [monthly, setMonthly] = useState(5000)
  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

  useEffect(() => {
    api.get<{ suggestedMonthlyAmount: number }>('/api/v1/grow/profile')
      .then(p => { if (p.suggestedMonthlyAmount > 0) setMonthly(p.suggestedMonthlyAmount) })
      .catch(() => { /* keep the ₹5,000 default illustration */ })
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/grow')} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <p className={styles.headerTitle}>Index Fund SIP</p>
        <div style={{ width: 36 }} />
      </div>

      {/* Hero */}
      <div className={styles.px}>
        <div className={styles.heroCard}>
          <p className={styles.heroLabel}>EDUCATIONAL CATEGORY</p>
          <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: '#fff', lineHeight: 1.2 }}>
            Index Fund SIP, explained
          </h1>
          <div className={styles.heroMeta}>
            <span className={styles.heroBadge}>MARKET-LINKED</span>
            <span className={styles.heroSub}>Returns are not fixed and can be negative in any given year</span>
          </div>
        </div>
      </div>

      {/* Why this category */}
      <div className={styles.px}>
        <p className={styles.sectionTitle}>What defines this category</p>
        <div className={styles.list}>
          {CHECKLIST.map((item) => (
            <div key={item} className={styles.checkRow}>
              <CheckCircle2 size={16} color="var(--color-positive)" strokeWidth={2} />
              <p className={styles.checkText}>{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Illustration, not a promise */}
      <div className={styles.px}>
        <p className={styles.sectionTitle}>Illustrative example — {fmt(monthly)}/mo</p>
        <div className={styles.list}>
          {DURATIONS.map(years => (
            <div key={years} className={styles.holdingRow}>
              <div>
                <p className={styles.holdingName}>After {years} years</p>
                <p className={styles.holdingType}>assuming a hypothetical {Math.round(ILLUSTRATION_RATE * 100)}% p.a.</p>
              </div>
              <p className={styles.holdingAmt}>{fmt(projectedValue(monthly, years, ILLUSTRATION_RATE))}</p>
            </div>
          ))}
        </div>
        <p className={styles.checkText} style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
          This is a hypothetical compounding example to illustrate how regular investing works over time — not a projection, forecast, or promise. Actual returns depend entirely on market performance and could be lower, or negative.
        </p>
      </div>

      {/* Disclaimer */}
      <div className={styles.px}>
        <div className={styles.alertCard}>
          <Info size={14} strokeWidth={1.75} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
          <p className={styles.alertText} style={{ fontSize: 'var(--text-xs)' }}>
            Dekho is not a SEBI-registered investment adviser. This page describes a category of mutual fund for educational purposes, not a specific scheme, and is not a recommendation to invest. Mutual fund investments are subject to market risk — please read scheme documents carefully, or consult a registered adviser, before investing.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className={styles.px}>
        <button className={styles.ctaBtn} onClick={() => navigate('/grow/guide')}>
          Read more before deciding
        </button>
      </div>
    </div>
  )
}
