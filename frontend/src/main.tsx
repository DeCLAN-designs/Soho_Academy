import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor'
import { monitorTBT, runWhenIdle } from './components/AsyncComponent/AsyncComponent'
import { monitorCLS } from './components/LayoutStabilizer/LayoutStabilizer'
import { 
  monitorSpeedIndex, 
  optimizeLCP
} from './components/SpeedIndexOptimizer/SpeedIndexOptimizer'
import { 
  prioritizeResources,
  monitorLCP as monitorLCPAdvanced, 
  preloadCriticalResources,
  runAllLCPOptimizations
} from './components/LCPOptimizer/LCPOptimizer'

// Performance monitoring component with minimal blocking
const PerformanceMonitor = ({ children }: { children: React.ReactNode }) => {
  const { trackError } = usePerformanceMonitor({
    enableMetrics: import.meta.env.PROD,
    onError: (error, errorInfo) => {
      // In production, send to error tracking service
      console.error('Performance Error:', error, errorInfo)
    }
  })

  // Global error boundary simulation - non-blocking
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(new Error(event.reason), { type: 'unhandledrejection' })
    }

    // Use passive listeners for better performance
    window.addEventListener('error', handleError, { passive: true })
    window.addEventListener('unhandledrejection', handleUnhandledRejection, { passive: true })

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [trackError])

  return <>{children}</>
}

// Optimized app initialization for better FCP, LCP, and Speed Index
const initializeApp = () => {
  const container = document.getElementById('root')
  if (!container) {
    throw new Error('Root container not found')
  }

  // Remove critical loader immediately for better FCP and Speed Index
  const loader = document.getElementById('critical-loader')
  const appContent = document.querySelector('.app-content')
  
  if (loader) {
    loader.classList.add('fade-out')
    setTimeout(() => loader.remove(), 200) // Faster for better Speed Index
  }
  
  if (appContent) {
    appContent.classList.add('ready')
  }

  // Create root and render app
  const root = createRoot(container)
  
  root.render(
    <StrictMode>
      <PerformanceMonitor>
        <App />
      </PerformanceMonitor>
    </StrictMode>
  )

  // Enhanced performance monitoring - run when idle to avoid blocking
  runWhenIdle(() => {
    // Initialize Core Web Vitals monitoring with enhanced LCP attribution
    const lcpMonitor = monitorLCPAdvanced({
      enableAttribution: true,
      threshold: 2500,
      onLCP: (metrics) => {
        if (import.meta.env.DEV) {
          console.log('[Enhanced LCP]', metrics)
        }
      },
      onPoorLCP: (metrics, recommendations) => {
        console.warn('[Performance Alert] Poor LCP detected:', metrics.lcp + 'ms')
        recommendations.forEach((rec, i) => console.warn(`  ${i + 1}. ${rec}`))
      }
    })
    
    const speedIndexMonitor = monitorSpeedIndex({
      onUpdate: (metrics) => {
        if (import.meta.env.DEV && metrics.score > 0) {
          console.log('[Enhanced Speed Index]', metrics)
        }
      }
    })
    
    const tbtMonitor = monitorTBT()
    const clsMonitor = monitorCLS()
    
    // Run all LCP optimizations with a single call
    runAllLCPOptimizations({
      monitor: false, // Already monitoring above
      prioritize: true,
      preload: true,
      predictive: true,
      threshold: 2500,
      onPoorLCP: (metrics) => {
        console.warn('[LCP Optimizer] Auto-optimization triggered for LCP:', metrics.lcp + 'ms')
      }
    })
    
    // Legacy optimization calls (can be removed once transitioned)
    preloadCriticalResources()
    prioritizeResources({
      includeAboveFoldImages: true,
      includeCriticalCSS: true,
      includeFonts: true
    })
    optimizeLCP({ aggressive: true, injectPreload: true })
    
    // Log performance summary after page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        console.log('%c=== Enhanced Core Web Vitals Summary ===', 'color: #2196F3; font-weight: bold; font-size: 14px;')
        
        const metrics = lcpMonitor.getLCPMetrics()
        const siMetrics = speedIndexMonitor.getMetrics()
        
        console.log(`LCP: ${metrics.lcp}ms ${metrics.lcp > 2500 ? '⚠️' : '✅'}`)
        console.log(`Speed Index: ${siMetrics.score}ms ${siMetrics.score > 3400 ? '⚠️' : '✅'}`)
        console.log(`Total Blocking Time: ${tbtMonitor?.getTotalBlockingTime() || 0}ms`)
        console.log(`CLS Score: ${clsMonitor?.getCLS() || 0} ${(clsMonitor?.getCLS() || 0) > 0.1 ? '⚠️' : '✅'}`)
        
        // Show LCP attribution if available
        const attribution = lcpMonitor.getAttribution()
        if (attribution) {
          console.log('%cLCP Attribution:', 'color: #FF9800; font-weight: bold;')
          console.log(`  Time to First Byte: ${attribution.timeToFirstByte}ms`)
          console.log(`  Resource Load Delay: ${attribution.resourceLoadDelay}ms`)
          console.log(`  Resource Load Time: ${attribution.resourceLoadTime}ms`)
          console.log(`  Element Render Delay: ${attribution.elementRenderDelay}ms`)
        }
        
        // Performance recommendations
        const recommendations: string[] = []
        
        if ((tbtMonitor?.getTotalBlockingTime() || 0) > 200) {
          recommendations.push('Reduce JavaScript execution time to improve TBT')
        }
        
        if ((clsMonitor?.getCLS() || 0) > 0.1) {
          recommendations.push('Fix layout shifts - ensure images have dimensions')
        }
        
        if (metrics.lcp > 2500) {
          recommendations.push('Optimize LCP element - compress images, use CDN')
        }
        
        if (siMetrics.score > 3400) {
          recommendations.push('Improve Speed Index - optimize critical rendering path')
        }
        
        if (recommendations.length > 0) {
          console.log('%cRecommendations:', 'color: #F44336; font-weight: bold;')
          recommendations.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`))
        } else {
          console.log('%c✨ All Core Web Vitals look good!', 'color: #4CAF50; font-weight: bold;')
        }
      }, 2000)
    })

    // Additional performance metrics
    if ('performance' in window && 'measure' in window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const loadTime = navigation.loadEventEnd - navigation.fetchStart
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart
      
      console.log('Performance Metrics:')
      console.log(`- Page Load Time: ${loadTime}ms`)
      console.log(`- DOM Content Loaded: ${domContentLoaded}ms`)
      
      // Send metrics to analytics in production
      if (import.meta.env.PROD) {
        // Analytics tracking code here
        // Example: gtag('event', 'page_load_time', { value: loadTime })
      }
    }
  }, 1000) // Delay by 1 second to prioritize main content
}

// Start the application when DOM is ready - optimized for FCP and Speed Index
if (document.readyState === 'loading') {
  // Use requestAnimationFrame for better timing
  requestAnimationFrame(() => {
    document.addEventListener('DOMContentLoaded', initializeApp, { once: true })
  })
} else {
  // DOM is already ready, initialize immediately
  requestAnimationFrame(initializeApp)
}

// Enhanced resource preloading for better LCP and Speed Index
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Preload dashboard components with priority
    import('./components/Dashboard/BusAssistantDashboard/BusAssistantDashboard')
    import('./components/Dashboard/DriverDashboard/DriverDashboard')
    import('./components/Dashboard/SchoolAdminDashboard/SchoolAdminDashboard')
    import('./components/Dashboard/ParentDashboard/ParentDashboard')
    
    // Preload optimization components
    import('./components/SpeedIndexOptimizer/SpeedIndexOptimizer')
    import('./components/LCPOptimizer/LCPOptimizer')
  })
}

// Critical resource optimization for LCP
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Optimize critical rendering path
    const criticalCSS = document.querySelector('link[rel="stylesheet"]') as HTMLLinkElement
    if (criticalCSS) {
      criticalCSS.rel = 'preload'
      criticalCSS.as = 'style'
      criticalCSS.onload = function() {
        const link = this as HTMLLinkElement
        link.rel = 'stylesheet'
      }
    }
  })
}
