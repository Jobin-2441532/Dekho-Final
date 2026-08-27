import React, { useState, useEffect } from 'react'
import { X, Check, Calculator, ChevronDown, Calendar, Clock, Tag, Wallet, FileText, Delete } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { toast } from 'react-hot-toast'
import styles from './AddExpense.module.css'

const INCOME_CATEGORIES = [
  { label: 'Salary', emoji: '💼' },
  { label: 'Freelance', emoji: '💻' },
  { label: 'Business', emoji: '🏢' },
  { label: 'Interest', emoji: '🏦' },
  { label: 'Refund', emoji: '↩️' },
  { label: 'Gift', emoji: '🎁' },
  { label: 'Other Income', emoji: '💰' },
]

export default function AddExpense() {
  const navigate = useNavigate()
  const [txType, setTxType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('0')
  const [account, setAccount] = useState('Select Account')
  const [category, setCategory] = useState('Select Category')
  
  // Initialize date to today, time to current time
  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [time, setTime] = useState(() => {
    const now = new Date()
    return now.toTimeString().substring(0, 5)
  })

  const [notes, setNotes] = useState('')

  // Bottom Sheet States
  const [activeSheet, setActiveSheet] = useState<'account' | 'category' | null>(null)

  // Custom Category States
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategorySection, setNewCategorySection] = useState('Essentials')

  // Numpad input handler
  const handleNumPress = (val: string) => {
    if (val === 'DEL') {
      setAmount(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'))
      return
    }
    
    // Prevent multiple decimals
    if (val === '.' && amount.includes('.')) return
    
    // If it's 0 and user types a number, replace 0
    if (amount === '0' && val !== '.') {
      setAmount(val)
    } else {
      setAmount(prev => prev + val)
    }
  }

  const isIncome = txType === 'income'
  const defaultCategory = isIncome ? 'Other Income' : 'Others'

  const handleSave = async () => {
    if (amount === '0' || amount === '') return

    const savePromise = api.post('/api/v1/dashboard/transactions', {
      amount: parseFloat(amount),
      merchant: notes || category, // fallback to category if no notes
      category: category === 'Select Category' ? defaultCategory : category,
      date: date, // Ideally should combine date and time for backend if supported
      notes: notes,
      direction: isIncome ? 'credit' : 'debit',
      payment_mode: account === 'Select Account' ? 'Cash' : account,
      source_type: 'Manual'
    })

    try {
      await toast.promise(savePromise, {
        loading: isIncome ? 'Adding income...' : 'Adding expense...',
        success: isIncome ? 'Income added!' : 'Expense added!',
        error: isIncome ? 'Failed to add income' : 'Failed to add expense'
      })
      navigate(-1) // go back
    } catch (err) {
      console.error('Failed to save transaction:', err)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.iconBtn} onClick={() => navigate(-1)}>
          <X size={24} />
        </button>
        <h2 className={styles.title}>{isIncome ? 'Add Income' : 'Add Expense'}</h2>
        <button className={styles.iconBtn} onClick={handleSave}>
          <Check size={24} />
        </button>
      </header>

      <div className={styles.content}>
        {/* Expense / Income toggle */}
        <div className={styles.typeToggle}>
          <button
            type="button"
            className={!isIncome ? styles.typeToggleBtnActive : styles.typeToggleBtn}
            onClick={() => { setTxType('expense'); setCategory('Select Category') }}
          >
            Expense
          </button>
          <button
            type="button"
            className={isIncome ? styles.typeToggleBtnActiveIncome : styles.typeToggleBtn}
            onClick={() => { setTxType('income'); setCategory('Select Category') }}
          >
            Income
          </button>
        </div>

        {/* Amount */}
        <div className={styles.amountContainer}>
          <span className={styles.amountLabel}>AMOUNT</span>
          <div className={styles.amountValueRow}>
            <span className={styles.amountValue} style={isIncome ? { color: 'var(--color-positive)' } : undefined}>₹{amount}</span>
            <div className={styles.calcIcon}>
              <Calculator size={18} />
            </div>
          </div>
        </div>

        {/* Account & Category OR Custom Category Form */}
        {showCustomCategory ? (
          <div className={styles.customCategoryContainer}>
            <div className={styles.customCatHeader}>New Custom Category</div>
            <input 
              type="text" 
              className={styles.customCatInput} 
              placeholder="Category Name" 
              value={newCategoryName} 
              onChange={e => setNewCategoryName(e.target.value)} 
            />
            
            <div className={styles.customCatSectionLabel}>Select Section</div>
            <div className={styles.customCatPills}>
              {['Essentials', 'Lifestyle', 'Future-oriented', 'Buffer'].map(sec => (
                <button 
                  key={sec} 
                  className={newCategorySection === sec ? styles.customCatPillActive : styles.customCatPill} 
                  onClick={() => setNewCategorySection(sec)}
                >
                  {sec}
                </button>
              ))}
            </div>

            <div className={styles.customCatActions}>
              <button className={styles.customCatCancel} onClick={() => setShowCustomCategory(false)}>Cancel</button>
              <button className={styles.customCatAdd} onClick={() => {
                if (newCategoryName.trim()) {
                  setCategory(newCategoryName.trim())
                  setShowCustomCategory(false)
                }
              }}>Add</button>
            </div>
          </div>
        ) : (
          <div className={styles.formRow}>
            <button className={styles.selectBox} onClick={() => setActiveSheet('account')}>
              <div className={styles.selectIcon}><Wallet size={16} /></div>
              <div className={styles.selectContent}>
                <span className={styles.selectLabel}>Account</span>
                <span className={styles.selectValue}>
                  {account} <ChevronDown size={14} color="#8c827a" />
                </span>
              </div>
            </button>
            <button className={styles.selectBox} onClick={() => setActiveSheet('category')}>
              <div className={styles.selectIcon}><Tag size={16} /></div>
              <div className={styles.selectContent}>
                <span className={styles.selectLabel}>Category</span>
                <span className={styles.selectValue}>
                  {category} <ChevronDown size={14} color="#8c827a" />
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Date & Time */}
        <div className={styles.formRow}>
          <div className={styles.dateTimeBox}>
            <Calendar size={16} color="#8c827a" />
            <div className={styles.selectContent}>
              <span className={styles.selectLabel}>Date</span>
              <span className={styles.selectValue}>
                {date.split('-').reverse().join('/')} <ChevronDown size={14} color="#8c827a" />
              </span>
            </div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className={styles.divider} />
          <div className={styles.dateTimeBox}>
            <Clock size={16} color="#8c827a" />
            <div className={styles.selectContent}>
              <span className={styles.selectLabel}>Time</span>
              <span className={styles.selectValue}>
                {time} <ChevronDown size={14} color="#8c827a" />
              </span>
            </div>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        {/* Quick Add Categories */}
        <div className={styles.quickCategoriesRow}>
          {(isIncome ? INCOME_CATEGORIES.slice(0, 4) : [
            { label: 'Food & Dining', emoji: '🍽️' },
            { label: 'Transport', emoji: '🚗' },
            { label: 'Shopping', emoji: '🛍️' },
            { label: 'Bills', emoji: '🧾' },
          ]).map((qc) => (
            <button
              key={qc.label}
              type="button"
              className={`${styles.quickCategoryBtn} ${category === qc.label ? styles.quickCategoryActive : ''}`}
              onClick={() => setCategory(qc.label)}
            >
              <span className={styles.quickCategoryEmoji}>{qc.emoji}</span>
              <span className={styles.quickCategoryLabel}>{qc.label}</span>
            </button>
          ))}
        </div>

        {/* Notes */}
        <div className={styles.notesContainer}>
          <div className={styles.notesHeader}>
            <FileText size={14} /> Notes (optional)
          </div>
          <textarea 
            className={styles.notesInput} 
            placeholder="Add notes..." 
            maxLength={250}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <span className={styles.charCount}>{notes.length}/250</span>
        </div>
      </div>

      {/* Numpad (Fixed at bottom) */}
      <div className={styles.numpadContainer}>
        {['7', '8', '9', '+', '4', '5', '6', '-', '1', '2', '3', 'X', '0', '.', 'DEL', '='].map((key, i) => (
          <button 
            key={i} 
            className={`${styles.numBtn} ${key === '=' ? styles.brownBtn : ''}`}
            onClick={() => {
              if (key === '=') handleSave()
              else if (key === '+' || key === '-' || key === 'X') {
                // For now ignore basic math operations, just aesthetic or basic implementation
              } else {
                handleNumPress(key)
              }
            }}
          >
            {key === 'DEL' ? <Delete size={20} /> : key}
          </button>
        ))}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div 
            className={styles.sheetOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveSheet(null)}
          >
            <motion.div 
              className={styles.sheetContent}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.sheetHeader}>
                <h3 className={styles.sheetTitle}>
                  {activeSheet === 'account' ? 'Select Account' : 'Select Category'}
                </h3>
                <button className={styles.sheetClose} onClick={() => setActiveSheet(null)}>
                  <X size={20} />
                </button>
              </div>

              {activeSheet === 'account' && (
                <div className={styles.sheetList}>
                  {['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Net Banking'].map(acc => (
                    <button key={acc} className={styles.sheetItem} onClick={() => { setAccount(acc); setActiveSheet(null); }}>
                      {acc}
                    </button>
                  ))}
                </div>
              )}

              {activeSheet === 'category' && isIncome && (
                <div className={styles.sheetList}>
                  <div className={styles.sheetSubhead}>INCOME</div>
                  {INCOME_CATEGORIES.map(ic => (
                    <button key={ic.label} className={styles.sheetItem} onClick={() => { setCategory(ic.label); setActiveSheet(null); }}>
                      {ic.emoji} {ic.label}
                    </button>
                  ))}
                  <button className={styles.addCustomCategoryBtn} onClick={() => { setShowCustomCategory(true); setActiveSheet(null); }}>
                    + Add Custom Category...
                  </button>
                </div>
              )}

              {activeSheet === 'category' && !isIncome && (
                <div className={styles.sheetList}>
                  <div className={styles.sheetSubhead}>ESSENTIALS</div>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Transport'); setActiveSheet(null); }}>
                    🚗 Transport
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Health'); setActiveSheet(null); }}>
                    💊 Health
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Personal Care'); setActiveSheet(null); }}>
                    🧴 Personal Care
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Insurance'); setActiveSheet(null); }}>
                    🛡️ Insurance
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Loan EMI'); setActiveSheet(null); }}>
                    🏦 Loan EMI
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Credit Card'); setActiveSheet(null); }}>
                    💳 Credit Card
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Housing & Household'); setActiveSheet(null); }}>
                    🏠 Housing & Household
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Utilities'); setActiveSheet(null); }}>
                    ⚡ Utilities
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Food & Dining'); setActiveSheet(null); }}>
                    🍽️ Food & Dining
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Groceries'); setActiveSheet(null); }}>
                    🛒 Groceries
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Bills'); setActiveSheet(null); }}>
                    🧾 Bills
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Mess fees'); setActiveSheet(null); }}>
                    📌 Mess fees
                  </button>

                  <div className={styles.sheetSubhead}>LIFESTYLE</div>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Shopping'); setActiveSheet(null); }}>
                    🛍️ Shopping
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Entertainment'); setActiveSheet(null); }}>
                    🎬 Entertainment
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Travel'); setActiveSheet(null); }}>
                    ✈️ Travel
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Subscriptions'); setActiveSheet(null); }}>
                    📺 Subscriptions
                  </button>

                  <div className={styles.sheetSubhead}>FUTURE-ORIENTED</div>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Investment'); setActiveSheet(null); }}>
                    💰 Investment
                  </button>

                  <div className={styles.sheetSubhead}>BUFFER</div>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Others'); setActiveSheet(null); }}>
                    🔮 Others
                  </button>
                  <button className={styles.sheetItem} onClick={() => { setCategory('Uncategorised'); setActiveSheet(null); }}>
                    ❓ Uncategorised
                  </button>
                  
                  <button className={styles.addCustomCategoryBtn} onClick={() => { setShowCustomCategory(true); setActiveSheet(null); }}>
                    + Add Custom Category...
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
