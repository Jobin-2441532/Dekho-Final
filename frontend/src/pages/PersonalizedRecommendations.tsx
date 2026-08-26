/* ── Educational fund categories — generic, illustrative, not personalized
   security advice. No named schemes/AMCs, no "invest now" execution CTA. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, TrendingUp, ShieldCheck, AlertCircle, Info } from 'lucide-react'
import { api } from '../lib/api'
import styles from './SubPage.module.css'

interface GrowProfile {
  riskLabel: string
  emergencyFund: { monthsCovered: number }
  suggestedMonthlyAmount: number
}

export default function PersonalizedRecommendations() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<GrowProfile | null>(null)

  useEffect(() => {
    api.get<GrowProfile>('/api/v1/grow/profile').then(setProfile).catch(() => {})
  }, [])

  const suggestedSip = profile && profile.suggestedMonthlyAmount > 0 ? profile.suggestedMonthlyAmount : 5000

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/grow')} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <div style={{ width: 36 }} />
      </div>

      <div className={styles.px}>
        <p className={styles.pageSubtitle}>EDUCATIONAL CATEGORIES</p>
        <h1 className={styles.pageTitle}>Categories to explore</h1>
        <p className={styles.pageDesc}>
          These are general categories of investment, not specific fund recommendations. Use them to learn what fits your situation — the final decision, and any actual investment, is yours.
        </p>

        {/* Why this fits you card */}
        <div className={styles.rationaleCard}>
          <div className={styles.rationaleHeader}>
            <Sparkles size={18} color="var(--color-on-primary)" />
            <span>Based on your data</span>
          </div>
          <div className={styles.rationaleBody}>
            <div className={styles.rationaleSection}>
              <p className={styles.rationaleLabel}>RISK PROFILE</p>
              <p className={styles.rationaleText}>
                {profile ? <>Your recorded comfort with risk: <strong>{profile.riskLabel}</strong>.</> : (
                  <>Take the <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/grow/risk-check')}>risk check</span> to see this personalized.</>
                )}
              </p>
            </div>
            <div className={styles.rationaleSection}>
              <p className={styles.rationaleLabel}>SAFETY NET</p>
              <p className={styles.rationaleText}>
                {profile
                  ? <>Your emergency fund currently covers <strong>{profile.emergencyFund.monthsCovered} months</strong> of expenses.</>
                  : 'Add income and asset info in Dekho to see this personalized.'}
              </p>
            </div>
          </div>
        </div>

        {/* Fund category cards */}
        <div className={styles.fundList}>
          {/* Liquid Fund category */}
          <div className={styles.fundCard}>
            <div className={styles.fundHeader}>
              <div>
                <div className={styles.suitabilityPill}>
                  <ShieldCheck size={14} /> LOW-RISK CATEGORY
                </div>
                <h2 className={styles.fundName}>Liquid Funds</h2>
              </div>
            </div>
            <div className={styles.fundGrid}>
              <div className={styles.fundStat}>
                <p className={styles.fundStatLabel}>RISK LEVEL</p>
                <p className={styles.fundStatVal}><ShieldCheck size={14} color="var(--color-positive)"/> Low risk</p>
              </div>
              <div className={styles.fundStat}>
                <p className={styles.fundStatLabel}>USE CASE</p>
                <p className={styles.fundStatVal}>High liquidity, short-term parking</p>
              </div>
            </div>
            <div className={styles.fundFooter}>
              <p className={styles.fundDesc}>A category of debt fund investing in short-term instruments — often used for idle cash you may need soon, as an alternative to letting it sit unused.</p>
              <button className={styles.fundInvestBtn} onClick={() => navigate('/assets/investments/mutual-fund')}>
                Learn more <span style={{marginLeft: 4}}>➔</span>
              </button>
            </div>
          </div>

          {/* Index Fund SIP category */}
          <div className={styles.fundCardActive}>
            <div className={styles.fundHeader}>
              <div>
                <div className={styles.wealthCreatorPill}>
                  <TrendingUp size={14} /> LONG-TERM CATEGORY
                </div>
                <h2 className={styles.fundName}>Index Fund SIP</h2>
              </div>
              <div className={styles.fundSipBlock}>
                <p className={styles.fundSipLabel}>ILLUSTRATIVE SIP</p>
                <p className={styles.fundSipAmt}>₹{suggestedSip.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className={styles.fundGrid}>
              <div className={styles.fundStat}>
                <p className={styles.fundStatLabel}>RISK LEVEL</p>
                <p className={styles.fundStatVal}><AlertCircle size={14} color="#B45309"/> Market-linked risk</p>
              </div>
              <div className={styles.fundStat}>
                <p className={styles.fundStatLabel}>USE CASE</p>
                <p className={styles.fundStatVal}>Long-term (5–10+ years)</p>
              </div>
            </div>
            <div className={styles.fundFooter}>
              <p className={styles.fundDesc}>A category of equity fund that tracks a market index rather than picking stocks — commonly used for long-horizon goals, not short-term needs.</p>
              <button className={styles.fundInvestBtn} onClick={() => navigate('/grow/index-fund-sip')}>
                Learn more <span style={{marginLeft: 4}}>➔</span>
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className={styles.alertCard} style={{ marginTop: 'var(--space-5)' }}>
          <Info size={14} strokeWidth={1.75} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
          <p className={styles.alertText} style={{ fontSize: 'var(--text-xs)' }}>
            Dekho is not a SEBI-registered investment adviser. These are general categories for education, not personalized recommendations of any specific scheme. Please do your own research or consult a registered adviser before investing.
          </p>
        </div>
      </div>
    </div>
  )
}
