import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler } from '../services/api'
import { logout as clearStoredAuth, login as loginRequest, type AuthUser, type LoginPayload, type LoginResult } from '../services/authService'

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<LoginResult>
  logout: () => void
  updateUser: (nextUser: AuthUser | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('user')

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = readStoredUser()

    setToken(storedToken)
    setUser(storedUser)
    setLoading(false)
  }, [])

  const logout = useCallback(() => {
    clearStoredAuth()
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser)

    if (nextUser) {
      localStorage.setItem('user', JSON.stringify(nextUser))
    } else {
      localStorage.removeItem('user')
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const login = useCallback(async (payload: LoginPayload): Promise<LoginResult> => {
    const result = await loginRequest(payload)
    localStorage.setItem('token', result.accessToken)
    localStorage.setItem('user', JSON.stringify(result.user))
    setToken(result.accessToken)
    setUser(result.user)
    return result
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    isAuthenticated: Boolean(token),
    login,
    logout,
    updateUser,
  }), [login, loading, logout, token, updateUser, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

export function useUser(): Pick<AuthContextValue, 'user' | 'loading'> {
  const { user, loading } = useAuth()
  return { user, loading }
}