import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bug, Lightbulb, MessageSquare, Phone, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import api from '../lib/api'
import styles from './FeedbackSupport.module.css'
import subStyles from './SubPage.module.css'

type FeedbackType = 'bug' | 'feature' | 'general' | 'support'

const OPTIONS: { type: FeedbackType, icon: ReactNode, emoji: string, title: string, desc: string, placeholder: string }[] = [
  {
    type: 'bug',
    icon: <Bug size={22} />,
    emoji: '🐛',
    title: 'Report a Bug',
    desc: 'Allow users to report problems.',
    placeholder: 'What went wrong? Steps to reproduce help a lot.',
  },
  {
    type: 'feature',
    icon: <Lightbulb size={22} />,
    emoji: '💡',
    title: 'Suggest a Feature',
    desc: "Let users tell you what they'd like to see.",
    placeholder: 'What would make Dekho better for you?',
  },
  {
    type: 'general',
    icon: <MessageSquare size={22} />,
    emoji: '❤️',
    title: 'General Feedback',
    desc: "For comments that aren't bugs.",
    placeholder: 'Share your thoughts...',
  },
  {
    type: 'support',
    icon: <Phone size={22} />,
    emoji: '📞',
    title: 'Contact Support',
    desc: 'Simple form for assistance.',
    placeholder: 'How can we help?',
  },
]

export default function FeedbackSupport() {
  const navigate = useNavigate()
  const [active, setActive] = useState<FeedbackType | null>(null)
  const [message, setMessage] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const activeOption = OPTIONS.find(o => o.type === active)

  const closeSheet = () => {
    setActive(null)
    setMessage('')
    setContactEmail('')
  }

  const handleSubmit = async () => {
    if (!active || !message.trim()) return
    setSubmitting(true)
    try {
      await api.post('/api/v1/support', {
        type: active,
        message: message.trim(),
        contact_email: contactEmail.trim() || undefined,
      })
      toast.success("Thanks — we've got it!")
      closeSheet()
    } catch (err) {
      console.error('Failed to submit feedback:', err)
      toast.error('Could not send that. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={subStyles.page}>
      <div className={subStyles.header}>
        <button className={subStyles.backBtn} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <p className={subStyles.headerTitle}>Feedback & Support</p>
        <div style={{ width: 36 }} />
      </div>

      <div className={subStyles.px}>
        <p className={styles.intro}>
          We'd love to hear your thoughts! Select an option below to let us know how we can improve.
        </p>

        <div className={styles.list}>
          {OPTIONS.map(opt => (
            <button key={opt.type} className={styles.card} onClick={() => setActive(opt.type)}>
              <div className={styles.iconBox}>{opt.icon}</div>
              <div className={styles.cardBody}>
                <p className={styles.cardTitle}>{opt.title} <span>{opt.emoji}</span></p>
                <p className={styles.cardDesc}>{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeOption && (
          <motion.div
            className={styles.sheetOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSheet}
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
                <h3 className={styles.sheetTitle}>{activeOption.emoji} {activeOption.title}</h3>
                <button className={styles.sheetClose} onClick={closeSheet}>
                  <X size={20} />
                </button>
              </div>

              <textarea
                className={styles.textarea}
                placeholder={activeOption.placeholder}
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={1000}
                autoFocus
              />
              <span className={styles.charCount}>{message.length}/1000</span>

              <input
                type="email"
                className={styles.emailInput}
                placeholder="Your email (optional, for follow-up)"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
              />

              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={!message.trim() || submitting}
              >
                {submitting ? 'Sending...' : 'Send'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
