import { useState, useMemo, useEffect } from 'react'
import Card from '../components/ui/Card'
import MetricBlock from '../components/ui/MetricBlock'
import Chip from '../components/ui/Chip'
import { PageHeader, Section, Grid2 } from '../components/layout/AppShell'
import { SkeletonCard, ErrorState } from '../components/ui/LoadingState'
import { api } from '../lib/api'
import {
  CATEGORY_COLOR, CATEGORY_BG, CATEGORY_EMOJI,
  getCategoryTotals, type Transaction
} from '../data/mockData'

// Weekly day labels
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// Build a simple 4-week heatmap
function buildHeatmap(txns: Transaction[]): number[][] {
  const grid: number[][] = Array.from({ length: 4 }, () => Array(7).fill(0))
  txns.forEach(tx => {
    const d = new Date(tx.date)
    const day = (d.getDay() + 6) % 7 // Mon=0
    const week = Math.min(Math.floor((d.getDate() - 1) / 7), 3)
    grid[week][day] += tx.amount
  })
  return grid
}

function heatColor(val: number, maxHeat: number): string {
  if (val === 0) return 'var(--color-surface-2)'
  const pct = maxHeat === 0 ? 0 : val / maxHeat
  if (pct < 0.25) return '#F9ECD9'
  if (pct < 0.5)  return '#D4956A'
  if (pct < 0.75) return '#A67C5B'
  return '#5C3D2E'
}

const PATTERNS = [
  { emoji: '🔁', title: 'You order food every ~2 days', text: 'Zomato and Swiggy show up more than any other merchant. That\'s ₹4,165 in 14 days — consistent but manageable.' },
  { emoji: '📱', title: 'Subscriptions auto-renew quietly', text: '3 subscriptions renewed this month: Netflix, Spotify, YouTube. Together: ₹957/month, ₹11,484/year.' },
  { emoji: '🏋️', title: 'Health spend is steady', text: 'Cult.fit at ₹1,999 renews every month. You\'ve maintained this for at least 2 months — that\'s a strong habit.' },
]

export default function Behavior() {
  const [period, setPeriod] = useState<'april' | 'march'>('april')
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ data: Transaction[] }>('/api/v1/dashboard/transactions', { limit: 500 })
      .then(res => setTransactions(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const aprilTx = useMemo(() => transactions.filter(t => t.date.startsWith('2026-04')), [transactions])
  const marchTx = useMemo(() => transactions.filter(t => t.date.startsWith('2026-03')), [transactions])

  const aprilTotal = aprilTx.reduce((s,t) => s+t.amount, 0)
  const marchTotal = marchTx.reduce((s,t) => s+t.amount, 0)

  const aprilCats = useMemo(() => getCategoryTotals(aprilTx), [aprilTx])
  const marchCats = useMemo(() => getCategoryTotals(marchTx), [marchTx])

  const cats = period === 'april' ? aprilCats : marchCats
  const maxCatAmt  = cats[0]?.total ?? 1
  const total = period === 'april' ? aprilTotal : marchTotal

  const heatmap = useMemo(() => buildHeatmap(aprilTx), [aprilTx])
  const maxHeat = Math.max(...heatmap.flat())

  if (loading) return <div><PageHeader title="Behavior" subtitle="Your spending patterns and habits" /><Section><SkeletonCard /></Section></div>
  if (error) return <div><PageHeader title="Behavior" subtitle="Your spending patterns and habits" /><ErrorState message={error} /></div>

  return (
    <div>
      <PageHeader
        title="Behavior"
        subtitle="Your spending patterns and habits"
      />

      {/* Month picker */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <Chip variant="filter" active={period === 'april'} onClick={() => setPeriod('april')}>April 2026</Chip>
        <Chip variant="filter" active={period === 'march'} onClick={() => setPeriod('march')}>March 2026</Chip>
      </div>

      {/* Summary row */}
      <Section>
        <Grid2>
          <Card variant="brand">
            <MetricBlock
              label={period === 'april' ? 'Spent so far (Apr)' : 'Total spend (Mar)'}
              value={total}
              size="md"
              inverted
              subtext={period === 'april' ? 'Apr 1–14, ₹2,000/day avg' : 'Full March'}
            />
          </Card>
          <Card>
            <MetricBlock
              label="Month-over-month"
              value={Math.abs(aprilTotal - marchTotal)}
              size="md"
              change={{
                value: marchTotal > 0
                  ? `${Math.round(Math.abs((aprilTotal - marchTotal) / marchTotal) * 100)}% ${aprilTotal >= marchTotal ? 'more' : 'less'} than March`
                  : 'No March data to compare',
                direction: aprilTotal >= marchTotal ? 'up' : 'down',
              }}
              subtext="Comparing Apr pace vs Mar full"
            />
          </Card>
        </Grid2>
      </Section>

      {/* Spending heatmap */}
      <Section label="Daily spending intensity — April">
        <Card>
          <div style={{ overflowX: 'auto' }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
              <span />
              {DAYS.map((d, i) => (
                <span key={i} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>{d}</span>
              ))}
            </div>
            {heatmap.map((week, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: '40px repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center' }}>W{wi + 1}</span>
                {week.map((val, di) => (
                  <div
                    key={di}
                    title={val > 0 ? `₹${val.toLocaleString('en-IN')}` : 'No spend'}
                    style={{
                      height: '28px',
                      borderRadius: '6px',
                      background: heatColor(val, maxHeat),
                      transition: 'background 0.2s',
                    }}
                  />
                ))}
              </div>
            ))}
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', fontFamily: 'var(--font-body)' }}>
              Darker = higher spend. Weekends tend to show more transactions.
            </p>
          </div>
        </Card>
      </Section>

      {/* Category breakdown */}
      <Section label="Where your money went">
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {cats.map(({ category, total: amt }) => {
              const marchAmt = marchCats.find(c => c.category === category)?.total ?? 0
              const pct = Math.round((amt / (period === 'april' ? maxCatAmt : marchCats[0]?.total ?? 1)) * 100)
              return (
                <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: CATEGORY_BG[category] ?? '#F3F4F6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', flexShrink: 0,
                      }}>
                        {CATEGORY_EMOJI[category] ?? '💰'}
                      </span>
                      <div>
                        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{category}</p>
                        {period === 'april' && marchAmt > 0 && (
                          <p style={{ fontSize: '11px', color: amt > marchAmt ? 'var(--color-warning)' : 'var(--color-positive)' }}>
                            {amt > marchAmt ? '↑' : '↓'} vs ₹{marchAmt.toLocaleString('en-IN')} in Mar
                          </p>
                        )}
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                      ₹{amt.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {/* Category bar */}
                  <div style={{ height: '6px', background: 'var(--color-surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: CATEGORY_COLOR[category] ?? '#9CA3AF',
                      borderRadius: '999px',
                      transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </Section>

      {/* Spending patterns */}
      <Section label="Patterns we noticed">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {PATTERNS.map(p => (
            <Card key={p.emoji} hoverable>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 'var(--text-2xl)', flexShrink: 0 }}>{p.emoji}</span>
                <div>
                  <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-1)' }}>{p.title}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{p.text}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  )
}
