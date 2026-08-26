import { useState, useEffect } from 'react'
import api from '../lib/api'

export interface WrapData {
  period: string
  income: { total: number, vs_last: number }
  expenses: { total: number, top_category: string, top_amount: number, category_breakdown: { category: string, amount: number }[] }
  savings_rate: number
  savings_goal_rate: number
  biggest_spend: { merchant: string, amount: number }
  top_merchant: { name: string, count: number }
  net_worth_delta: number
  top_weekday: { day: string, amount: number, pct_of_total: number }
  category_shift: { category: string, delta: number, is_new: boolean, direction: 'up' | 'down' }
  goals: Array<{ name: string, progress: number, added: number }>
  dekho_says: string
  personality: string
}

const CACHE_KEY = 'dekho_wrap_data_cache'

export function useWrapData(year: number, month: number) {
  const [data, setData] = useState<WrapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWrap() {
      setLoading(true)
      try {
        const cacheKey = `${CACHE_KEY}_${year}_${month}`
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          setData(JSON.parse(cached))
          setLoading(false)
          // Still fetch in background to update cache optionally, but UI shows fast
        }

        const res = await api.get<WrapData>(`/api/v1/wrap?year=${year}&month=${month}`)
        if (res) {
          setData(res)
          sessionStorage.setItem(cacheKey, JSON.stringify(res))
        }
      } catch (err) {
        console.error('Failed to fetch wrap data:', err)
        setError('Failed to load wrap')
      } finally {
        setLoading(false)
      }
    }

    fetchWrap()
  }, [year, month])

  return { data, loading, error }
}
