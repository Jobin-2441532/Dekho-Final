/* ── Monthly Wrap — Spotify-Wrapped-style fullscreen story experience ── */
import { useState, useEffect, useRef, type TouchEvent, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Loader2, Share2 } from 'lucide-react'
import { useWrapData } from '../hooks/useWrapData'
import styles from './MonthlyWrap.module.css'

const SLIDE_DURATION_MS = 5500

/* ── Animated count-up — restarts fresh every time its slide mounts ── */
function AnimatedNumber({ value, prefix = '', suffix = '', duration = 900 }: { value: number, prefix?: string, suffix?: string, duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{prefix}{display.toLocaleString()}{suffix}</>
}

/* ── Ambient floating orbs — gives an otherwise static gradient some life ── */
function AmbientOrbs({ seed }: { seed: number }) {
  const orbs = [0, 1, 2].map((i) => {
    const angle = (seed * 47 + i * 137) % 360
    const top = 10 + ((seed * 23 + i * 61) % 60)
    const left = 5 + ((seed * 31 + i * 89) % 80)
    return { angle, top, left, size: 90 + (i * 40), duration: 7 + i * 2.5 }
  })
  return (
    <div className={styles.orbLayer} aria-hidden="true">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className={styles.orb}
          style={{ top: `${o.top}%`, left: `${o.left}%`, width: o.size, height: o.size }}
          animate={{
            x: [0, Math.cos((o.angle * Math.PI) / 180) * 26, 0],
            y: [0, Math.sin((o.angle * Math.PI) / 180) * 26, 0],
            opacity: [0.35, 0.6, 0.35],
          }}
          transition={{ duration: o.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ── Confetti burst — plays once, for the finale slide ── */
function ConfettiBurst() {
  const colors = ['#fff', '#ffd28c', '#ff9e9e', '#9ee6c9', '#a6c8ff']
  const particles = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * 360 + (i % 2 === 0 ? 8 : -8)
    const distance = 110 + (i % 4) * 26
    return {
      x: Math.cos((angle * Math.PI) / 180) * distance,
      y: Math.sin((angle * Math.PI) / 180) * distance,
      color: colors[i % colors.length],
      delay: (i % 6) * 0.03,
    }
  })
  return (
    <div className={styles.confettiLayer} aria-hidden="true">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className={styles.confettiDot}
          style={{ background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}
const emojiPop: Variants = {
  hidden: { opacity: 0, scale: 0.3, rotate: -12 },
  show: { opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 260, damping: 16 } },
}
const slideVariants: Variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? -50 : 50, opacity: 0 }),
}

export default function MonthlyWrap() {
  const navigate = useNavigate()
  const [slide, setSlide] = useState(0)
  const [direction, setDirection] = useState(1)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)

  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)

  // We default to last month for the wrap
  const now = new Date()
  let month = now.getMonth() // 0-indexed, so getMonth() is actually last month (1-12)
  let year = now.getFullYear()
  if (month === 0) {
    month = 12
    year -= 1
  }

  const { data, loading, error } = useWrapData(year, month)

  const SLIDES = data ? buildSlides(data) : []

  const goTo = (i: number) => {
    if (i < 0) return
    if (i >= SLIDES.length) {
      navigate(-1)
      return
    }
    setDirection(i >= slide ? 1 : -1)
    elapsedRef.current = 0
    setProgress(0)
    setSlide(i)
  }

  // Auto-advance with pause support
  useEffect(() => {
    if (!data || paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    startRef.current = performance.now() - elapsedRef.current

    const tick = (now: number) => {
      elapsedRef.current = now - startRef.current
      const pct = Math.min(1, elapsedRef.current / SLIDE_DURATION_MS)
      setProgress(pct)
      if (pct >= 1) {
        goTo(slide + 1)
      } else {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, paused, data])

  if (loading || !data) {
    return (
      <div className={styles.loadingPage}>
        <Loader2 className={styles.spinner} size={32} />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className={styles.loadingPage}>
        <p style={{ color: '#fff' }}>{error}</p>
      </div>
    )
  }

  const current = SLIDES[slide]
  const isFinale = slide === SLIDES.length - 1
  const minSwipeDistance = 50

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setPaused(true)
  }

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    setPaused(false)
    if (touchStart === null || touchEnd === null) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) goTo(slide + 1)
    if (isRightSwipe) goTo(slide - 1)
    // Small movements (a plain tap) fall through to the tap zones' onClick below.
  }

  const handleShare = async () => {
    const text = `My ${data.period} Dekho Wrap: earned ₹${data.income.total.toLocaleString()}, saved ${Math.round(data.savings_rate * 100)}%, and I'm a "${data.personality}" 🎭`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Dekho Wrap', text })
      } catch {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <div
      className={styles.stage}
      style={{ '--slide-grad': current.gradient } as CSSProperties}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
    >
      <span key={`bigmark-${slide}`} className={styles.bigMark} aria-hidden="true">{current.emoji}</span>
      <AmbientOrbs seed={slide} />
      {isFinale && <ConfettiBurst key={`confetti-${slide}`} />}

      {/* Progress bars */}
      <div className={styles.progressRow}>
        {SLIDES.map((_, i) => (
          <div key={i} className={styles.progressTrack}>
            <motion.div
              className={styles.progressFill}
              animate={{ width: i < slide ? '100%' : i === slide ? `${progress * 100}%` : '0%' }}
              transition={{ ease: 'linear', duration: i === slide ? 0.1 : 0.2 }}
            />
          </div>
        ))}
      </div>

      <div className={styles.topBar}>
        <p className={styles.period}>{data.period} Wrap</p>
        <button className={styles.closeBtn} onClick={() => navigate(-1)} aria-label="Close">
          <X size={22} />
        </button>
      </div>

      {/* Tap zones */}
      <button className={styles.tapZoneLeft} onClick={() => goTo(slide - 1)} aria-label="Previous" />
      <button className={styles.tapZoneRight} onClick={() => goTo(slide + 1)} aria-label="Next" />

      {/* Slide content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={slide}
          className={styles.content}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div className={styles.contentInner} variants={staggerContainer} initial="hidden" animate="show">
            <motion.span className={styles.emoji} variants={emojiPop}>{current.emoji}</motion.span>
            <motion.p className={styles.label} variants={fadeUp}>{current.label}</motion.p>
            <motion.h1 className={styles.headline} variants={fadeUp}>
              {current.count !== undefined ? (
                <>{current.before}<AnimatedNumber value={current.count} prefix={current.countPrefix} suffix={current.countSuffix} /></>
              ) : current.headline}
            </motion.h1>
            {current.sub && <motion.p className={styles.sub} variants={fadeUp}>{current.sub}</motion.p>}
            {current.progressPct !== undefined && (
              <motion.div className={styles.numberBar} variants={fadeUp}>
                <motion.div
                  className={styles.numberBarFill}
                  initial={{ width: '0%' }}
                  animate={{ width: `${current.progressPct}%` }}
                  transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </motion.div>
            )}
            {current.bars && (
              <motion.div className={styles.barsRow} variants={fadeUp}>
                {current.bars.map((b, i) => {
                  const max = Math.max(...current.bars!.map(x => x.amount))
                  const pct = max > 0 ? Math.round((b.amount / max) * 100) : 0
                  return (
                    <div key={b.label} className={styles.barCol}>
                      <motion.div
                        className={styles.barFill}
                        style={{ background: b.color }}
                        initial={{ height: '0%' }}
                        animate={{ height: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      />
                      <span className={styles.barEmoji}>{b.emoji}</span>
                      <span className={styles.barLabel}>{b.label}</span>
                    </div>
                  )
                })}
              </motion.div>
            )}
            {current.footer && <motion.div variants={fadeUp} style={{ width: '100%' }}>{current.footer}</motion.div>}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Nav arrows (desktop-friendly, decorative on mobile) */}
      <div className={styles.arrowRow}>
        <button className={styles.arrowBtn} onClick={() => goTo(slide - 1)} disabled={slide === 0} aria-label="Previous slide">
          <ChevronLeft size={18} />
        </button>
        {isFinale && (
          <button className={styles.shareBtn} onClick={handleShare}>
            <Share2 size={16} /> Share your wrap
          </button>
        )}
        <button className={styles.arrowBtn} onClick={() => goTo(slide + 1)} aria-label="Next slide">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

interface Slide {
  emoji: string
  label: string
  before?: string
  count?: number
  countPrefix?: string
  countSuffix?: string
  headline?: string
  sub?: string
  gradient: string
  footer?: ReactNode
  progressPct?: number
  bars?: { label: string; amount: number; emoji: string; color: string }[]
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Food & Dining': '🍴', 'Food': '🍴', 'Shopping': '🛍️', 'Transport': '🚗',
  'Entertainment': '🎬', 'Bills': '⚡', 'Utilities': '⚡', 'Health': '💊',
  'Housing': '🏠', 'Rent': '🏠', 'Travel': '✈️', 'Groceries': '🛒', 'Grocery': '🛒',
  'Investment': '🌱', 'Credit Card': '💳', 'Loan EMI': '💳',
}
const BAR_COLORS = ['#e2ab86', '#c9a15a', '#a97b52', '#8a6045']

function buildSlides(data: NonNullable<ReturnType<typeof useWrapData>['data']>): Slide[] {
  const slides: Slide[] = [
    {
      emoji: '👋',
      label: data.period.toUpperCase(),
      headline: "Let's rewind your month.",
      sub: "Here's how your money moved — the highs, the splurges, and everything Dekho noticed.",
      gradient: 'linear-gradient(160deg, #3d2a1f 0%, #6c482d 55%, #a97452 100%)',
    },
    {
      emoji: '💼',
      label: 'INCOME',
      before: 'You earned ',
      count: data.income.total,
      countPrefix: '₹',
      sub: `${data.income.vs_last >= 0 ? '↑' : '↓'} ₹${Math.abs(data.income.vs_last).toLocaleString()} vs last month`,
      gradient: 'linear-gradient(160deg, #114b3f 0%, #1b7a5e 55%, #3fae86 100%)',
    },
    {
      emoji: '🍴',
      label: 'SPENDING',
      before: 'You spent ',
      count: data.expenses.total,
      countPrefix: '₹',
      sub: `${data.expenses.top_category} led the way at ₹${data.expenses.top_amount.toLocaleString()}`,
      progressPct: data.income.total > 0 ? Math.min(100, Math.round((data.expenses.total / data.income.total) * 100)) : undefined,
      gradient: 'linear-gradient(160deg, #4a1d0f 0%, #8c3a1a 55%, #d9702e 100%)',
    },
  ]

  if (data.expenses.category_breakdown && data.expenses.category_breakdown.length > 0) {
    slides.push({
      emoji: '📊',
      label: 'WHERE IT WENT',
      headline: `${data.expenses.top_category} ran the show this month.`,
      gradient: 'linear-gradient(165deg, #2a2018 0%, #191310 100%)',
      bars: data.expenses.category_breakdown.map((c, i) => ({
        label: c.category,
        amount: c.amount,
        emoji: CATEGORY_EMOJI[c.category] ?? '💰',
        color: BAR_COLORS[i % BAR_COLORS.length],
      })),
    })
  }

  slides.push(
    {
      emoji: '⭐',
      label: 'SAVINGS',
      before: 'You saved ',
      count: Math.round(data.savings_rate * 100),
      countSuffix: '% of what you earned',
      sub: data.savings_rate >= data.savings_goal_rate
        ? `Above your ${Math.round(data.savings_goal_rate * 100)}% goal — great job!`
        : `Your goal is ${Math.round(data.savings_goal_rate * 100)}% — keep pushing!`,
      gradient: 'linear-gradient(160deg, #0f2e4a 0%, #1a5c8c 55%, #2e9fd9 100%)',
    },
    {
      emoji: data.net_worth_delta >= 0 ? '📈' : '📉',
      label: 'CASHFLOW',
      before: data.net_worth_delta >= 0 ? 'You came out ' : 'You spent ',
      count: Math.abs(data.net_worth_delta),
      countPrefix: '₹',
      countSuffix: data.net_worth_delta >= 0 ? ' ahead' : ' more than you earned',
      sub: data.net_worth_delta >= 0 ? 'Positive cashflow this month 🚀' : 'A dip this month — next month is a reset.',
      gradient: 'linear-gradient(160deg, #3d1a4a 0%, #6c2e8c 55%, #a355c9 100%)',
    },
  )

  if (data.top_weekday.day && data.top_weekday.day !== 'None') {
    slides.push({
      emoji: '📅',
      label: 'SPENDING PATTERN',
      headline: `${data.top_weekday.day}s are your spending day.`,
      sub: `₹${data.top_weekday.amount.toLocaleString()} — ${data.top_weekday.pct_of_total}% of this month's spending happened on ${data.top_weekday.day}s.`,
      gradient: 'linear-gradient(160deg, #1f3d4a 0%, #1a6c8c 55%, #2ea9d9 100%)',
    })
  }

  if (data.category_shift.category && data.category_shift.category !== 'None') {
    const { category, delta, is_new, direction } = data.category_shift
    slides.push({
      emoji: is_new ? '🆕' : direction === 'up' ? '⬆️' : '⬇️',
      label: 'CATEGORY SHIFT',
      before: is_new ? `${category} showed up for the first time — ` : `${category} ${direction === 'up' ? 'grew by' : 'shrank by'} `,
      count: delta,
      countPrefix: '₹',
      sub: is_new
        ? `A new category in your spending this month.`
        : direction === 'up'
          ? `Worth keeping an eye on next month.`
          : `Nice pullback compared to last month.`,
      gradient: 'linear-gradient(160deg, #4a2e0f 0%, #8c621a 55%, #d9a02e 100%)',
    })
  }

  if (data.top_merchant.name && data.top_merchant.name !== 'None') {
    slides.push({
      emoji: '🛍️',
      label: 'FAVOURITE SPOT',
      headline: data.top_merchant.name,
      sub: `You went back ${data.top_merchant.count} time${data.top_merchant.count === 1 ? '' : 's'} this month.`,
      gradient: 'linear-gradient(160deg, #4a0f1f 0%, #8c1a3a 55%, #d92e5f 100%)',
    })
  }

  if (data.biggest_spend.merchant && data.biggest_spend.merchant !== 'None') {
    slides.push({
      emoji: '💎',
      label: 'BIGGEST SPLURGE',
      count: data.biggest_spend.amount,
      countPrefix: '₹',
      sub: `At ${data.biggest_spend.merchant}. Worth it? 😉`,
      gradient: 'linear-gradient(160deg, #1a1a4a 0%, #2e2e8c 55%, #5555d9 100%)',
    })
  }

  if (data.goals && data.goals.length > 0) {
    const goal = data.goals[0]
    slides.push({
      emoji: '🎯',
      label: 'GOAL PROGRESS',
      count: Math.round(goal.progress * 100),
      countSuffix: `% to ${goal.name}`,
      sub: goal.added > 0 ? `You added ₹${goal.added.toLocaleString()} this month.` : "Let's build on this next month.",
      gradient: 'linear-gradient(160deg, #4a3d0f 0%, #8c761a 55%, #d9b92e 100%)',
    })
  }

  slides.push({
    emoji: '🎭',
    label: 'YOUR DEKHO PERSONALITY',
    headline: `You're a ${data.personality}`,
    sub: 'Based on how you spent this month.',
    gradient: 'linear-gradient(160deg, #0f4a3d 0%, #1a8c76 55%, #2ed9b9 100%)',
  })

  slides.push({
    emoji: '🐘',
    label: 'DEKHO SAYS',
    headline: data.dekho_says,
    gradient: 'linear-gradient(160deg, #2a1d3d 0%, #4a2e6c 55%, #7455a3 100%)',
  })

  slides.push({
    emoji: '✨',
    label: "THAT'S A WRAP",
    headline: `${data.period}, summed up.`,
    gradient: 'linear-gradient(160deg, #3d2a1f 0%, #6c482d 55%, #a97452 100%)',
    footer: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', marginTop: 24 }}>
        {[
          { label: 'Income', value: `₹${data.income.total.toLocaleString()}` },
          { label: 'Expenses', value: `₹${data.expenses.total.toLocaleString()}` },
          { label: 'Saved', value: `${Math.round(data.savings_rate * 100)}%` },
          { label: 'Top Category', value: data.expenses.top_category },
        ].map((h) => (
          <div key={h.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '14px 12px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Fraunces', var(--font-headline), serif", fontSize: 19, fontWeight: 600, color: '#fff' }}>{h.value}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{h.label}</p>
          </div>
        ))}
      </div>
    ),
  })

  return slides
}
