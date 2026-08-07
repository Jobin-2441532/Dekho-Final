/**
 * Dekho API Client
 * Centralised HTTP client for all backend calls.
 * Automatically attaches JWT Bearer token from localStorage.
 * Uses the Vite proxy in dev (/api → http://localhost:8000)
 */
function getBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.endsWith('.local')) {
      return `http://${host}:8000`
    }
  }
  return 'https://dekho-api.onrender.com'
}

interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean>
}

/** Get the stored JWT token */
function getToken(): string | null {
  return localStorage.getItem('dekho_token')
}

/** Clear auth state and redirect to login */
export function logout(): void {
  localStorage.removeItem('dekho_token')
  localStorage.removeItem('dekho_onboarded')
  window.location.href = '/login'
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options

  const baseUrl = getBaseUrl()
  let url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    )
    url += `?${searchParams}`
  }

  // Inject JWT token automatically
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  // Auto-logout on 401 (token expired / invalid)
  if (response.status === 401) {
    logout()
    throw new Error('Session expired. Please log in again.')
  }

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
}

export default api
