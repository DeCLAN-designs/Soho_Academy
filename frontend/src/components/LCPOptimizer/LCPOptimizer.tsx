import React, { useEffect, useRef, useState, useMemo } from 'react'

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface LCPOptimizerProps {
  children: React.ReactNode
  priority?: 'critical' | 'high' | 'medium' | 'low'
  enableIntersectionObserver?: boolean
  enablePredictiveLCP?: boolean
  enableAdaptiveFormats?: boolean
  enableNetworkAwareLoading?: boolean
  enableSkeletonFallback?: boolean
  enableBackgroundFetch?: boolean
  optimizeImages?: boolean
  optimizeVideos?: boolean
  skeletonFallback?: React.ReactNode
  lcpThreshold?: number
  onLCPCalculated?: (metrics: LCPMetrics) => void
  onLCPDetected?: (element: Element, metrics: Partial<LCPMetrics>) => void
}

interface LCPMetrics {
  lcp: number
  lcpElement: Element | null
  lcpUrl: string
  lcpSize: number
  renderTime: number
  loadTime: number
  entryType: string
  networkType: string
  deviceMemory: number
  optimizationApplied: boolean
}

interface LCPAttribution {
  element: Element
  url?: string
  timeToFirstByte: number
  resourceLoadDelay: number
  resourceLoadTime: number
  elementRenderDelay: number
}

type ImageFormat = 'avif' | 'webp' | 'jpeg' | 'png'
type NetworkType = '4g' | '3g' | '2g' | 'slow-2g' | 'offline' | 'unknown'
type DeviceCapability = 'high' | 'medium' | 'low'

// =============================================================================
// ADAPTIVE FORMAT DETECTION
// =============================================================================

class AdaptiveFormatDetector {
  private supportedFormats: Set<ImageFormat> = new Set()
  private checked = false

  async detect(): Promise<Set<ImageFormat>> {
    if (this.checked) return this.supportedFormats

    // Check AVIF support
    if (this.supportsImageFormat('image/avif')) {
      this.supportedFormats.add('avif')
    }

    // Check WebP support
    if (this.supportsImageFormat('image/webp')) {
      this.supportedFormats.add('webp')
    }

    // JPEG and PNG are always supported
    this.supportedFormats.add('jpeg')
    this.supportedFormats.add('png')

    this.checked = true
    return this.supportedFormats
  }

  private supportsImageFormat(mimeType: string): boolean {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL(mimeType).indexOf(mimeType) !== -1
  }

  getOptimalFormat(preferred?: ImageFormat): ImageFormat {
    if (preferred && this.supportedFormats.has(preferred)) {
      return preferred
    }
    if (this.supportedFormats.has('avif')) return 'avif'
    if (this.supportedFormats.has('webp')) return 'webp'
    return 'jpeg'
  }
}

// =============================================================================
// PREDICTIVE LCP DETECTOR
// =============================================================================

class PredictiveLCPDetector {
  private candidates: Element[] = []
  private observer: IntersectionObserver | null = null
  private mutationObserver: MutationObserver | null = null

  startMonitoring(container: HTMLElement, onCandidateFound: (el: Element) => void): void {
    // Find potential LCP candidates
    this.findCandidates(container)
    
    // Monitor for new candidates
    this.mutationObserver = new MutationObserver((mutations) => {
      let hasNewElements = false
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            hasNewElements = true
            this.findCandidates(node as HTMLElement)
          }
        })
      })
      
      if (hasNewElements) {
        this.rankCandidates().slice(0, 3).forEach(onCandidateFound)
      }
    })

    this.mutationObserver.observe(container, { childList: true, subtree: true })

    // Monitor visibility
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            onCandidateFound(entry.target)
          }
        })
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    // Observe top candidates
    this.rankCandidates().slice(0, 5).forEach(el => {
      this.observer?.observe(el)
    })
  }

  private findCandidates(container: Element): void {
    const selector = 'img, video, [role="img"], svg, canvas, [data-lcp-candidate="true"]'
    const elements = container.querySelectorAll(selector)
    
    elements.forEach(el => {
      if (!this.candidates.includes(el)) {
        this.candidates.push(el)
      }
    })
  }

  private rankCandidates(): Element[] {
    return this.candidates
      .map(el => ({ element: el, score: this.calculateLCPScore(el) }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.element)
  }

  private calculateLCPScore(element: Element): number {
    let score = 0
    const rect = element.getBoundingClientRect()
    
    // Size matters for LCP
    const area = rect.width * rect.height
    score += Math.min(area / 10000, 100) // Cap at 100
    
    // Above the fold is more likely to be LCP
    if (rect.top < window.innerHeight) score += 50
    if (rect.top < window.innerHeight / 2) score += 30
    
    // Visible
    if (rect.width > 0 && rect.height > 0) score += 20
    
    // Image elements are strong LCP candidates
    if (element.tagName === 'IMG') score += 40
    if (element.tagName === 'VIDEO') score += 35
    if (element.tagName === 'CANVAS') score += 30
    
    // Check if image is likely to be large
    const img = element as HTMLImageElement
    if (img.naturalWidth && img.naturalHeight) {
      const pixelCount = img.naturalWidth * img.naturalHeight
      if (pixelCount > 500000) score += 25 // Large images
    }
    
    // Check for background images
    const styles = window.getComputedStyle(element)
    if (styles.backgroundImage && styles.backgroundImage !== 'none') {
      score += 30
    }
    
    return score
  }

  stop(): void {
    this.observer?.disconnect()
    this.mutationObserver?.disconnect()
    this.candidates = []
  }

  getTopCandidate(): Element | null {
    return this.rankCandidates()[0] || null
  }
}

// =============================================================================
// NETWORK & DEVICE UTILITIES
// =============================================================================

const getNetworkInfo = (): { type: NetworkType; downlink: number; rtt: number; saveData: boolean } => {
  const nav = navigator as any
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection
  
  if (connection) {
    return {
      type: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    }
  }
  
  return { type: 'unknown', downlink: 0, rtt: 0, saveData: false }
}

const getDeviceCapability = (): DeviceCapability => {
  const memory = (navigator as any).deviceMemory || 4
  const cores = navigator.hardwareConcurrency || 4
  
  if (memory >= 8 && cores >= 6) return 'high'
  if (memory >= 4 && cores >= 4) return 'medium'
  return 'low'
}

// =============================================================================
// BACKGROUND FETCH MANAGER
// =============================================================================

class BackgroundFetchManager {
  private controller: AbortController | null = null
  private queue: string[] = []

  async prefetch(urls: string[]): Promise<void> {
    if ('BackgroundFetchManager' in self) {
      // Use Background Fetch API if available
      try {
        const registration = await (navigator as any).serviceWorker?.ready
        if (registration?.backgroundFetch) {
          await registration.backgroundFetch.fetch('lcp-prefetch', urls, {
            title: 'Prefetching LCP resources'
          })
        }
      } catch (e) {
        // Fallback to standard fetch
        this.fallbackPrefetch(urls)
      }
    } else {
      this.fallbackPrefetch(urls)
    }
  }

  private fallbackPrefetch(urls: string[]): void {
    this.controller = new AbortController()
    
    urls.forEach(url => {
      if (!this.queue.includes(url)) {
        this.queue.push(url)
      }
    })

    // Process queue when idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.processQueue(), { timeout: 2000 })
    } else {
      setTimeout(() => this.processQueue(), 100)
    }
  }

  private async processQueue(): Promise<void> {
    const batch = this.queue.splice(0, 3) // Process 3 at a time
    
    await Promise.all(
      batch.map(url =>
        fetch(url, {
          method: 'GET',
          mode: 'no-cors',
          credentials: 'omit',
          signal: this.controller?.signal
        }).catch(() => {}) // Silent fail
      )
    )

    if (this.queue.length > 0) {
      this.processQueue()
    }
  }

  cancel(): void {
    this.controller?.abort()
    this.queue = []
  }
}

// =============================================================================
// LCP ATTRIBUTION ANALYZER
// =============================================================================

class LCPAttributionAnalyzer {
  private navigationEntry: PerformanceNavigationTiming | null = null

  constructor() {
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    this.navigationEntry = entries[0] || null
  }

  analyze(lcpEntry: PerformanceEntry): LCPAttribution {
    const url = (lcpEntry as any).url
    const element = (lcpEntry as any).element
    
    // Get resource timing if available
    let resourceEntry: PerformanceResourceTiming | null = null
    if (url) {
      const resources = performance.getEntriesByName(url) as PerformanceResourceTiming[]
      resourceEntry = resources[resources.length - 1] || null
    }

    const navStart = this.navigationEntry?.startTime || 0
    const responseStart = this.navigationEntry?.responseStart || 0
    
    const timeToFirstByte = responseStart - navStart
    const resourceLoadDelay = resourceEntry ? resourceEntry.startTime - responseStart : 0
    const resourceLoadTime = resourceEntry ? resourceEntry.responseEnd - resourceEntry.startTime : 0
    const elementRenderDelay = lcpEntry.startTime - (resourceEntry?.responseEnd || responseStart)

    return {
      element,
      url,
      timeToFirstByte: Math.max(0, timeToFirstByte),
      resourceLoadDelay: Math.max(0, resourceLoadDelay),
      resourceLoadTime: Math.max(0, resourceLoadTime),
      elementRenderDelay: Math.max(0, elementRenderDelay)
    }
  }

  getRecommendations(attribution: LCPAttribution): string[] {
    const recommendations: string[] = []
    
    if (attribution.timeToFirstByte > 600) {
      recommendations.push('Reduce Time to First Byte - optimize server response time')
    }
    
    if (attribution.resourceLoadDelay > 200) {
      recommendations.push('Resource load delay detected - preload critical resources')
    }
    
    if (attribution.resourceLoadTime > 1000) {
      recommendations.push('Large resource load time - optimize image/video compression')
    }
    
    if (attribution.elementRenderDelay > 200) {
      recommendations.push('Element render delay - reduce render-blocking resources')
    }
    
    return recommendations
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LCPOptimizer: React.FC<LCPOptimizerProps> = ({
  children,
  priority = 'medium',
  enableIntersectionObserver = true,
  enablePredictiveLCP = true,
  enableAdaptiveFormats = true,
  enableNetworkAwareLoading = true,
  enableSkeletonFallback = true,
  enableBackgroundFetch = true,
  optimizeImages = true,
  optimizeVideos = true,
  skeletonFallback,
  onLCPDetected
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOptimized, setIsOptimized] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [lcpElement, setLcpElement] = useState<Element | null>(null)
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [detectedFormat, setDetectedFormat] = useState<ImageFormat>('jpeg')
  
  const formatDetector = useMemo(() => new AdaptiveFormatDetector(), [])
  const lcpDetector = useMemo(() => new PredictiveLCPDetector(), [])
  const bgFetchManager = useMemo(() => new BackgroundFetchManager(), [])

  // Detect optimal format on mount
  useEffect(() => {
    if (enableAdaptiveFormats) {
      formatDetector.detect().then(formats => {
        const optimal = formats.has('avif') ? 'avif' : 
                       formats.has('webp') ? 'webp' : 'jpeg'
        setDetectedFormat(optimal)
      })
    }
  }, [enableAdaptiveFormats, formatDetector])

  // Predictive LCP detection
  useEffect(() => {
    if (!enablePredictiveLCP || !containerRef.current) return

    const container = containerRef.current
    
    lcpDetector.startMonitoring(container, (candidate) => {
      // Pre-optimize predicted LCP element
      preOptimizeCandidate(candidate)
      onLCPDetected?.(candidate, { 
        lcp: 0, // Will be updated
        optimizationApplied: true 
      })
    })

    return () => lcpDetector.stop()
  }, [enablePredictiveLCP, lcpDetector, onLCPDetected])

  // Network-aware loading
  useEffect(() => {
    if (!enableNetworkAwareLoading) return

    const networkInfo = getNetworkInfo()
    const deviceCapability = getDeviceCapability()

    // Adjust optimizations based on network and device
    if (networkInfo.saveData) {
      // Disable heavy optimizations
      setShowSkeleton(false)
    }

    if (networkInfo.type === '2g' || networkInfo.type === 'slow-2g') {
      // Use low quality placeholders
    }

    if (deviceCapability === 'low') {
      // Reduce concurrent loads
    }
  }, [enableNetworkAwareLoading])

  // Background fetch for predicted resources
  useEffect(() => {
    if (!enableBackgroundFetch || !containerRef.current) return

    const images = containerRef.current.querySelectorAll('img[data-prefetch="true"]')
    const urls = Array.from(images).map(img => (img as HTMLImageElement).src)
    
    if (urls.length > 0) {
      bgFetchManager.prefetch(urls)
    }

    return () => bgFetchManager.cancel()
  }, [enableBackgroundFetch, bgFetchManager])

  // Main optimization effect
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const networkInfo = getNetworkInfo()

    // Optimize for LCP
    optimizeForLCP(container)

    // Setup intersection observer
    if (enableIntersectionObserver) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true)
              optimizeForLCP(entry.target as HTMLElement)
              optimizeImagesForLCP(entry.target as HTMLElement)
              optimizeVideosForLCP(entry.target as HTMLElement)
            }
          })
        },
        {
          rootMargin: networkInfo.type === '4g' ? '200px' : '100px',
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
        }
      )

      observer.observe(container)

      return () => observer.disconnect()
    }
  }, [
    enableIntersectionObserver,
    priority,
    optimizeImages,
    optimizeVideos,
    detectedFormat
  ])

  const preOptimizeCandidate = (element: Element) => {
    const htmlElement = element as HTMLElement
    
    // Apply aggressive optimizations to predicted LCP
    htmlElement.style.contain = 'layout style paint'
    htmlElement.style.contentVisibility = 'auto'
    
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement
      img.loading = 'eager'
      img.decoding = 'sync'
      img.fetchPriority = 'high'
      
      // Inject preload link
      injectPreloadLink(img.src, 'image')
    }
    
    setLcpElement(element)
  }

  const optimizeForLCP = (element: HTMLElement) => {
    element.style.contain = 'layout style paint'
    element.style.transform = 'translateZ(0)'
    
    switch (priority) {
      case 'critical':
        element.style.contentVisibility = 'auto'
        break
      case 'high':
        element.style.contentVisibility = 'auto'
        break
      case 'medium':
        element.style.contentVisibility = 'visible'
        break
      case 'low':
        element.style.contentVisibility = 'hidden'
        break
    }
    
    setIsOptimized(true)
  }

  const optimizeImagesForLCP = (container: HTMLElement) => {
    if (!optimizeImages) return

    const images = container.querySelectorAll('img')
    images.forEach((img, index) => {
      const imageElement = img as HTMLImageElement
      
      // Priority-based loading
      if (priority === 'critical' && index === 0) {
        imageElement.loading = 'eager'
        imageElement.decoding = 'sync'
        imageElement.fetchPriority = 'high'
        setLcpElement(imageElement)
        
        // Inject preload
        injectPreloadLink(imageElement.src, 'image', imageElement.srcset)
      } else if (priority === 'high' && index < 2) {
        imageElement.loading = 'eager'
        imageElement.decoding = 'sync'
        imageElement.fetchPriority = 'high'
      } else if (index < 3) {
        imageElement.loading = 'eager'
        imageElement.decoding = 'async'
        imageElement.fetchPriority = 'auto'
      } else {
        imageElement.loading = 'lazy'
        imageElement.decoding = 'async'
        imageElement.fetchPriority = 'low'
      }
      
      // Adaptive format injection
      if (enableAdaptiveFormats && detectedFormat !== 'jpeg') {
        const currentSrc = imageElement.src
        if (currentSrc && !currentSrc.includes('data:')) {
          // Try to use adaptive format via srcset or picture element
          // This is a simplified approach - production code would be more sophisticated
        }
      }
      
      // CSS optimizations
      imageElement.style.contain = 'layout style paint'
      imageElement.style.transform = 'translateZ(0)'
      imageElement.style.imageRendering = 'auto'
      
      // Prevent layout shift
      if (!imageElement.width && !imageElement.height) {
        imageElement.style.width = '100%'
        imageElement.style.height = 'auto'
        imageElement.style.aspectRatio = imageElement.getAttribute('data-aspect') || '16/9'
      }
      
      // Enhanced error handling
      imageElement.addEventListener('error', () => {
        handleImageError(imageElement)
      })
      
      imageElement.addEventListener('load', () => {
        if (imageElement === lcpElement) {
          setShowSkeleton(false)
        }
      })
    })
  }

  const optimizeVideosForLCP = (container: HTMLElement) => {
    if (!optimizeVideos) return

    const videos = container.querySelectorAll('video')
    videos.forEach((video, index) => {
      const videoElement = video as HTMLVideoElement
      
      if (priority === 'critical' && index === 0) {
        videoElement.preload = 'auto'
        videoElement.autoplay = true
        videoElement.muted = true
        videoElement.playsInline = true
        setLcpElement(videoElement)
        
        // Preload poster if exists
        if (videoElement.poster) {
          injectPreloadLink(videoElement.poster, 'image')
        }
      } else if (priority === 'high' && index < 2) {
        videoElement.preload = 'metadata'
      } else {
        videoElement.preload = 'none'
      }
      
      videoElement.style.contain = 'layout style paint'
      videoElement.style.transform = 'translateZ(0)'
      videoElement.style.objectFit = 'cover'
    })
  }

  const handleImageError = (img: HTMLImageElement) => {
    console.warn('LCP image failed to load:', img.src)
    
    // Try fallback
    const fallbackSrc = img.getAttribute('data-fallback')
    if (fallbackSrc && img.src !== fallbackSrc) {
      img.src = fallbackSrc
      return
    }
    
    // Show CSS fallback
    img.style.background = 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)'
    img.style.display = 'flex'
    img.style.alignItems = 'center'
    img.style.justifyContent = 'center'
    
    // Create fallback text
    const fallbackText = document.createElement('span')
    fallbackText.textContent = 'Image unavailable'
    fallbackText.style.color = '#999'
    fallbackText.style.fontSize = '14px'
    
    // Only append if not already there
    if (!img.querySelector('span')) {
      img.appendChild(fallbackText)
    }
  }

  const injectPreloadLink = (href: string, as: string, srcset?: string): void => {
    if (!href || href.startsWith('data:')) return
    
    const existing = document.querySelector(`link[rel="preload"][href="${href}"]`)
    if (existing) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    if (as === 'image' && srcset) {
      (link as any).imageSrcset = srcset
    }
    document.head.appendChild(link)
  }

  return (
    <div
      ref={containerRef}
      className={`lcp-optimizer ${isOptimized ? 'optimized' : ''} ${priority} ${isVisible ? 'visible' : 'hidden'} format-${detectedFormat}`}
      style={{
        contain: 'layout style paint',
        transform: 'translateZ(0)',
        position: 'relative',
        ...(priority === 'critical' && { contentVisibility: 'auto' }),
        ...(priority === 'low' && !isVisible && { contentVisibility: 'hidden' })
      }}
    >
      {enableSkeletonFallback && showSkeleton && skeletonFallback && (
        <div
          className="lcp-skeleton"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: lcpElement ? 0 : 1,
            transition: 'opacity 0.3s ease',
            pointerEvents: lcpElement ? 'none' : 'auto',
            zIndex: 1
          }}
        >
          {skeletonFallback}
        </div>
      )}
      <div
        className="lcp-content"
        style={{
          opacity: enableSkeletonFallback && showSkeleton ? (lcpElement ? 1 : 0) : 1,
          transition: 'opacity 0.3s ease'
        }}
      >
        {children}
      </div>
    </div>
  )
}

// =============================================================================
// ENHANCED LCP MONITORING
// =============================================================================

export const monitorLCP = (options?: {
  onLCP?: (metrics: LCPMetrics) => void
  onPoorLCP?: (metrics: LCPMetrics, recommendations: string[]) => void
  threshold?: number
  enableAttribution?: boolean
}): {
  getLCP: () => number
  getLCPElement: () => Element | null
  getLCPMetrics: () => LCPMetrics
  getAttribution: () => LCPAttribution | null
  observer: PerformanceObserver | null
} => {
  if (typeof window === 'undefined') {
    return {
      getLCP: () => 0,
      getLCPElement: () => null,
      getLCPMetrics: () => ({} as LCPMetrics),
      getAttribution: () => null,
      observer: null
    }
  }

  let lcpValue = 0
  let lcpElement: Element | null = null
  let lcpEntries: PerformanceEntry[] = []
  let currentAttribution: LCPAttribution | null = null
  
  const attributionAnalyzer = options?.enableAttribution ? new LCPAttributionAnalyzer() : null

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1] as any
    
    if (lastEntry.entryType === 'largest-contentful-paint') {
      lcpValue = lastEntry.startTime
      lcpElement = lastEntry.element
      lcpEntries.push(lastEntry)
      
      // Calculate attribution
      if (attributionAnalyzer) {
        currentAttribution = attributionAnalyzer.analyze(lastEntry)
      }
      
      const metrics: LCPMetrics = {
        lcp: lcpValue,
        lcpElement,
        lcpUrl: lastEntry.url || '',
        lcpSize: lastEntry.size || 0,
        renderTime: lastEntry.renderTime || 0,
        loadTime: lastEntry.loadTime || 0,
        entryType: lastEntry.entryType,
        networkType: getNetworkInfo().type,
        deviceMemory: (navigator as any).deviceMemory || 4,
        optimizationApplied: false
      }
      
      console.log('[LCP]', lcpValue + 'ms', lcpElement?.tagName || 'unknown')
      
      // Auto-optimize detected LCP element
      if (lcpElement) {
        optimizeLCPElement(lcpElement, { aggressive: lcpValue > 2500 })
        metrics.optimizationApplied = true
      }
      
      // Callbacks
      options?.onLCP?.(metrics)
      
      // Poor LCP detection
      const threshold = options?.threshold || 2500
      if (lcpValue > threshold) {
        const recommendations = currentAttribution 
          ? attributionAnalyzer!.getRecommendations(currentAttribution)
          : ['Consider optimizing the largest contentful element']
        
        console.warn('[LCP] Poor performance detected:', lcpValue + 'ms')
        recommendations.forEach(r => console.warn('[LCP Recommendation]', r))
        
        options?.onPoorLCP?.(metrics, recommendations)
      }
    }
  })

  observer.observe({ entryTypes: ['largest-contentful-paint'] })

  return {
    getLCP: () => lcpValue,
    getLCPElement: () => lcpElement,
    getLCPMetrics: () => ({
      lcp: lcpValue,
      lcpElement,
      lcpUrl: (lcpEntries[lcpEntries.length - 1] as any)?.url || '',
      lcpSize: (lcpEntries[lcpEntries.length - 1] as any)?.size || 0,
      renderTime: (lcpEntries[lcpEntries.length - 1] as any)?.renderTime || 0,
      loadTime: (lcpEntries[lcpEntries.length - 1] as any)?.loadTime || 0,
      entryType: 'largest-contentful-paint',
      networkType: getNetworkInfo().type,
      deviceMemory: (navigator as any).deviceMemory || 4,
      optimizationApplied: false
    }),
    getAttribution: () => currentAttribution,
    observer
  }
}

// =============================================================================
// ENHANCED LCP ELEMENT OPTIMIZATION
// =============================================================================

interface LCPOptimizeOptions {
  aggressive?: boolean
  injectPreload?: boolean
  addResourceHints?: boolean
}

export const optimizeLCPElement = (element: Element, options?: LCPOptimizeOptions) => {
  const htmlElement = element as HTMLElement
  const isAggressive = options?.aggressive ?? false
  
  // CSS containment and GPU acceleration
  htmlElement.style.contain = 'layout style paint'
  htmlElement.style.transform = 'translateZ(0)'
  htmlElement.style.willChange = isAggressive ? 'contents' : 'auto'
  
  if (htmlElement.tagName === 'IMG') {
    const img = htmlElement as HTMLImageElement
    img.loading = 'eager'
    img.decoding = 'sync'
    img.fetchPriority = 'high'
    img.style.imageRendering = 'auto'
    
    // Inject preload link
    if (options?.injectPreload !== false && img.src && !img.src.startsWith('data:')) {
      const existing = document.querySelector(`link[rel="preload"][href="${img.src}"]`)
      if (!existing) {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'image'
        link.href = img.src
        if (img.srcset) {
          (link as any).imageSrcset = img.srcset
        }
        document.head.appendChild(link)
      }
    }
    
    // Ensure proper dimensions to prevent CLS
    if (!img.width || !img.height) {
      img.style.width = '100%'
      img.style.height = 'auto'
    }
    
    // Aggressive: force sync decode
    if (isAggressive) {
      img.decode?.().catch(() => {})
    }
  }
  
  if (htmlElement.tagName === 'VIDEO') {
    const video = htmlElement as HTMLVideoElement
    video.preload = isAggressive ? 'auto' : 'metadata'
    video.style.objectFit = 'cover'
    video.style.contain = 'layout style paint'
    
    // Preload poster
    if (video.poster && options?.injectPreload !== false) {
      const existing = document.querySelector(`link[rel="preload"][href="${video.poster}"]`)
      if (!existing) {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'image'
        link.href = video.poster
        document.head.appendChild(link)
      }
    }
  }
  
  // Background images
  const styles = window.getComputedStyle(htmlElement)
  if (styles.backgroundImage && styles.backgroundImage !== 'none') {
    const urlMatch = styles.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)
    if (urlMatch && options?.injectPreload !== false) {
      const bgUrl = urlMatch[1]
      const existing = document.querySelector(`link[rel="preload"][href="${bgUrl}"]`)
      if (!existing) {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'image'
        link.href = bgUrl
        document.head.appendChild(link)
      }
    }
  }
}

// =============================================================================
// ENHANCED RESOURCE PRIORITIZATION
// =============================================================================

interface PrioritizeOptions {
  includeFonts?: boolean
  includeCriticalCSS?: boolean
  includeAboveFoldImages?: boolean
  customSelectors?: string[]
}

export const prioritizeResources = (options?: PrioritizeOptions) => {
  if (typeof window === 'undefined') return

  const opts = {
    includeFonts: true,
    includeCriticalCSS: true,
    includeAboveFoldImages: true,
    ...options
  }

  const criticalResources: string[] = [
    'script[src*="main"]',
    'script[src*="App"]',
    'link[href*="critical"]',
    'img[src*="logo"]',
    'img[alt*="logo"]'
  ]
  
  if (opts.customSelectors) {
    criticalResources.push(...opts.customSelectors)
  }
  
  criticalResources.forEach(selector => {
    const elements = document.querySelectorAll(selector)
    elements.forEach(element => {
      const htmlElement = element as HTMLElement
      
      if (htmlElement.tagName === 'SCRIPT') {
        const script = htmlElement as HTMLScriptElement
        // Only prioritize non-async, non-defer scripts
        if (!script.async && !script.defer) {
          // Already render-blocking, which is good for LCP
        }
      }
      
      if (htmlElement.tagName === 'LINK') {
        const link = htmlElement as HTMLLinkElement
        const href = link.getAttribute('href') || ''
        
        if (link.rel === 'stylesheet' && opts.includeCriticalCSS) {
          // Convert to preload with onload handler
          const preloadLink = document.createElement('link')
          preloadLink.rel = 'preload'
          preloadLink.as = 'style'
          preloadLink.href = href
          preloadLink.onload = function() {
            (this as HTMLLinkElement).rel = 'stylesheet'
          }
          document.head.appendChild(preloadLink)
        }
      }
      
      if (htmlElement.tagName === 'IMG') {
        const img = htmlElement as HTMLImageElement
        const rect = img.getBoundingClientRect()
        
        // Only prioritize above-fold images
        if (opts.includeAboveFoldImages && rect.top < window.innerHeight) {
          img.loading = 'eager'
          img.decoding = 'sync'
          img.fetchPriority = 'high'
        }
      }
    })
  })

  // Font prioritization
  if (opts.includeFonts) {
    document.querySelectorAll('link[rel="stylesheet"][href*="fonts"]').forEach(link => {
      const href = (link as HTMLLinkElement).href
      const preloadLink = document.createElement('link')
      preloadLink.rel = 'preload'
      preloadLink.as = 'style'
      preloadLink.href = href
      document.head.insertBefore(preloadLink, document.head.firstChild)
    })
  }
}

// =============================================================================
// ENHANCED PRELOAD MANAGER
// =============================================================================

interface PreloadConfig {
  href: string
  as: 'script' | 'style' | 'image' | 'font' | 'fetch' | 'document'
  type?: string
  crossorigin?: boolean
  media?: string
  importance?: 'high' | 'low' | 'auto'
}

export const preloadCriticalResources = (customResources?: PreloadConfig[]) => {
  const defaultResources: PreloadConfig[] = [
    { href: '/src/main.tsx', as: 'script', type: 'module', importance: 'high' },
    { href: '/src/App.tsx', as: 'script', type: 'module', importance: 'high' },
    { href: '/src/components/DashboardHeader/DashboardHeader.tsx', as: 'script', type: 'module' },
    { href: '/src/assets/Logo-1 (1).png', as: 'image', importance: 'high' }
  ]
  
  const resources = customResources || defaultResources
  
  resources.forEach(resource => {
    // Skip if already preloaded
    const existing = document.querySelector(`link[rel="preload"][href="${resource.href}"]`)
    if (existing) return
    
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource.href
    link.as = resource.as
    
    if (resource.type) {
      (link as any).type = resource.type
    }
    
    if (resource.crossorigin || resource.as === 'font') {
      link.crossOrigin = 'anonymous'
    }
    
    if (resource.media) {
      link.media = resource.media
    }
    
    if (resource.importance) {
      (link as any).importance = resource.importance
    }
    
    document.head.appendChild(link)
  })
}

// Batch preload utility for dynamic content
export const batchPreload = (
  urls: string[],
  type: 'image' | 'script' | 'style' = 'image',
  options?: { delay?: number; batchSize?: number }
): () => void => {
  const { delay = 100, batchSize = 3 } = options || {}
  const controller = new AbortController()
  let index = 0
  
  const preloadNextBatch = () => {
    if (controller.signal.aborted) return
    
    const batch = urls.slice(index, index + batchSize)
    index += batchSize
    
    batch.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = type
      link.href = url
      document.head.appendChild(link)
    })
    
    if (index < urls.length) {
      setTimeout(preloadNextBatch, delay)
    }
  }
  
  // Start preloading when idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(preloadNextBatch, { timeout: 2000 })
  } else {
    setTimeout(preloadNextBatch, delay)
  }
  
  // Return cancel function
  return () => controller.abort()
}

// =============================================================================
// PREDICTIVE LCP PRELOADER
// =============================================================================

export const predictivePreload = (container?: HTMLElement): (() => void) => {
  const target = container || document.body
  const detector = new PredictiveLCPDetector()
  const cancelFns: (() => void)[] = []
  
  detector.startMonitoring(target, (candidate) => {
    // Pre-optimize detected candidate
    optimizeLCPElement(candidate, { injectPreload: true })
    
    // Preload associated resources
    if (candidate.tagName === 'IMG') {
      const img = candidate as HTMLImageElement
      if (img.srcset) {
        const sources = img.srcset.split(',').map(s => s.trim().split(' ')[0])
        const cancel = batchPreload(sources, 'image', { batchSize: 2 })
        cancelFns.push(cancel)
      }
    }
  })
  
  return () => {
    detector.stop()
    cancelFns.forEach(fn => fn())
  }
}

// =============================================================================
// COMPOSITE OPTIMIZATION
// =============================================================================

export const runAllLCPOptimizations = (options?: {
  monitor?: boolean
  prioritize?: boolean
  preload?: boolean
  predictive?: boolean
  threshold?: number
  onPoorLCP?: (metrics: LCPMetrics, recommendations: string[]) => void
}): { cleanup: () => void } => {
  
  // Start monitoring
  let monitorInstance: ReturnType<typeof monitorLCP> | null = null
  if (options?.monitor !== false) {
    monitorInstance = monitorLCP({
      threshold: options?.threshold,
      onPoorLCP: options?.onPoorLCP,
      enableAttribution: true
    })
  }
  
  // Prioritize resources
  if (options?.prioritize !== false) {
    prioritizeResources({
      includeAboveFoldImages: true,
      includeCriticalCSS: true
    })
  }
  
  // Preload critical resources
  if (options?.preload !== false) {
    preloadCriticalResources()
  }
  
  // Start predictive loading
  let predictiveCleanup: (() => void) | null = null
  if (options?.predictive !== false) {
    predictiveCleanup = predictivePreload()
  }
  
  return {
    cleanup: () => {
      monitorInstance?.observer?.disconnect()
      predictiveCleanup?.()
    }
  }
}

export default LCPOptimizer
