import React, { useEffect, useState } from 'react'
import { Fingerprint, Lock, ShieldCheck } from 'lucide-react'
import { useBiometric } from '../../hooks/useBiometric'
import Button from './Button'

interface Props {
  onUnlock: () => void
  onFallback: () => void
}

export default function BiometricLockScreen({ onUnlock, onFallback }: Props) {
  const { authenticate } = useBiometric()
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    setLoading(true)
    setError(false)
    const success = await authenticate()
    setLoading(false)
    if (success) {
      onUnlock()
    } else {
      setError(true)
    }
  }

  // Auto-prompt on mount
  useEffect(() => {
    handleAuth()
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'var(--bg-base)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center'
    }}>
      <div style={{
        width: 80, height: 80,
        borderRadius: 40,
        backgroundColor: 'var(--color-primary-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
        color: 'var(--color-primary)'
      }}>
        {error ? <Lock size={40} /> : <ShieldCheck size={40} />}
      </div>

      <h1 style={{ 
        fontFamily: 'var(--font-headline)', 
        fontSize: '24px',
        marginBottom: 8,
        color: 'var(--text-primary)'
      }}>
        Dekho is Locked
      </h1>
      
      <p style={{
        fontFamily: 'var(--font-body)',
        fontSize: '15px',
        color: 'var(--text-secondary)',
        marginBottom: 40,
        maxWidth: 280
      }}>
        {error ? "Authentication failed. Try again or use your password." : "Verify your identity to view your finances."}
      </p>

      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Button 
          variant="primary" 
          onClick={handleAuth} 
          loading={loading}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <Fingerprint size={20} />
            Unlock with Biometrics
          </div>
        </Button>
        
        <Button 
          variant="secondary" 
          onClick={onFallback}
        >
          Use Password
        </Button>
      </div>
    </div>
  )
}
