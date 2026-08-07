import { useState, useEffect } from 'react'
import { Edit2, X, Wallet, Shield, Percent, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { SkeletonCard } from '../components/ui/LoadingState'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import api from '../lib/api'
import styles from './Budgets.module.css'

const GOAL_IMAGES = [
  "https://picsum.photos/seed/dekho_goal1/800/400",
  "https://picsum.photos/seed/dekho_goal2/800/400",
  "https://picsum.photos/seed/dekho_goal3/800/400",
  "https://picsum.photos/seed/dekho_goal4/800/400",
  "https://picsum.photos/seed/dekho_goal5/800/400"
];

export default function Budgets() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'dashboard'|'insights'>('dashboard')
  const [insights, setInsights] = useState<any>(null)
  
  // State for bulk editor
  const [editSection, setEditSection] = useState<string | null>(null)
  const [editBudgets, setEditBudgets] = useState<{[key: string]: number}>({})
  
  // Local state for UI grouping (same categories as before)
  const [categoriesData, setCategoriesData] = useState<any[]>([
    {
      label: 'Essentials', subtitle: 'NON-NEGOTIABLE', spent: 0, budget: 0,
      subcategories: [
        { label: 'Transport', emoji: '🚗', amount: 0, budget: 0, match: ['Transport'] },
        { label: 'Health', emoji: '💊', amount: 0, budget: 0, match: ['Health'] },
        { label: 'Personal Care', emoji: '🧴', amount: 0, budget: 0, match: ['Personal Care'] },
        { label: 'Insurance', emoji: '🛡️', amount: 0, budget: 0, match: ['Insurance'] },
        { label: 'Loan EMI', emoji: '🏦', amount: 0, budget: 0, match: ['Loan', 'EMI'] },
        { label: 'Credit Card', emoji: '💳', amount: 0, budget: 0, match: ['Credit Card'] },
        { label: 'Housing & Household', emoji: '🏠', amount: 0, budget: 0, match: ['Housing', 'Household'] },
        { label: 'Utilities', emoji: '⚡', amount: 0, budget: 0, match: ['Utilities'] },
        { label: 'Food & Dining', emoji: '🍴', amount: 0, budget: 0, match: ['Food & Dining'] },
        { label: 'Groceries', emoji: '🛒', amount: 0, budget: 0, match: ['Groceries'] },
        { label: 'Bills', emoji: '🧾', amount: 0, budget: 0, match: ['Bills'] },
        { label: 'Mess fees', emoji: '📌', amount: 0, budget: 0, match: ['Mess'] },
      ]
    },
    {
      label: 'Lifestyle', subtitle: 'FLEXIBLE', spent: 0, budget: 0,
      subcategories: [
        { label: 'Shopping', emoji: '🛍️', amount: 0, budget: 0, match: ['Shopping'] },
        { label: 'Entertainment', emoji: '🎬', amount: 0, budget: 0, match: ['Entertainment'] },
        { label: 'Travel', emoji: '✈️', amount: 0, budget: 0, match: ['Travel'] },
        { label: 'Subscriptions', emoji: '📺', amount: 0, budget: 0, match: ['Subscriptions'] },
      ]
    },
    {
      label: 'Future-oriented', subtitle: 'GOALS', spent: 0, budget: 0,
      subcategories: [
        { label: 'Investment', emoji: '💰', amount: 0, budget: 0, match: ['Investment'] },
      ]
    },
    {
      label: 'Buffer', subtitle: 'FLEXIBILITY', spent: 0, budget: 0,
      subcategories: [
        { label: 'Others', emoji: '🔮', amount: 0, budget: 0, match: ['Others'] },
        { label: 'Uncategorised', emoji: '❓', amount: 0, budget: 0, match: ['Uncategorised'] },
      ]
    },
  ])

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Goals State
  const [goals, setGoals] = useState<any[]>([])
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')
  const [editingGoal, setEditingGoal] = useState<any>(null)
  const [addingMoneyGoal, setAddingMoneyGoal] = useState<any>(null)
  const [autoPayGoal, setAutoPayGoal] = useState<any>(null)
  const [addMoneyAmount, setAddMoneyAmount] = useState('')
  const [editGoalName, setEditGoalName] = useState('')
  const [editGoalTarget, setEditGoalTarget] = useState('')
  const [editGoalDeadline, setEditGoalDeadline] = useState('')
  const [autoPayAmount, setAutoPayAmount] = useState('')
  const [autoPayDate, setAutoPayDate] = useState('')

  const getGoalMood = (pct: number, deadline: string | null) => {
    if (!deadline) {
      if (pct < 15) return 'Every journey starts somewhere. You\'ve started.'
      if (pct < 40) return 'The foundation is being laid. Keep adding to it.'
      if (pct < 65) return 'Real momentum now. This goal is becoming real.'
      if (pct < 85) return 'You\'re in the home stretch. The end is visible.'
      return 'Almost there. One of those rare moments — stay with it.'
    }
    const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    const expectedPct = daysLeft < 0 ? 100 : Math.max(0, 100 - (daysLeft / 365) * 100)
    if (pct < expectedPct - 10) return 'A little behind the pace — but the goal is still yours.'
    if (pct > expectedPct + 10) return 'Ahead of schedule. You\'re moving faster than you planned.'
    if (pct < 15) return 'Every journey starts somewhere. You\'ve started.'
    if (pct < 40) return 'The foundation is being laid. Keep adding to it.'
    if (pct < 65) return 'Real momentum now. This goal is becoming real.'
    if (pct < 85) return 'You\'re in the home stretch. The end is visible.'
    return 'Almost there. One of those rare moments — stay with it.'
  }


  const loadData = async () => {
    setLoading(true)
    try {
      const data: any = await api.get('/api/v1/dashboard/budgets/insights')
      const goalsData: any = await api.get('/api/v1/dashboard/goals').catch(() => [])
      setGoals(goalsData)
      setInsights(data)
      
      const newCats = categoriesData.map(cat => ({
        ...cat,
        spent: 0,
        budget: 0,
        subcategories: cat.subcategories.map((sub: any) => ({
          ...sub,
          amount: 0,
          budget: 0
        }))
      }))
      
      // Map raw budgets to subcategories
      if (Array.isArray(data?.raw_budgets)) {
        data.raw_budgets.forEach((rb: any) => {
          if (!rb || !rb.category) return
          const limit = Number(rb.monthly_limit || 0)
          const [lbl] = String(rb.category).split('|')
          newCats.forEach(cat => {
            if (!cat.subcategories) return
            cat.subcategories.forEach((sub: any) => {
              if (sub && (sub.label === lbl || (Array.isArray(sub.match) && sub.match.includes(lbl)))) {
                sub.budget = limit
                cat.budget = (cat.budget || 0) + limit
              }
            })
          })
        })
      }
      
      // Map raw spend to subcategories
      if (Array.isArray(data?.raw_spend)) {
        data.raw_spend.forEach((rs: any) => {
          if (!rs) return
          const amt = Number(rs.amount || 0)
          const catName = rs.category || 'Uncategorised'
          let found = false
          newCats.forEach(cat => {
            if (!cat.subcategories) return
            cat.subcategories.forEach((sub: any) => {
              if (sub && Array.isArray(sub.match) && sub.match.includes(catName)) {
                sub.amount = (sub.amount || 0) + amt
                cat.spent = (cat.spent || 0) + amt
                found = true
              }
            })
          })
          if (!found && newCats[3] && Array.isArray(newCats[3].subcategories) && newCats[3].subcategories[1]) {
            newCats[3].subcategories[1].amount = (newCats[3].subcategories[1].amount || 0) + amt
            newCats[3].spent = (newCats[3].spent || 0) + amt
          }
        })
      }
      
      setCategoriesData(newCats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleBulkUpdate = async () => {
    if (!editSection) return
    
    const sectionData = categoriesData.find(c => c.label === editSection)
    if (!sectionData) return
    
    const updates = sectionData.subcategories.map((sub: any) => ({
      label: sub.label,
      emoji: sub.emoji,
      budget: editBudgets[sub.label] || 0
    }))
    
    try {
      await api.post('/api/v1/dashboard/budgets/bulk_update', {
        section: editSection,
        updates
      })
      setEditSection(null)
      loadData()
    } catch (err) {
      console.error("Failed to update budgets", err)
    }
  }

  const openBulkEditor = (section: any) => {
    const initialBudgets: any = {}
    section.subcategories.forEach((sub: any) => {
      initialBudgets[sub.label] = sub.budget
    })
    setEditBudgets(initialBudgets)
    setEditSection(section.label)
  }

  const fmt = (n: number | null | undefined) => {
    if (n == null || isNaN(n)) return '₹0';
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  if (loading) return (
    <div style={{ padding: 'var(--space-5)' }}>
      <SkeletonCard />
      <div style={{ height: 'var(--space-4)' }} />
      <SkeletonCard />
    </div>
  )

  if (!insights) return (
    <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
      <p style={{ marginBottom: '16px', fontSize: '15px' }}>Failed to load budget insights. Please try again.</p>
      <button 
        onClick={loadData}
        style={{
          padding: '10px 20px',
          backgroundColor: '#5A3825',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Retry
      </button>
    </div>
  )

  const h = insights.health
  const totalBudget = h.total_budget || 0
  const totalSpent = h.total_spend || 0
  const buffer = totalBudget - totalSpent

  const now = new Date()
  const currentDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthPct = (currentDay / daysInMonth) * 100
  const rawSpendPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const spendPct = totalBudget === 0 ? 0 : rawSpendPct
  
  const getPulseMood = () => {
    if (totalBudget === 0) return 'cruising'
    if (spendPct > 100) return 'stretched'
    if (spendPct > 85 && currentDay > 5) return 'tight'
    if (spendPct > 70) return 'mindful'
    if (spendPct < 20 && monthPct > 40) return 'underspent'
    if (spendPct >= 50 && spendPct <= 70 && monthPct >= 50) return 'on_track'
    return 'cruising'
  }

  const mood = getPulseMood()
  const pulseConfig: Record<string, {grad: string, bg: string, text: string, head: string}> = {
    stretched: { grad: 'linear-gradient(135deg, #4A1A1A, #2E1010)', bg: '#FF5252', text: 'A stretched month. It happens — reset is coming.', head: 'Slow down!' },
    tight: { grad: 'linear-gradient(135deg, #4A3A1A, #2E2210)', bg: '#FF9800', text: `₹${Math.max(0, buffer).toLocaleString('en-IN')} to work with. Small decisions matter now.`, head: 'The month is tightening up a little.' },
    mindful: { grad: 'linear-gradient(135deg, #3A4A1A, #222E10)', bg: '#CDDC39', text: 'Steady pace, but keep an eye on upcoming bills.', head: 'Mindful spending.' },
    underspent: { grad: 'linear-gradient(135deg, #1A4A3A, #102E22)', bg: '#4CAF50', text: 'Lots of room left! You are doing great.', head: 'Quiet month so far.' },
    on_track: { grad: 'linear-gradient(135deg, #1A4A2A, #102E1A)', bg: '#4CAF50', text: 'Your spending perfectly matches the calendar.', head: 'Right on track.' },
    cruising: { grad: '#5A3825', bg: '#8C5A3F', text: totalBudget === 0 ? 'Budgeting starts with a goal. Set a budget to start receiving AI-driven financial insights.' : `₹${Math.max(0, buffer).toLocaleString('en-IN')} remaining — you're well in control.`, head: 'Cruising smoothly this month.' }
  }
  const config = pulseConfig[mood]

  const pulseSvg = (moodStr: string) => {
    if (moodStr === 'stretched') return <svg className={styles.boatSvg} viewBox="0 0 100 100" fill="none"><path d="M50 20 L80 80 L20 80 Z" fill="#FF5252" opacity="0.8"/></svg>;
    if (moodStr === 'tight') return <svg className={styles.boatSvg} viewBox="0 0 100 100" fill="none"><rect x="30" y="30" width="40" height="40" fill="#FF9800" opacity="0.8" rx="5" /></svg>;
    if (moodStr === 'on_track' || moodStr === 'mindful') return <svg className={styles.boatSvg} viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="30" fill="#CDDC39" opacity="0.8" /></svg>;
    return (
      <svg className={styles.boatSvg} viewBox="0 0 100 100" fill="none">
        <path d="M20 70 L80 70 L70 85 L30 85 Z" fill="#4A6054" />
        <path d="M45 20 L45 70 L75 70 Z" fill="#D3DCD3" />
        <path d="M45 70 L45 30 L25 70 Z" fill="#A0C8A0" />
        <circle cx="85" cy="15" r="15" fill="#EAD086" opacity="0.8" />
      </svg>
    )
  }

  const overallPct = Math.min(Math.round(spendPct), 100)
  
  // Prepare Bubble Chart data based on used amounts
  const totalUsed = h.total_spend || 1;
  const bubbleData = insights.buckets.map((b: any) => ({
    name: b.name,
    val: b.used,
    pct: Math.round((b.used / totalUsed) * 100)
  })).sort((a: any, b: any) => b.pct - a.pct)

  const bubbleStyles = [
    { width: 100, background: '#DCE6E0', left: '10%', top: '20%' },
    { width: 75, background: '#F5E6E6', left: '45%', top: '10%' },
    { width: 85, background: '#E6EBF5', left: '55%', top: '45%' },
    { width: 60, background: '#F5F5F5', left: '20%', top: '65%' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        {tab === 'insights' && (
          <button onClick={() => setTab('dashboard')} style={{ position: 'absolute', left: 20, background: 'none', border: 'none', color: '#111', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className={styles.title}>{tab === 'dashboard' ? 'Budgets' : 'Insights'}</h1>
      </div>

      {tab === 'dashboard' ? (
        <>
          <div className={styles.px}>
            <div className={styles.pulseCard} style={{ background: config.grad }}>
              <div className={styles.pulseLabel}>Monthly Pulse 📈</div>
              <div className={styles.pulseHeadline}>{config.head}</div>
              <div className={styles.pulseSubtext}>{config.text}</div>
              
              {pulseSvg(mood)}

              <div className={styles.pulseMeta}>
                <div><span className={styles.pulseMetaLabel}>Spent</span><div className={styles.pulseMetaValue}>{fmt(totalSpent)}</div></div>
                <div style={{textAlign: 'right'}}><span className={styles.pulseMetaLabel}>Budget</span><div className={styles.pulseMetaValue}>{fmt(totalBudget)}</div></div>
              </div>

              <div className={styles.pulseBar}>
                <div className={styles.pulseBarFill} style={{ width: `${overallPct}%`, background: config.bg }} />
              </div>

              <div className={styles.pulseSafe}>
                <span>Safe to spend: {fmt(h.safe_daily)}</span>
                <span className={styles.pulseUsedPill} style={{background: 'rgba(255,255,255,0.1)'}}>{overallPct}% used</span>
              </div>
            </div>
            
            <div className={styles.summaryRow}>
              <div className={styles.summaryCol}>
                <div className={styles.summaryIconBox} style={{color: '#4CAF50', background: '#E8F5E9'}}><Wallet size={12} /></div>
                <div className={styles.summaryData}>
                  <span className={styles.summaryLabel}>Spent</span>
                  <span className={styles.summaryValue}>{fmt(totalSpent)}</span>
                </div>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryCol}>
                <div className={styles.summaryIconBox} style={{color: '#2196F3', background: '#E3F2FD'}}><Shield size={12} /></div>
                <div className={styles.summaryData}>
                  <span className={styles.summaryLabel}>Remaining</span>
                  <span className={styles.summaryValue}>{totalBudget > 0 ? fmt(buffer) : 'N/A'}</span>
                </div>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryCol}>
                <div className={styles.summaryIconBox} style={{color: '#FF9800', background: '#FFF3E0'}}><Percent size={12} /></div>
                <div className={styles.summaryData}>
                  <span className={styles.summaryLabel}>Used</span>
                  <span className={styles.summaryValue}>{overallPct}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.px}>
            <p className={styles.sectionTitle}>Your Budget</p>
            <div className={styles.categoryList}>
              {categoriesData.map((cat) => {
                const cPct = Math.min(Math.round((cat.spent / (cat.budget || 1)) * 100), 100)
                const isExpanded = expandedCategory === cat.label
                
                return (
                  <div key={cat.label} className={styles.categoryCard}>
                    <div className={styles.catHeader} onClick={() => setExpandedCategory(isExpanded ? null : cat.label)}>
                      <div className={styles.catLeft}>
                        <div className={styles.catIconBox} style={{ background: '#FFF3E0' }}>{cat.subcategories[0]?.emoji || '💰'}</div>
                        <div className={styles.catInfo}>
                          <span className={styles.catLabel}>{cat.label}</span>
                          <span className={styles.catSubtitle}>{cat.subtitle}</span>
                        </div>
                      </div>
                      <div className={styles.catRight}>
                        {cat.budget > 0 ? (
                          <div className={styles.catRightInfo}>
                            <span className={styles.catAmts}><b>{fmt(cat.spent)}</b> <span className={styles.catAmtsMuted}>/ {fmt(cat.budget)}</span></span>
                            <span className={styles.catPctPill} style={{ background: '#FFF3E0', color: '#E65100' }}>{cPct}%</span>
                          </div>
                        ) : (
                          <span className={styles.catNotSet}>Not Set</span>
                        )}
                        <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); openBulkEditor(cat); }}>
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                    {/* Progress Bar (Optional, can keep it very subtle) */}
                    {cat.budget > 0 && (
                      <div className={styles.catBar}>
                         <div className={styles.catBarFill} style={{ width: `${cPct}%`, background: '#FF9800' }} />
                      </div>
                    )}
                    
                    {isExpanded && (
                      <div className={styles.subGrid}>
                        {cat.subcategories.map((sub: any) => (
                          <div key={sub.label} className={styles.subItem}>
                            <div className={styles.subIcon}>{sub.emoji}</div>
                            <span className={styles.subLabel}>{sub.label}</span>
                            <span className={styles.subAmount}>{fmt(sub.amount)}</span>
                            <span className={styles.subBudget}>{sub.budget > 0 ? `/ ${fmt(sub.budget)}` : 'Budget Not Set'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Goals */}
            <div className={styles.px} style={{ marginBottom: '24px' }}>
              <div className={styles.sectionHeader}>
                <p className={styles.sectionTitle}>Your Goals</p>
                <button className={styles.addBtn} onClick={() => setIsAddingGoal(true)} aria-label="Add goal">
                  <Plus size={14} />
                  New Goal
                </button>
              </div>

              {goals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 24px', background: '#F9F6F0', borderRadius: '16px', border: '1px dashed #E0DCD3', margin: '16px 0' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
                  <p style={{ fontWeight: 'bold', fontSize: '14px', color: '#111', marginBottom: '6px' }}>What are you saving towards?</p>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>A trip, a gadget, a rainy day — give your money a direction.</p>
                  <button onClick={() => setIsAddingGoal(true)} style={{ padding: '10px 24px', background: '#111', color: 'white', border: 'none', borderRadius: '20px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                    + Set your first goal
                  </button>
                </div>
              )}

              {goals.map((goal: any, index: number) => {
                const currentAmt = goal.currentAmount ?? goal.current_amount ?? 0;
                const targetAmt = goal.targetAmount ?? goal.target_amount ?? 1;
                const pct = Math.min(Math.round((currentAmt / targetAmt) * 100), 100)
                let deadline = 'No date'
                try {
                  if (goal.deadline) {
                    deadline = new Date(goal.deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                  }
                } catch (e) {
                  console.error("Invalid date for goal:", goal)
                }
                return (
                  <div key={goal.id} className={styles.goalCard}>
                    <div className={styles.goalImageWrap}>
                      <div className={styles.goalImageBg} style={{ backgroundImage: `url(${GOAL_IMAGES[index % GOAL_IMAGES.length]})` }} />
                      <div className={styles.goalImageOverlay}>
                        <p className={styles.goalImageTitle}>{goal.name} is getting closer ✨</p>
                      </div>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this goal?')) {
                            try {
                              const rawId = String(goal.id).replace(/^g/, '')
                              await api.delete(`/api/v1/dashboard/goals/${rawId}`)
                              loadData()
                            } catch (err) {
                              console.error('Failed to delete goal', err)
                            }
                          }
                        }}
                        style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className={styles.goalDetails}>
                      <div className={styles.goalMeta}>
                        <p className={styles.goalStatus}>{getGoalMood(pct, goal.deadline || null)}</p>
                        <div className={styles.goalDeadlineWrap}>
                          <span className={styles.goalDeadlineLabel}>TARGET</span>
                          <span className={styles.goalDeadline}>{deadline}</span>
                        </div>
                      </div>

                      <div className={styles.goalName}>{goal.name}</div>

                      <div className={styles.goalProgress}>
                        <span className={styles.goalCurrent}>{fmt(currentAmt)}</span>
                        <span className={styles.goalSep}> /{fmt(targetAmt).replace('₹', '')}</span>
                        <span className={styles.goalPct}>{pct}%</span>
                      </div>

                      <div className={styles.goalTrack}>
                        <div className={styles.goalFill} style={{ width: `${pct}%` }} />
                      </div>

                      <div className={styles.goalContribCard}>
                        {goal.autoPayStatus === 'active' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div className={styles.goalContribIcon}>⚡</div>
                            <p className={styles.goalContribText}>
                              <strong>₹{(goal.autoPayAmount || 0).toLocaleString('en-IN')}/m</strong> auto-pay on the {goal.autoPayDate}th
                            </p>
                          </div>
                        ) : (
                          <p className={styles.goalContribText} style={{ marginBottom: '12px', color: '#888' }}>Set up auto-save to reach this goal on autopilot.</p>
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className={styles.goalActionBtn} onClick={() => setAddingMoneyGoal(goal)}>Add Money</button>
                          <button className={styles.goalActionBtn} onClick={() => {
                            setAutoPayGoal(goal)
                            setAutoPayAmount(goal.autoPayAmount ? String(goal.autoPayAmount) : '')
                            setAutoPayDate(goal.autoPayDate ? String(goal.autoPayDate) : '')
                          }}>Auto Pay</button>
                          <button className={styles.goalActionBtn} onClick={() => {
                            setEditingGoal(goal)
                            setEditGoalName(goal.name)
                            setEditGoalTarget(goal.targetAmount)
                            setEditGoalDeadline(goal.deadline || '')
                          }}>Edit</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className={styles.insightsBanner}
 style={{ backgroundColor: '#FFF9E6' }}>
              <div className={styles.bannerIcon}>🪴</div>
              <div className={styles.bannerContent}>
                <h3 className={styles.bannerTitle}>You're doing great! 🌟</h3>
                <p className={styles.bannerSubtext}>Keep going like this and you'll stay comfortably within budget.</p>
              </div>
              <button className={styles.bannerBtn} onClick={() => setTab('insights')}>View Insights</button>
            </div>
            <div style={{height: 40}}></div>
          </div>
        </>
      ) : (
        /* Insights Tab */
        <div className={styles.px}>
          <div className={styles.insightsContainer}>
            {/* Top Insight */}
            <div className={styles.newHealthCard}>
              <div className={styles.nhLabelRow}>
                <span className={styles.nhLabel}>BUDGET HEALTH</span>
                <span className={styles.nhPill}>ON TRACK</span>
              </div>
              <h3 className={styles.nhTitle}>You've used {overallPct}% of<br/>your budget.</h3>
              <p className={styles.nhSub}>{currentDay} days in, {fmt(Math.max(0, buffer))} still in your corner.</p>
              
              <div className={styles.nhDivider} />
              
              <div className={styles.nhDataRow}>
                <div className={styles.nhDataCol}>
                  <span className={styles.nhDataLabel}>Safe to spend / day</span>
                  <span className={styles.nhDataVal}>{fmt(h.safe_daily)}</span>
                </div>
                <div className={styles.nhDataCol}>
                  <span className={styles.nhDataLabel}>Days remaining</span>
                  <span className={styles.nhDataVal}>{h.days_remaining}</span>
                </div>
              </div>
            </div>

            {/* Budget Breakdown */}
            <div className={styles.whiteCard}>
              <div className={styles.wcHeaderRow}>
                <span className={styles.wcHeader}>BUCKET BREAKDOWN</span>
                <div className={styles.wcToggle}>
                  <div className={`${styles.wcToggleBtn} ${styles.active}`}>Bubbles</div>
                  <div className={styles.wcToggleBtn}>Gauges</div>
                </div>
              </div>
              <h4 className={styles.wcTitle}>Where your budget lives</h4>
              <p className={styles.wcSub}>Size = budget allocated. Shade = how much used.</p>
              
              <div className={styles.bubbleContainer}>
                <div className={`${styles.bubbleItem} ${styles.bYellow}`} style={{ width: 100, height: 100, left: '10%', top: '20%' }}>
                  <div className={styles.bubblePill}>2%</div>
                  <span className={styles.bubbleName}>Essentials</span>
                  <span className={styles.bubbleVal}>₹13.5k</span>
                </div>
                
                <div className={`${styles.bubbleItem} ${styles.bPurple}`} style={{ width: 85, height: 85, left: '50%', top: '0%' }}>
                  <div className={styles.bubblePill}>13%</div>
                  <span className={styles.bubbleName}>Lifestyle</span>
                  <span className={styles.bubbleVal}>₹3.05k</span>
                </div>
                
                <div className={`${styles.bubbleItem} ${styles.bGreen}`} style={{ width: 90, height: 90, left: '35%', top: '55%' }}>
                  <div className={styles.bubblePill}>0%</div>
                  <span className={styles.bubbleName}>Future-oriented</span>
                  <span className={styles.bubbleVal}>₹0k</span>
                </div>
                
                <div className={`${styles.bubbleItem} ${styles.bPink}`} style={{ width: 70, height: 70, left: '70%', top: '50%' }}>
                  <div className={styles.bubblePill}>0%</div>
                  <span className={styles.bubbleName}>Buffer</span>
                  <span className={styles.bubbleVal}>₹0.2k</span>
                </div>
              </div>
            </div>

            {/* Pace Tracker */}
            <div className={styles.whiteCard}>
              <div className={styles.wcHeader}>PACE TRACKER</div>
              <h4 className={styles.wcTitle}>Are you spending too fast?</h4>
              <p className={styles.wcSub}>Your actual spend vs. ideal pace for the month.</p>
              
              <div style={{ width: '100%', height: 220, marginTop: 32, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={insights.pace} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="transparent" />
                    <XAxis dataKey="day" axisLine={true} tickLine={true} tick={{fontSize: 10, fill: '#999'}} stroke="#CCC" />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip cursor={false} contentStyle={{borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                    <Line type="monotone" dataKey="ideal" stroke="#A89B8D" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="actual" stroke="#5E4029" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                
                {/* Tooltip Overlay Mock */}
                <div className={styles.paceTooltip} style={{ left: '20%', bottom: '25%' }}>
                  <span className={styles.paceTtVal}>₹645 spent</span>
                  <span className={styles.paceTtStat}>↓ below pace</span>
                </div>
              </div>
            </div>

            {/* Trends */}
            <div className={styles.whiteCard}>
              <div className={styles.wcHeader}>TREND</div>
              <h4 className={styles.wcTitle}>This month vs. last</h4>
              
              <div className={styles.dumbbellList}>
                {categoriesData.map((cat, i) => {
                  const d = insights.trends.find((t:any) => t.section === cat.label) || { diff_pct: 0 }
                  const isLess = d.diff_pct <= 0
                  
                  // Mock positions for dumbbell
                  const pos1 = i === 0 ? '10%' : i === 1 ? '15%' : i === 2 ? '50%' : '10%';
                  const pos2 = i === 0 ? '40%' : i === 1 ? '30%' : i === 2 ? '50%' : '80%';
                  
                  return (
                    <div key={cat.label} className={styles.dumbbellRow}>
                      <span className={styles.dbLabel}>{cat.label}</span>
                      <div className={styles.dbTrackContainer}>
                        <div className={styles.dbTrack}>
                           <div className={styles.dbLine} style={{ left: pos1, right: `calc(100% - ${pos2})` }} />
                           <div className={styles.dbDot} style={{ left: pos1, background: '#4A3A2A' }}>
                              {i === 0 && <span className={styles.dbMonthLabel}>Aug</span>}
                           </div>
                           {pos1 !== pos2 && (
                             <div className={styles.dbDot} style={{ left: pos2, background: '#A89B8D' }}>
                                {i === 0 && <span className={styles.dbMonthLabel}>Jul</span>}
                                {i === 3 && <span className={styles.dbMonthLabel}>Jul</span>}
                             </div>
                           )}
                        </div>
                      </div>
                      <span className={`${styles.dbStat} ${isLess ? styles.dbLess : styles.dbMore}`}>
                        {isLess ? '↓' : '↑'} {Math.abs(d.diff_pct)}% {isLess ? (d.diff_pct === 0 ? 'change' : 'less') : 'more'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div style={{height: 24}}></div>
          </div>
        </div>
      )}

      {/* Bulk Editor Modal */}
      {editSection && (
        <div className={styles.overlay} onClick={() => setEditSection(null)}>
          <div className={styles.modalCentered} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeaderCentered}>
              <h2>Edit {editSection} Budget</h2>
            </div>
            <div className={styles.editListCentered}>
              {Object.keys(editBudgets).map(subLabel => {
                const subItem = categoriesData.find(c => c.label === editSection)?.subcategories.find((s: any) => s.label === subLabel)
                return (
                  <div key={subLabel} className={styles.editRowCentered}>
                    <div className={styles.editIconCentered}>
                      <span className={styles.editEmoji}>{subItem?.emoji}</span>
                      <span className={styles.editLabelCentered}>{subLabel}</span>
                    </div>
                    <input 
                      type="number" 
                      className={styles.editInputCentered}
                      value={editBudgets[subLabel] || ''}
                      onChange={(e) => setEditBudgets({...editBudgets, [subLabel]: Number(e.target.value)})}
                      placeholder="₹0"
                    />
                  </div>
                )
              })}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEditSection(null)}>Cancel</button>
              <button className={styles.saveBtnCentered} onClick={handleBulkUpdate}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Goals Modals */}
      {isAddingGoal && (
        <div className={styles.overlay} onClick={() => setIsAddingGoal(false)}>
          <div className={styles.modalCentered} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeaderCentered}><h2>Add New Goal</h2></div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px'}}>
              <input type="text" className={styles.editInputCentered} style={{width: '100%'}} value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="Goal Name (e.g. New Laptop)" />
              <input type="number" className={styles.editInputCentered} style={{width: '100%'}} value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="Target Amount" />
              <input type="date" className={styles.editInputCentered} style={{width: '100%'}} value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setIsAddingGoal(false)}>Cancel</button>
              <button className={styles.saveBtnCentered} onClick={async () => {
                try {
                  await api.post('/api/v1/dashboard/goals', {
                    name: goalName,
                    target_amount: parseFloat(goalTarget),
                    deadline: goalDeadline || null,
                  })
                  setIsAddingGoal(false)
                  setGoalName(''); setGoalTarget(''); setGoalDeadline('')
                  loadData()
                } catch { alert('Failed to save goal') }
              }}>Save Goal</button>
            </div>
          </div>
        </div>
      )}

      {addingMoneyGoal && (
        <div className={styles.overlay} onClick={() => setAddingMoneyGoal(null)}>
          <div className={styles.modalCentered} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeaderCentered}><h2>Add Money to {addingMoneyGoal.name}</h2></div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px'}}>
              <input type="number" className={styles.editInputCentered} style={{width: '100%'}} value={addMoneyAmount} onChange={e => setAddMoneyAmount(e.target.value)} placeholder="Amount (₹)" />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setAddingMoneyGoal(null)}>Cancel</button>
              <button className={styles.saveBtnCentered} onClick={async () => {
                try {
                  const rawId = String(addingMoneyGoal.id).replace(/^g/, '')
                  await api.post(`/api/v1/dashboard/goals/${rawId}/add_money`, { amount: parseFloat(addMoneyAmount) })
                  setAddingMoneyGoal(null)
                  setAddMoneyAmount('')
                  loadData()
                } catch (err: any) { alert('Failed to add money') }
              }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {editingGoal && (
        <div className={styles.overlay} onClick={() => setEditingGoal(null)}>
          <div className={styles.modalCentered} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeaderCentered}><h2>Edit Goal</h2></div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px'}}>
              <input type="text" className={styles.editInputCentered} style={{width: '100%'}} value={editGoalName} onChange={e => setEditGoalName(e.target.value)} placeholder="Goal Name" />
              <input type="number" className={styles.editInputCentered} style={{width: '100%'}} value={editGoalTarget} onChange={e => setEditGoalTarget(e.target.value)} placeholder="Target Amount" />
              <input type="date" className={styles.editInputCentered} style={{width: '100%'}} value={editGoalDeadline} onChange={e => setEditGoalDeadline(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEditingGoal(null)}>Cancel</button>
              <button className={styles.saveBtnCentered} onClick={async () => {
                try {
                  const rawId = String(editingGoal.id).replace(/^g/, '')
                  await api.put(`/api/v1/dashboard/goals/${rawId}`, {
                    name: editGoalName,
                    target_amount: parseFloat(editGoalTarget),
                    deadline: editGoalDeadline || null,
                  })
                  setEditingGoal(null)
                  loadData()
                } catch { alert('Failed to edit goal') }
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {autoPayGoal && (
        <div className={styles.overlay} onClick={() => setAutoPayGoal(null)}>
          <div className={styles.modalCentered} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeaderCentered}><h2>Auto Pay Settings</h2></div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px'}}>
              <input type="number" className={styles.editInputCentered} style={{width: '100%'}} value={autoPayAmount} onChange={e => setAutoPayAmount(e.target.value)} placeholder="Amount (₹)" />
              <input type="number" min="1" max="31" className={styles.editInputCentered} style={{width: '100%'}} value={autoPayDate} onChange={e => setAutoPayDate(e.target.value)} placeholder="Day of month (1-31)" />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={async () => {
                try {
                  const rawId = String(autoPayGoal.id).replace(/^g/, '')
                  await api.put(`/api/v1/dashboard/goals/${rawId}/auto_pay`, {
                    auto_pay_amount: parseFloat(autoPayAmount) || 0,
                    auto_pay_date: parseInt(autoPayDate) || 1,
                    auto_pay_status: 'inactive'
                  })
                  setAutoPayGoal(null)
                  loadData()
                } catch { alert('Failed to remove auto pay') }
              }} style={{color: '#E53935'}}>Remove</button>
              <button className={styles.saveBtnCentered} onClick={async () => {
                try {
                  const rawId = String(autoPayGoal.id).replace(/^g/, '')
                  await api.put(`/api/v1/dashboard/goals/${rawId}/auto_pay`, {
                    auto_pay_amount: parseFloat(autoPayAmount) || 0,
                    auto_pay_date: parseInt(autoPayDate) || 1,
                    auto_pay_status: 'active'
                  })
                  setAutoPayGoal(null)
                  loadData()
                } catch { alert('Failed to update auto pay') }
              }}>Save Auto Pay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
