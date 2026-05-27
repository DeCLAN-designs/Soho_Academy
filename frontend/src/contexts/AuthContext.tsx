import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../lib/api'

type AuthUser = {
  token: string
  firstName: string
  lastName: string
  role: string
  numberPlate: string | null
  profilePhotoUrl: string | null
}

interface AuthContextType {
  isAuthenticated: boolean
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  updateUser: (nextUser: AuthUser) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_TOKEN_KEY = 'soho_auth_token'
const AUTH_ROLE_KEY = 'soho_user_role'
const AUTH_NUMBER_PLATE_KEY = 'soho_user_number_plate'
const AUTH_FIRST_NAME_KEY = 'soho_user_first_name'
const AUTH_LAST_NAME_KEY = 'soho_user_last_name'
const AUTH_PROFILE_PHOTO_URL_KEY = 'soho_user_profile_photo_url'

const getStoredValue = (key: string) => {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(key)?.trim() || ''
}

// Parse JWT token expiry without verification
const getTokenExpiry = (token: string): number | null => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const decoded = JSON.parse(atob(parts[1]))
    return decoded.exp ? decoded.exp * 1000 : null
  } catch {
    return null
  }
}

// Check if token has expired
const isTokenExpired = (token: string): boolean => {
  const expiry = getTokenExpiry(token)
  if (!expiry) return true
  return Date.now() >= expiry
}

interface AuthProviderProps {
  children: ReactNode
}

const persistUser = (nextUser: AuthUser | null) => {
  if (typeof window === 'undefined') {
    return
  }

  if (!nextUser) {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_ROLE_KEY)
    localStorage.removeItem(AUTH_NUMBER_PLATE_KEY)
    localStorage.removeItem(AUTH_FIRST_NAME_KEY)
    localStorage.removeItem(AUTH_LAST_NAME_KEY)
    localStorage.removeItem(AUTH_PROFILE_PHOTO_URL_KEY)
    return
  }

  localStorage.setItem(AUTH_TOKEN_KEY, nextUser.token)
  localStorage.setItem(AUTH_ROLE_KEY, nextUser.role)
  localStorage.setItem(AUTH_FIRST_NAME_KEY, nextUser.firstName)
  localStorage.setItem(AUTH_LAST_NAME_KEY, nextUser.lastName)

  if (nextUser.numberPlate) {
    localStorage.setItem(AUTH_NUMBER_PLATE_KEY, nextUser.numberPlate)
  } else {
    localStorage.removeItem(AUTH_NUMBER_PLATE_KEY)
  }

  if (nextUser.profilePhotoUrl) {
    localStorage.setItem(AUTH_PROFILE_PHOTO_URL_KEY, nextUser.profilePhotoUrl)
  } else {
    localStorage.removeItem(AUTH_PROFILE_PHOTO_URL_KEY)
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getStoredValue(AUTH_TOKEN_KEY)
    const role = getStoredValue(AUTH_ROLE_KEY)
    const firstName = getStoredValue(AUTH_FIRST_NAME_KEY)
    const lastName = getStoredValue(AUTH_LAST_NAME_KEY)
    const numberPlate = getStoredValue(AUTH_NUMBER_PLATE_KEY)
    const profilePhotoUrl = getStoredValue(AUTH_PROFILE_PHOTO_URL_KEY)

    // Check if token exists and hasn't expired
    if (token && !isTokenExpired(token)) {
      setUser({
        token,
        firstName,
        lastName,
        role,
        numberPlate: numberPlate || null,
        profilePhotoUrl: profilePhotoUrl || null,
      })
      setIsAuthenticated(true)
    } else {
      // Clear expired token
      if (token && isTokenExpired(token)) {
        persistUser(null)
      }
      setUser(null)
      setIsAuthenticated(false)
    }

    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password })
      
      if (response.success && response.data) {
        const {
          token,
          firstName,
          lastName,
          role,
          numberPlate,
          profilePhotoUrl,
        } = response.data

        const nextUser: AuthUser = {
          token,
          firstName,
          lastName,
          role,
          numberPlate: numberPlate || null,
          profilePhotoUrl: profilePhotoUrl || null,
        }

        persistUser(nextUser)
        setUser(nextUser)
        setIsAuthenticated(true)
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const updateUser = (nextUser: AuthUser) => {
    persistUser(nextUser)
    setUser(nextUser)
    setIsAuthenticated(true)
  }

  const logout = async () => {
    try {
      // Call logout API if available
      await authApi.logout()
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      persistUser(null)
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login,
    updateUser,
    logout,
    isLoading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
