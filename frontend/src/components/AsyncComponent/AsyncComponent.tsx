import React, { Suspense, lazy, type ComponentType } from 'react'

interface AsyncComponentProps {
  loader: () => Promise<{ default: ComponentType<any> }>
  fallback?: React.ReactNode
}

// Loading fallback component
const DefaultFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    minHeight: '200px'
  }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid #f3f3f3',
      borderTop: '3px solid #670122',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
  </div>
)

export const AsyncComponent: React.FC<AsyncComponentProps> = ({
  loader,
  fallback = <DefaultFallback />
}) => {
  const LazyComponent = lazy(loader)

  return (
    <Suspense fallback={fallback}>
      <LazyComponent />
    </Suspense>
  )
}

// Preload utility for better TBT
export const preloadComponent = (loader: () => Promise<{ default: ComponentType<any> }>) => {
  // Start loading the component in the background
  loader()
}

// Higher-order component for code splitting
export const withCodeSplitting = <P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = lazy(importFunc)
  
  return (props: P) => (
    <Suspense fallback={fallback || <DefaultFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

// Web Worker utility for heavy computations
export const createWorker = (fn: Function) => {
  const blob = new Blob([`(${fn.toString()})()`], { type: 'application/javascript' })
  const workerUrl = URL.createObjectURL(blob)
  return new Worker(workerUrl)
}

// TBT monitoring utility
export const monitorTBT = () => {
  if (typeof window === 'undefined') return { getTotalBlockingTime: () => 0, getLongTasks: () => [], observer: null }

  let totalBlockingTime = 0
  const longTasks: any[] = []

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'longtask') {
        const blockingTime = entry.duration - 50
        totalBlockingTime += blockingTime
        longTasks.push({
          duration: entry.duration,
          startTime: entry.startTime,
          blockingTime
        })
        
        console.log(`Long task detected: ${entry.duration}ms (blocking: ${blockingTime}ms)`)
      }
    })
  })

  observer.observe({ entryTypes: ['longtask'] })

  return {
    getTotalBlockingTime: () => totalBlockingTime,
    getLongTasks: () => longTasks,
    observer
  }
}

// Request idle callback utility
export const runWhenIdle = (callback: (deadline: IdleDeadline) => void, timeout = 2000) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout })
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1)
  }
}

// Chunk preloading utility
export const preloadChunks = (chunks: string[]) => {
  chunks.forEach(chunk => {
    const link = document.createElement('link')
    link.rel = 'modulepreload'
    link.href = chunk
    document.head.appendChild(link)
  })
}

export default AsyncComponent
