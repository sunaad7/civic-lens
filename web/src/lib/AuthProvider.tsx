import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, apiFetch, setAccessToken, tryRefresh } from './api'
import { AuthContext, type AuthContextValue } from './auth-context'
import type { UpdateProfileInput, User } from './types'

interface AuthResponse {
  access_token: string
  user: User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await apiFetch<User>('/auth/me')
        if (!cancelled) setUser(me)
      } catch {
        const refreshed = await tryRefresh()
        if (refreshed && !cancelled) {
          try {
            setUser(await apiFetch<User>('/auth/me'))
          } catch {
            // stay signed out
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setAccessToken(res.access_token)
    setUser(res.user)
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
    setAccessToken(res.access_token)
    setUser(res.user)
  }, [])

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const updated = await apiFetch<User>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    setUser(updated)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' })
    } catch (err) {
      if (!(err instanceof ApiError)) throw err
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, updateProfile, logout }),
    [user, loading, login, register, updateProfile, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
