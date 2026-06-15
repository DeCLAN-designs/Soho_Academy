import React, { useEffect, useRef, useState } from 'react'

interface LayoutStabilizerProps {
  children: React.ReactNode
  className?: string
  reserveSpace?: boolean
}

export const LayoutStabilizer: React.FC<LayoutStabilizerProps> = ({
  children,
  className = '',
  reserveSpace = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isMeasured, setIsMeasured] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const measureDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
        setIsMeasured(true)
      }
    }

    // Measure immediately if content is already loaded
    if (document.readyState !== 'loading') {
      measureDimensions()
    } else {
      // Wait for DOM content to load
      document.addEventListener('DOMContentLoaded', measureDimensions)
      return () => document.removeEventListener('DOMContentLoaded', measureDimensions)
    }

    // Also measure when images load to prevent CLS
    const images = containerRef.current.querySelectorAll('img')
    const imageLoadPromises = Array.from(images).map(img => {
      return new Promise<void>((resolve) => {
        if (img.complete) {
          resolve()
        } else {
          img.addEventListener('load', () => resolve())
          img.addEventListener('error', () => resolve())
        }
      })
    })

    Promise.all(imageLoadPromises).then(measureDimensions)

    // Handle window resize
    const handleResize = () => {
      measureDimensions()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Reserve space to prevent CLS
  const reservedStyle = reserveSpace && !isMeasured ? {
    width: dimensions.width || '100%',
    height: dimensions.height || 'auto',
    minHeight: dimensions.height || '200px',
    visibility: 'hidden' as const
  } : {}

  return (
    <div
      ref={containerRef}
      className={`layout-stabilizer ${className}`}
      style={{
        ...reservedStyle,
        transition: 'none', // Disable transitions during measurement
        contain: 'layout' as const, // CSS containment for better performance
      }}
    >
      {children}
    </div>
  )
}

// CLS monitoring utility
export const monitorCLS = () => {
  if (typeof window === 'undefined') return { getCLS: () => 0, observer: null }

  let clsValue = 0
  let clsEntries: any[] = []

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      const layoutShiftEntry = entry as any
      if (!layoutShiftEntry.hadRecentInput) {
        clsValue += layoutShiftEntry.value
        clsEntries.push({
          value: layoutShiftEntry.value,
          startTime: entry.startTime,
          sources: layoutShiftEntry.sources
        })
        
        console.log(`CLS Score: ${clsValue.toFixed(4)}`)
        console.log(`Layout Shift Sources:`, layoutShiftEntry.sources)
        
        // Send to analytics in production
        if (import.meta.env.PROD && clsValue > 0.1) {
          // Analytics tracking for poor CLS
          console.warn('Poor CLS detected:', clsValue)
        }
      }
    })
  })

  observer.observe({ entryTypes: ['layout-shift'] })

  return {
    getCLS: () => clsValue,
    getEntries: () => clsEntries,
    observer
  }
}

// Image dimension reservation utility
export const reserveImageSpace = (src: string, width?: number, height?: number) => {
  const img = new Image()
  
  return new Promise<{ width: number; height: number }>((resolve) => {
    img.onload = () => {
      resolve({
        width: width || img.naturalWidth,
        height: height || img.naturalHeight
      })
    }
    
    img.onerror = () => {
      // Fallback dimensions
      resolve({
        width: width || 300,
        height: height || 200
      })
    }
    
    img.src = src
  })
}

// Font loading utility to prevent CLS
export const loadFonts = (fonts: string[]) => {
  const fontPromises = fonts.map(font => {
    return new Promise<void>((resolve) => {
      if ('fonts' in document) {
        document.fonts.load(font).then(() => resolve())
      } else {
        // Fallback
        resolve()
      }
    })
  })
  
  return Promise.all(fontPromises)
}

// Dynamic content height reservation
export const useDynamicHeight = () => {
  const [height, setHeight] = useState<number | null>(null)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(element)
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return { height, elementRef }
}

export default LayoutStabilizer
