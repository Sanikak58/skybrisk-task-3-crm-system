import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api.js'

const AuthContext = createContext(null)

const STORAGE_KEY = 'crm_token_v1'
const USER_KEY = 'crm_user_v1'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })

  useEffect(() => {
    if (token) localStorage.setItem(STORAGE_KEY, token)
    else localStorage.removeItem(STORAGE_KEY)
  }, [token])

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  }, [user])

  async function login(usernameOrEmail, password) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username_or_email: usernameOrEmail, password },
    })
    setToken(data.access_token)
    setUser(data.user)
  }

  async function signup({ username, email, password, role }) {
    await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: { username, email, password, role },
    })
    await login(username, password)
  }

  async function refreshMe() {
    if (!token) return
    const me = await apiRequest('/api/me', { token })
    setUser(me)
  }

  function logout() {
    setToken('')
    setUser(null)
  }

  const value = useMemo(
    () => ({ token, user, login, signup, logout, refreshMe }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

