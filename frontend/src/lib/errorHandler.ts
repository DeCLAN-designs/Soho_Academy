import { ApiError } from './api'

// Server connection error types
export const isNetworkError = (error: any): boolean => {
  return (
    error instanceof TypeError && 
    (error.message === 'Failed to fetch' || 
     error.message.includes('NetworkError') ||
     error.message.includes('fetch') ||
     error.message.includes('ERR_NETWORK') ||
     error.message.includes('ERR_INTERNET_DISCONNECTED'))
  )
}

export const isServerError = (error: any): boolean => {
  return error instanceof ApiError && (error.status >= 500 || error.status === 0)
}

export const isConnectionError = (error: any): boolean => {
  return isNetworkError(error) || isServerError(error)
}

// Clear all authentication data
export const clearAuthData = (): void => {
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
export const redirectToLogin = (): void => {
  if (typeof window === 'undefined') return

  // Clear auth data first
  clearAuthData()
  
  // Redirect to login page
  window.location.href = '/login'
}

// Enhanced error handler for API calls
export const handleApiError = (error: any): void => {
  console.error('API Error:', error)

  // Check if it's a connection/server error
  if (isConnectionError(error)) {
    console.log('Connection error detected, clearing auth data and redirecting to login')
    redirectToLogin()
    return
  }

  // Handle authentication errors (401)
  if (error instanceof ApiError && error.status === 401) {
    console.log('Authentication error detected, clearing auth data and redirecting to login')
    redirectToLogin()
    return
  }

  // Handle forbidden errors (403)
  if (error instanceof ApiError && error.status === 403) {
    console.log('Forbidden error detected, clearing auth data and redirecting to login')
    redirectToLogin()
    return
  }
}

// Enhanced fetch wrapper with error handling
export const safeFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  try {
    const response = await fetch(url, {
      ...options,
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    return response
  } catch (error) {
    console.error('Fetch error:', error)
    
    // Handle network errors
    if (isNetworkError(error)) {
      throw new Error('Network connection failed. Please check your internet connection.')
    }
    
    throw error
  }
}

// Check server health
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await safeFetch('/api/health', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    
    return response.ok
  } catch (error) {
    console.error('Server health check failed:', error)
    return false
  }
}

// Periodic server health checker
export class ServerHealthMonitor {
  private intervalId: number | null = null
  private isRunning = false
  private checkInterval = 30000 // 30 seconds

  start(callback?: (isHealthy: boolean) => void): void {
    if (this.isRunning) return

    this.isRunning = true
    
    // Initial check
    this.performHealthCheck(callback)
    
    // Periodic checks
    this.intervalId = window.setInterval(() => {
      this.performHealthCheck(callback)
    }, this.checkInterval)
  }

  stop(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
  }

  private async performHealthCheck(callback?: (isHealthy: boolean) => void): Promise<void> {
    try {
      const isHealthy = await checkServerHealth()
      callback?.(isHealthy)
      
      if (!isHealthy) {
        console.warn('Server health check failed')
        // Don't automatically redirect on health check failure
        // Let the API calls handle the error
      }
    } catch (error) {
      console.error('Health check error:', error)
      callback?.(false)
    }
  }
}

// Global error handler for unhandled promise rejections
export const setupGlobalErrorHandlers = (): void => {
  if (typeof window === 'undefined') return

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    
    // If it's a connection error, handle it
    if (isConnectionError(event.reason)) {
      event.preventDefault()
      redirectToLogin()
    }
  })

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error)
    
    // If it's a connection error, handle it
    if (isConnectionError(event.error)) {
      event.preventDefault()
      redirectToLogin()
    }
  })
}

// Export singleton instance
export const serverHealthMonitor = new ServerHealthMonitor()
