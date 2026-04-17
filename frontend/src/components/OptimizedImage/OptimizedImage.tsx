import React, { useState, useRef, useEffect } from 'react'
import { useLazyImage } from '../../hooks/useLazyLoad'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  priority?: boolean // For LCP optimization
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAzMkMxMi4yNjggMzIgNiAyNS43MzIgNiAyMEM2IDE0LjI2OCAxMi4yNjggOCAyMCA4QzI3LjczMiA4IDQgMTQuMjY4IDQgMjBDNCAyNS43MzIgMjcuNzMyIDMyIDIwIDMyWiIgZmlsbD0iI0QxRDVEMSIvPgo8L3N2Zz4K',
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const { imageSrc, setElement } = useLazyImage(src, {
    rootMargin: priority ? '0px' : '50px',
    threshold: priority ? 0.1 : 0.01
  })

  useEffect(() => {
    if (imageSrc && imgRef.current && !isLoaded) {
      imgRef.current.src = imageSrc
    }
  }, [imageSrc, isLoaded])

  const handleImageLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleImageError = () => {
    setHasError(true)
    onError?.()
  }

  if (priority) {
    // Priority images load immediately for LCP
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading="eager"
        decoding="sync"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in'
        }}
      />
    )
  }

  return (
    <div className={`optimized-image-container ${className}`} style={{ position: 'relative' }}>
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <img
          src={placeholder}
          alt=""
          className="image-placeholder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: width || '100%',
            height: height || '100%',
            objectFit: 'cover'
          }}
        />
      )}
      
      {/* Actual image */}
      <img
        ref={setElement}
        alt={alt}
        className={`optimized-image ${isLoaded ? 'loaded' : 'loading'}`}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in',
          width: width || '100%',
          height: height || 'auto'
        }}
      />
      
      {/* Error state */}
      {hasError && (
        <div className="image-error" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#666',
          fontSize: '14px'
        }}>
          Failed to load image
        </div>
      )}
    </div>
  )
}

// LCP monitoring utility
export const monitorLCP = () => {
  if (typeof window === 'undefined') return

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1] as any
    
    if (lastEntry.entryType === 'largest-contentful-paint') {
      console.log('LCP:', lastEntry.startTime)
      
      // Log LCP element details
      if (lastEntry.element) {
        console.log('LCP Element:', lastEntry.element.tagName, lastEntry.element.src || lastEntry.element.alt)
      }
      
      // Send to analytics in production
      if (import.meta.env.PROD) {
        // Analytics tracking code here
      }
    }
  })

  observer.observe({ entryTypes: ['largest-contentful-paint'] })
  
  return observer
}

export default OptimizedImage
