/* Grow — Market context: current index levels + news, as information only,
   never as a prediction or trading signal. Proxied through the backend so
   no third-party call or key ever reaches the frontend. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Info } from 'lucide-react'
import { api } from '../lib/api'
import { SkeletonCard, ErrorState } from '../components/ui/LoadingState'
import styles from './SubPage.module.css'

interface IndexQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  asOf: string
}

interface NewsItem {
  title: string
  link: string
  source: string
  publishedAt: string
}

interface MarketContext {
  available: boolean
  stale: boolean
  indices: IndexQuote[]
  news: NewsItem[]
  fetchedAt: string | null
  disclaimer: string
}

function formatAsOf(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function GrowMarket() {
  const navigate = useNavigate()
  const [data, setData] = useState<MarketContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<MarketContext>('/api/v1/grow/market')
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/grow')} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <div style={{ width: 36 }} />
      </div>

      <div className={styles.px}>
        <p className={styles.pageSubtitle}>MARKET CONTEXT</p>
        <h1 className={styles.pageTitle}>What's happening in the market</h1>
        <p className={styles.pageDesc}>
          Current numbers and headlines, for context — not a signal to buy, sell, or predict what happens next.
        </p>

        {loading && <SkeletonCard />}

        {!loading && error && !data && <ErrorState message={error} />}

        {!loading && data && !data.available && (
          <ErrorState message="Live market data isn't available right now. Please check back later." />
        )}

        {!loading && data && data.available && (
          <>
            {data.stale && (
              <div className={styles.staleBanner} style={{ marginBottom: 'var(--space-4)' }}>
                Showing the last available snapshot — live data couldn't be refreshed just now.
              </div>
            )}

            {data.indices.length > 0 && (
              <div className={styles.marketIndexGrid} style={{ marginBottom: 'var(--space-5)' }}>
                {data.indices.map(idx => {
                  const positive = idx.change >= 0
                  return (
                    <div key={idx.symbol} className={styles.marketIndexCard}>
                      <p className={styles.marketIndexName}>{idx.name}</p>
                      <p className={styles.marketIndexPrice}>{idx.price.toLocaleString('en-IN')}</p>
                      <p className={`${styles.marketIndexChange} ${positive ? styles.marketIndexChangePos : styles.marketIndexChangeNeg}`}>
                        {positive ? <TrendingUp size={12} style={{ verticalAlign: '-2px' }} /> : <TrendingDown size={12} style={{ verticalAlign: '-2px' }} />}
                        {' '}{positive ? '+' : ''}{idx.change.toLocaleString('en-IN')} ({positive ? '+' : ''}{idx.changePercent}%)
                      </p>
                      <p className={styles.marketIndexAsOf}>As of {formatAsOf(idx.asOf)}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {data.news.length > 0 && (
              <>
                <p className={styles.sectionTitle}>Headlines</p>
                <div className={styles.newsList} style={{ marginBottom: 'var(--space-5)' }}>
                  {data.news.map((item, i) => (
                    <a key={i} className={styles.newsItem} href={item.link} target="_blank" rel="noopener noreferrer">
                      <p className={styles.newsTitle}>{item.title}</p>
                      <p className={styles.newsMeta}>{item.source} · {item.publishedAt}</p>
                    </a>
                  ))}
                </div>
              </>
            )}

            <div className={styles.alertCard}>
              <Info size={14} strokeWidth={1.75} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
              <p className={styles.alertText} style={{ fontSize: 'var(--text-xs)' }}>{data.disclaimer}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
