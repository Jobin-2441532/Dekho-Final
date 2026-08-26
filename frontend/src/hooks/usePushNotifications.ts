import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window
      setIsSupported(supported)
      if (!supported) {
        setLoading(false)
        return
      }
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        setIsSubscribed(!!sub)
      } catch {
        // service worker not ready yet — leave isSubscribed false
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const subscribe = useCallback(async (): Promise<{ ok: boolean, error?: string, reason?: 'unsupported' | 'denied' | 'permission-not-granted' | 'failed' }> => {
    if (!isSupported) return { ok: false, reason: 'unsupported', error: 'Notifications are not supported in this browser.' }

    if (Notification.permission === 'denied') {
      return { ok: false, reason: 'denied', error: 'Notifications are blocked for this site. Enable them in your browser\'s site settings, then try again.' }
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { ok: false, reason: 'permission-not-granted', error: 'Permission was not granted.' }
    }

    try {
      const { publicKey } = await api.get<{ publicKey: string }>('/api/v1/notifications/vapid-public-key')
      if (!publicKey) {
        return { ok: false, reason: 'failed', error: 'Server has no VAPID key configured.' }
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      const subJson = sub.toJSON()
      await api.post('/api/v1/notifications/subscribe', {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      })

      setIsSubscribed(true)
      return { ok: true }
    } catch (err) {
      console.error('Push subscription failed:', err)
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, reason: 'failed', error: message }
    }
  }, [isSupported])

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.post('/api/v1/notifications/unsubscribe', { endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
    } finally {
      setIsSubscribed(false)
    }
  }, [])

  const sendTest = useCallback(async (): Promise<boolean> => {
    try {
      await api.post('/api/v1/notifications/test', {})
      return true
    } catch (err) {
      console.error('Test notification failed:', err)
      return false
    }
  }, [])

  return { isSupported, isSubscribed, loading, subscribe, unsubscribe, sendTest }
}
