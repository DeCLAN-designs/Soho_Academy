import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

// Enhanced error detection for server connection issues
const isNetworkError = (error: any): boolean => {
  return (
    error instanceof TypeError && 
    (error.message === 'Failed to fetch' || 
     error.message.includes('NetworkError') ||
     error.message.includes('fetch') ||
     error.message.includes('ERR_NETWORK') ||
     error.message.includes('ERR_INTERNET_DISCONNECTED'))
  )
}

const isServerError = (error: any): boolean => {
  return error && (error.status >= 500 || error.status === 0)
}

const isConnectionError = (error: any): boolean => {
  return isNetworkError(error) || isServerError(error)
}

// Clear all authentication data
const clearAuthData = (): void => {
  if (typeof window === 'undefined') return

  const keysToRemove = [
    'soho_auth_token',
    'soho_user_role',
    'soho_user_number_plate',
    'soho_user_first_name',
    'soho_user_last_name',
    'soho_user_profile_photo_url'
  ]

  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })
}

// Redirect to login page
const redirectToLogin = (): void => {
  if (typeof window === 'undefined') return

  // Clear auth data first
  clearAuthData()
  
  // Redirect to login page
  window.location.href = '/login'
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a connection error
    if (isConnectionError(error)) {
      console.log('Connection error detected in ErrorBoundary, clearing auth data and redirecting to login')
      // Clear auth data and redirect
      clearAuthData()
      setTimeout(() => {
        redirectToLogin()
      }, 100)
    }

    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)

    // Log connection errors specifically
    if (isConnectionError(error)) {
      console.error('Connection error detected - server might be down')
    }
  }

  render() {
    if (this.state.hasError) {
      // If there's a custom fallback, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          backgroundColor: '#f8fafc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '400px',
            textAlign: 'center',
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#fee2e2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <span style={{ fontSize: '24px', color: '#dc2626' }}>!</span>
            </div>
            
            <h2 style={{ 
              margin: '0 0 16px 0', 
              color: '#1f2937',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              Something went wrong
            </h2>
            
            <p style={{ 
              margin: '0 0 24px 0', 
              color: '#6b7280',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            
            <button
              onClick={() => {
                // Clear auth data and redirect to login
                clearAuthData()
                redirectToLogin()
              }}
              style={{
                backgroundColor: '#670122',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#8b1538'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#670122'
              }}
            >
              Go to Login
            </button>
            
            <button
              onClick={() => {
                // Try to recover
                this.setState({ hasError: false, error: undefined })
              }}
              style={{
                backgroundColor: 'transparent',
                color: '#670122',
                border: '1px solid #670122',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                marginLeft: '12px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#670122'
                e.currentTarget.style.color = 'white'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#670122'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
