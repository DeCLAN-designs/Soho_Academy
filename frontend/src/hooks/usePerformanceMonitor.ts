import { useEffect, useRef, useCallback } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage?: number
  errorCount: number
}

interface UsePerformanceMonitorOptions {
  enableMetrics?: boolean
  onMetricUpdate?: (metrics: PerformanceMetrics) => void
  onError?: (error: Error, errorInfo: any) => void
}

export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions = {}) => {
  const {
    enableMetrics = import.meta.env.PROD,
    onMetricUpdate,
    onError
  } = options

  const metricsRef = useRef<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    errorCount: 0
  })

  const startTimeRef = useRef<number>(Date.now())

  // Track component render time
  const trackRenderTime = useCallback(() => {
    const renderTime = Date.now() - startTimeRef.current
    metricsRef.current.renderTime = renderTime
    
    if (onMetricUpdate) {
      onMetricUpdate(metricsRef.current)
    }
  }, [onMetricUpdate])

  // Track page load performance
  const trackPageLoad = useCallback(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const loadTime = navigation.loadEventEnd - navigation.fetchStart
      metricsRef.current.loadTime = loadTime
      
      if (onMetricUpdate) {
        onMetricUpdate(metricsRef.current)
      }
    }
  }, [onMetricUpdate])

  // Track memory usage
  const trackMemoryUsage = useCallback(() => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      metricsRef.current.memoryUsage = memory.usedJSHeapSize
      
      if (onMetricUpdate) {
        onMetricUpdate(metricsRef.current)
      }
    }
  }, [onMetricUpdate])

  // Track errors
  const trackError = useCallback((error: Error, errorInfo?: any) => {
    metricsRef.current.errorCount += 1
    
    if (onError) {
      onError(error, errorInfo)
    }
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Performance Monitor - Error:', error, errorInfo)
    }
  }, [onError])

  // Setup performance monitoring
  useEffect(() => {
    if (!enableMetrics) return

    startTimeRef.current = Date.now()

    // Track initial page load
    if (document.readyState === 'complete') {
      trackPageLoad()
    } else {
      window.addEventListener('load', trackPageLoad)
      return () => window.removeEventListener('load', trackPageLoad)
    }
  }, [enableMetrics, trackPageLoad])

  // Track memory usage periodically
  useEffect(() => {
    if (!enableMetrics) return

    const interval = setInterval(trackMemoryUsage, 5000) // Every 5 seconds
    return () => clearInterval(interval)
  }, [enableMetrics, trackMemoryUsage])

  // Global error tracking
  useEffect(() => {
    if (!enableMetrics) return

    const handleError = (event: ErrorEvent) => {
      trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(new Error(event.reason), { type: 'unhandledrejection' })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [enableMetrics, trackError])

  return {
    metrics: metricsRef.current,
    trackRenderTime,
    trackError,
    trackMemoryUsage
  }
}
