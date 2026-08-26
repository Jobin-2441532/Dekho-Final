import { useState, useEffect } from 'react'

/**
 * A simple hook for handling WebAuthn (Passkeys / Biometrics)
 * Uses standard navigator.credentials API.
 */
export function useBiometric() {
  const [isSupported, setIsSupported] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    // Check if WebAuthn is available in this browser/device
    if (window.PublicKeyCredential) {
      setIsSupported(true)
    }
    // Check if we've already registered a credential ID on this device
    const storedCred = localStorage.getItem('dekho_biometric_id')
    if (storedCred) {
      setIsRegistered(true)
    }
  }, [])

  /**
   * Registers a new device credential (fingerprint/face).
   */
  const register = async (username: string) => {
    if (!isSupported) throw new Error('Biometrics not supported on this device')

    // Developer bypass for localhost HTTP where WebAuthn might block
    if (window.location.hostname === 'localhost' && window.location.protocol === 'http:') {
      console.log('Bypassing biometric registration on local dev')
      localStorage.setItem('dekho_biometric_id', 'dummy-local-id')
      setIsRegistered(true)
      return true
    }

    try {
      // In a real app, challenge & user.id should come from the server.
      // Since our biometrics just gate the UI locally, we can use dummy values.
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const userId = new Uint8Array(16)
      crypto.getRandomValues(userId)

      const createOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Dekho Finance',
        },
        user: {
          id: userId,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Enforce device-bound (fingerprint/face)
          userVerification: 'required',
        },
        timeout: 60000,
      }

      const credential = await navigator.credentials.create({
        publicKey: createOptions
      }) as PublicKeyCredential

      if (credential) {
        localStorage.setItem('dekho_biometric_id', credential.id)
        setIsRegistered(true)
        return true
      }
      return false
    } catch (err) {
      console.error('Biometric registration failed:', err)
      return false
    }
  }

  /**
   * Prompts the user to authenticate with their registered biometric credential.
   */
  const authenticate = async () => {
    // Check readiness directly rather than relying on isSupported/isRegistered state,
    // which may not have settled yet if this is called right after mount (e.g. from
    // BiometricLockScreen's auto-prompt effect racing this hook's own init effect).
    if (!window.PublicKeyCredential) return false
    const storedCredId = localStorage.getItem('dekho_biometric_id')
    if (!storedCredId) return false

    // Developer bypass for localhost HTTP where WebAuthn might block
    if (window.location.hostname === 'localhost' && window.location.protocol === 'http:') {
      console.log('Bypassing biometric auth on local dev')
      return true
    }

    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // Decode the stored base64url credential ID back into raw bytes so we ask
      // for THIS specific device credential, rather than relying on discoverable
      // credential lookup (which some browsers can't resolve reliably by rp.id alone).
      const base64 = storedCredId.replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
      const raw = Uint8Array.from(atob(padded), c => c.charCodeAt(0))

      const getOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        userVerification: 'required',
        allowCredentials: [{ id: raw, type: 'public-key' }],
      }

      const assertion = await navigator.credentials.get({
        publicKey: getOptions
      })

      if (assertion) {
        return true
      }
      return false
    } catch (err) {
      console.error('Biometric authentication failed:', err)
      return false
    }
  }

  const remove = () => {
    localStorage.removeItem('dekho_biometric_id')
    setIsRegistered(false)
  }

  return {
    isSupported,
    isRegistered,
    register,
    authenticate,
    remove
  }
}
