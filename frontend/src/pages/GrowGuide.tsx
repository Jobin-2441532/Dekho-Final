/* Grow — Read Guidelines: core financial-education modules.
   Generic, needs-first content — no named schemes, no return promises. */
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import styles from './SubPage.module.css'

interface GuideTopic {
  key: string
  emoji: string
  title: string
  paragraphs: string[]
  bulletsLabel: string
  bullets: string[]
  source: string
}

const TOPICS: GuideTopic[] = [
  {
    key: 'emergency-fund',
    emoji: '🛡️',
    title: 'Emergency Fund',
    paragraphs: [
      'An emergency fund is money set aside purely for the unexpected — a job loss, a medical bill, an urgent repair — kept somewhere you can access quickly, without having to sell an investment at a bad time.',
      'A common starting benchmark is 3–6 months of essential expenses (rent, food, utilities, EMIs), held in a savings account or liquid instrument rather than in the stock market or equity mutual funds.',
    ],
    bulletsLabel: 'What to consider',
    bullets: [
      'How stable is your income — salaried with steady pay vs. variable/freelance income usually calls for a bigger buffer.',
      'Who depends on your income — more dependents generally means a larger cushion.',
      'Liquidity matters more than returns here — the goal is availability, not growth.',
    ],
    source: 'Concept grounded in RBI and SEBI investor-education material on financial planning basics.',
  },
  {
    key: 'mutual-funds',
    emoji: '📊',
    title: 'Mutual Funds',
    paragraphs: [
      'A mutual fund pools money from many investors and is managed by a SEBI-registered Asset Management Company (AMC), which invests it in stocks, bonds, or a mix, based on the fund\'s stated objective.',
      'Funds are broadly categorised as equity (higher risk, higher long-term growth potential), debt (lower risk, steadier but modest returns), and hybrid (a mix of both). Every fund carries risk — including the possibility of losing money — and charges an expense ratio that reduces your returns.',
    ],
    bulletsLabel: 'What to consider',
    bullets: [
      'Match the category to your goal\'s time horizon — equity generally needs longer horizons to smooth out volatility.',
      'Check the fund\'s riskometer and expense ratio before investing — both are disclosed by SEBI-mandated rules.',
      'Diversification reduces some risk but does not eliminate it, and past returns are never a guarantee of future performance.',
    ],
    source: 'Concept grounded in SEBI and AMFI (Association of Mutual Funds in India) investor-education material.',
  },
  {
    key: 'sip',
    emoji: '📈',
    title: 'SIP (Systematic Investment Plan)',
    paragraphs: [
      'A SIP is simply a method of investing a fixed amount into a mutual fund at regular intervals (usually monthly), rather than investing a lump sum at once. It builds a savings habit and averages your purchase cost across market ups and downs.',
      'A SIP is not a separate product and not a guarantee against loss — it invests in the same underlying fund, which carries the same market risk. "SIP" describes how you invest, not what you\'re invested in.',
    ],
    bulletsLabel: 'Common misconceptions',
    bullets: [
      '"SIPs are risk-free" — false. The underlying fund can still lose value, especially over short periods.',
      '"A SIP guarantees a fixed return" — false. Returns depend entirely on the fund\'s performance.',
      '"You need a lot of money to start" — false. Many funds allow SIPs starting from a few hundred rupees.',
    ],
    source: 'Concept grounded in AMFI and SEBI investor-education material on systematic investing.',
  },
  {
    key: 'long-term-investing',
    emoji: '🌱',
    title: 'Long-Term Investing',
    paragraphs: [
      'Long-term investing means matching your money to your actual time horizon — years, not days — so short-term market swings matter less and compounding has time to work.',
      'Inflation quietly erodes the value of money left idle; a return that doesn\'t outpace inflation is a real loss even if the number on screen goes up. This is one reason people consider a mix of instruments rather than only cash.',
    ],
    bulletsLabel: 'What to consider',
    bullets: [
      'Time horizon should drive risk level — a goal 10+ years away can usually absorb more short-term volatility than one 1–2 years away.',
      'Compounding rewards patience and consistency more than timing the market.',
      'Volatility (short-term ups and downs) is different from risk of permanent loss — understanding that distinction helps you stay invested through downturns.',
    ],
    source: 'Concept grounded in SEBI investor-education material on financial planning and risk/return basics.',
  },
]

export default function GrowGuide() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/grow')} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <div style={{ width: 36 }} />
      </div>

      <div className={styles.px}>
        <p className={styles.pageSubtitle}>READ GUIDELINES</p>
        <h1 className={styles.pageTitle}>Understand before you invest</h1>
        <p className={styles.pageDesc}>
          These are general educational explanations, not personalized advice — tap a topic to learn the basics before deciding anything.
        </p>

        <div className={styles.guideList}>
          {TOPICS.map(topic => (
            <details key={topic.key} className={styles.guideItem}>
              <summary className={styles.guideSummary}>
                <span className={styles.guideEmoji}>{topic.emoji}</span>
                <span className={styles.guideSummaryTitle}>{topic.title}</span>
                <ChevronDown size={18} className={styles.guideChevron} strokeWidth={1.75} />
              </summary>
              <div className={styles.guideBody}>
                {topic.paragraphs.map((p, i) => (
                  <p key={i} className={styles.guideParagraph}>{p}</p>
                ))}
                <p className={styles.guideSubhead}>{topic.bulletsLabel}</p>
                <ul className={styles.guideBullets}>
                  {topic.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
                <p className={styles.guideSource}>{topic.source}</p>
              </div>
            </details>
          ))}
        </div>

        <p className={styles.poweredBy} style={{ marginTop: 'var(--space-6)', textTransform: 'none', letterSpacing: 'normal' }}>
          Dekho is not a SEBI-registered investment adviser. This content is educational only, not personalized investment advice.
        </p>
      </div>
    </div>
  )
}
