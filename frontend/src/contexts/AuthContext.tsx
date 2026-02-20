import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  user: {
    token: string
    firstName: string
    lastName: string
    role: string
    numberPlate: string | null
  } | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_TOKEN_KEY = 'soho_auth_token'
const AUTH_ROLE_KEY = 'soho_user_role'
const AUTH_NUMBER_PLATE_KEY = 'soho_user_number_plate'
const AUTH_FIRST_NAME_KEY = 'soho_user_first_name'
const AUTH_LAST_NAME_KEY = 'soho_user_last_name'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{
    token: string
    firstName: string
    lastName: string
    role: string
    numberPlate: string | null
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Force fresh authentication on each app start.
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_ROLE_KEY)
    localStorage.removeItem(AUTH_NUMBER_PLATE_KEY)
    localStorage.removeItem(AUTH_FIRST_NAME_KEY)
    localStorage.removeItem(AUTH_LAST_NAME_KEY)
    setUser(null)
    setIsAuthenticated(false)
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password })
      
      if (response.success && response.data) {
        const { token, firstName, lastName, role, numberPlate } = response.data
        
        // Store in localStorage
        localStorage.setItem(AUTH_TOKEN_KEY, token)
        localStorage.setItem(AUTH_ROLE_KEY, role)
        localStorage.setItem(AUTH_FIRST_NAME_KEY, firstName)
        localStorage.setItem(AUTH_LAST_NAME_KEY, lastName)
        if (numberPlate) {
          localStorage.setItem(AUTH_NUMBER_PLATE_KEY, numberPlate)
        } else {
          localStorage.removeItem(AUTH_NUMBER_PLATE_KEY)
        }
        
        // Update state
        setUser({
          token,
          firstName,
          lastName,
          role,
          numberPlate: numberPlate || null
        })
        setIsAuthenticated(true)
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Call logout API if available
      await authApi.logout()
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_ROLE_KEY)
      localStorage.removeItem(AUTH_NUMBER_PLATE_KEY)
      localStorage.removeItem(AUTH_FIRST_NAME_KEY)
      localStorage.removeItem(AUTH_LAST_NAME_KEY)
      
      // Update state
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login,
    logout,
    isLoading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
