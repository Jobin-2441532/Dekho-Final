import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Moon, Sun, ChevronRight, User, LogOut, Fingerprint, Bell, MessageCircleQuestion, Send } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useTheme } from '../hooks/useTheme'
import { useBiometric } from '../hooks/useBiometric'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useState, useEffect } from 'react'
import api from '../lib/api'
import styles from './Settings.module.css'

export default function Settings() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { isSupported, isRegistered, register } = useBiometric()
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTest: sendTestPush,
  } = usePushNotifications()
  const [profile, setProfile] = useState<{ name: string, email: string }>({ name: 'User', email: '' })

  const handleTogglePush = async (checked: boolean) => {
    if (checked) {
      const { ok, error, reason } = await subscribePush()
      if (ok) {
        toast.success('Notifications enabled')
      } else if (reason === 'denied' || reason === 'unsupported') {
        // Not an app failure — nothing in-page can fix this, so avoid the alarming red error style.
        toast(error || 'Notifications are blocked for this site.', { icon: '🔒' })
      } else {
        toast.error(error || 'Could not enable notifications')
      }
    } else {
      await unsubscribePush()
      toast.success('Notifications disabled')
    }
  }

  const handleSendTest = async () => {
    const ok = await sendTestPush()
    toast[ok ? 'success' : 'error'](ok ? 'Test notification sent — check your device' : 'Could not send test notification')
  }

  const handleRegisterLock = async () => {
    const success = await register(profile.email || profile.name)
    if (success) {
      toast.success('App Lock enabled')
    } else {
      toast.error('Could not enable App Lock. Please try again.')
    }
  }

  useEffect(() => {
    api.get<any>('/api/v1/dashboard/profile')
      .then(res => {
        if (res) {
          setProfile({
            name: res.fullName || res.name || 'User',
            email: res.email || ''
          })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <p className={styles.headerTitle}>Settings</p>
        <div style={{ width: 36 }} />
      </div>

      <div className={styles.px}>
        <div className={styles.profileSection}>
          <div className={styles.avatar}>
            <User size={32} />
          </div>
          <div>
            <h2 className={styles.userName}>{profile.name}</h2>
            <p className={styles.userPhone}>{profile.email || '+91 98765 43210'}</p>
          </div>
        </div>
      </div>

      <div className={styles.px}>
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Preferences</p>
          <div className={styles.card}>
            <div className={styles.row}>
              <div className={styles.rowLeft}>
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                <span>Dark Mode</span>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Security</p>
          <div className={styles.card}>
            {isSupported ? (
              isRegistered ? (
                <div className={styles.row} style={{ opacity: 0.8 }}>
                  <div className={styles.rowLeft}>
                    <Fingerprint size={20} color="var(--color-positive)" />
                    <span>App Lock Enabled</span>
                  </div>
                </div>
              ) : (
                <button className={styles.rowBtn} onClick={handleRegisterLock}>
                  <div className={styles.rowLeft}>
                    <Fingerprint size={20} />
                    <span>Enable App Lock</span>
                  </div>
                  <ChevronRight size={20} className={styles.chevron} />
                </button>
              )
            ) : (
              <div className={styles.row} style={{ opacity: 0.5 }}>
                <div className={styles.rowLeft}>
                  <Fingerprint size={20} />
                  <span>App Lock (Not Supported)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Notifications</p>
          <div className={styles.card}>
            {pushSupported ? (
              <>
                <div className={styles.row}>
                  <div className={styles.rowLeft}>
                    <Bell size={20} />
                    <span>Push Notifications</span>
                  </div>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={pushSubscribed} onChange={(e) => handleTogglePush(e.target.checked)} />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                {pushSubscribed && (
                  <button className={styles.rowBtn} onClick={handleSendTest}>
                    <div className={styles.rowLeft}>
                      <Send size={20} />
                      <span>Send Test Notification</span>
                    </div>
                  </button>
                )}
              </>
            ) : (
              <div className={styles.row} style={{ opacity: 0.5 }}>
                <div className={styles.rowLeft}>
                  <Bell size={20} />
                  <span>Notifications (Not Supported)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Highlights</p>
          <div className={styles.card}>
            <button className={styles.rowBtn} onClick={() => navigate('/monthly-wrap')}>
              <div className={styles.rowLeft}>
                <span>Monthly Wrap</span>
              </div>
              <ChevronRight size={20} className={styles.chevron} />
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Support</p>
          <div className={styles.card}>
            <button className={styles.rowBtn} onClick={() => navigate('/feedback')}>
              <div className={styles.rowLeft}>
                <MessageCircleQuestion size={20} />
                <span>Feedback &amp; Support</span>
              </div>
              <ChevronRight size={20} className={styles.chevron} />
            </button>
          </div>
        </div>

        <div className={styles.section} style={{ marginTop: 'var(--space-6)' }}>
          <div className={styles.card}>
            <button className={styles.rowBtn} onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              navigate('/login');
            }} style={{ color: 'var(--color-negative)' }}>
              <div className={styles.rowLeft}>
                <LogOut size={20} />
                <span>Sign Out</span>
              </div>
            </button>
          </div>
        </div>

        <div className={styles.versionInfo}>
          <p>Dekho v1.0.0</p>
        </div>
      </div>
    </div>
  )
}
