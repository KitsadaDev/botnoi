import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/api'
import type { User } from '../lib/types'

// ===========================
// Auth Context Types
// ===========================
interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  isAdmin: boolean
  isStaff: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// ===========================
// AuthProvider
// ===========================
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // โหลด user จาก localStorage เมื่อ app เริ่ม
  useEffect(() => {
    const savedToken = localStorage.getItem('coolcare_token')
    if (savedToken) {
      setToken(savedToken)
      // ดึงข้อมูล user ล่าสุดจาก /api/auth/me
      api.get<{ success: boolean; data: User }>('/auth/me')
        .then((res) => {
          if (res.data.success) setUser(res.data.data)
        })
        .catch(() => {
          // Token หมดอายุหรือไม่ถูกต้อง
          localStorage.removeItem('coolcare_token')
          setToken(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('coolcare_token', newToken)
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('coolcare_token')
    setToken(null)
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAdmin: user?.role === 'ADMIN',
    isStaff: user?.role === 'STAFF' || user?.role === 'ADMIN',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ===========================
// useAuth hook
// ===========================
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth ต้องใช้ภายใน AuthProvider')
  return ctx
}
