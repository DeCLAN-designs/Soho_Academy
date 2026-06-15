import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface SpeedIndexOptimizerProps {
  children: React.ReactNode
  priority?: 'critical' | 'high' | 'medium' | 'low'
  enableProgressiveRendering?: boolean
  enablePredictiveLoading?: boolean
  enableNetworkAdaptation?: boolean
  enableMemoryPressureHandling?: boolean
  renderStrategy?: 'interleaved' | 'sequential' | 'parallel' | 'content-aware'
  skeletonFallback?: React.ReactNode
  onSpeedIndexCalculated?: (score: number, metrics: SpeedIndexMetrics) => void
  onRenderPhaseChange?: (phase: RenderPhase) => void
}

interface SpeedIndexMetrics {
  score: number
  fcp: number
  fmp: number
  visualProgress: VisualProgressPoint[]
  networkType: string
  deviceMemory: number
  connectionSpeed: string
  optimizationLevel: string
}

interface VisualProgressPoint {
  timestamp: number
  progress: number
  type: 'fcp' | 'fmp' | 'lcp' | 'custom'
  element?: Element
}

type RenderPhase = 'idle' | 'predicting' | 'critical' | 'important' | 'secondary' | 'deferred' | 'complete'
type NetworkType = '4g' | '3g' | '2g' | 'slow-2g' | 'offline' | 'unknown'
type DeviceClass = 'high-end' | 'mid-range' | 'low-end' | 'unknown'

// =============================================================================
// NETWORK & DEVICE DETECTION
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

const getDeviceClass = (): DeviceClass => {
  const memory = (navigator as any).deviceMemory || 4
  const cores = navigator.hardwareConcurrency || 4
  
  if (memory >= 8 && cores >= 8) return 'high-end'
  if (memory >= 4 && cores >= 4) return 'mid-range'
  return 'low-end'
}

// =============================================================================
// PREDICTIVE RENDERING ENGINE
// =============================================================================

class PredictiveRenderEngine {
  private renderQueue: HTMLElement[] = []
  private isProcessing = false
  private networkType: NetworkType = 'unknown'
  private deviceClass: DeviceClass = 'unknown'
  private abortController: AbortController | null = null

  constructor() {
    this.updateContext()
    this.setupNetworkListener()
  }

  private updateContext() {
    const network = getNetworkInfo()
    this.networkType = network.type as NetworkType
    this.deviceClass = getDeviceClass()
  }

  private setupNetworkListener() {
    const nav = navigator as any
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection
    
    if (connection) {
      connection.addEventListener('change', () => this.updateContext())
    }
  }

  getOptimalBatchSize(): number {
    const sizes: Record<DeviceClass, number> = {
      'high-end': 8,
      'mid-range': 5,
      'low-end': 3,
      'unknown': 4
    }
    return sizes[this.deviceClass]
  }

  getRenderDelay(): number {
    const delays: Record<NetworkType, number> = {
      '4g': 16, // ~60fps
      '3g': 50,
      '2g': 100,
      'slow-2g': 200,
      'offline': 0,
      'unknown': 32
    }
    return delays[this.networkType]
  }

  predictCriticalElements(container: HTMLElement): HTMLElement[] {
    const allElements = Array.from(container.querySelectorAll('*')) as HTMLElement[]
    
    return allElements
      .map(el => ({
        element: el,
        score: this.calculateCriticalityScore(el)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.element)
  }

  private calculateCriticalityScore(element: HTMLElement): number {
    let score = 0
    const rect = element.getBoundingClientRect()
    
    // Above-fold content is more critical
    if (rect.top < window.innerHeight) score += 50
    if (rect.top < window.innerHeight / 2) score += 30
    
    // Text content is critical for Speed Index
    if (element.textContent && element.textContent.trim().length > 20) score += 20
    
    // Images in viewport
    if (element.tagName === 'IMG' && rect.top < window.innerHeight) score += 40
    
    // Headings are important
    if (/^H[1-6]$/.test(element.tagName)) score += 25
    
    // Visible elements
    const styles = window.getComputedStyle(element)
    if (styles.display !== 'none' && styles.visibility !== 'hidden') score += 10
    
    // Size bonus (larger elements contribute more to visual progress)
    const area = rect.width * rect.height
    if (area > 10000) score += 15
    
    return score
  }

  async processQueue(
    callback: (element: HTMLElement, phase: RenderPhase) => void
  ): Promise<void> {
    if (this.isProcessing || this.renderQueue.length === 0) return
    
    this.isProcessing = true
    this.abortController = new AbortController()
    const batchSize = this.getOptimalBatchSize()
    const delay = this.getRenderDelay()

    const phases: RenderPhase[] = ['critical', 'important', 'secondary', 'deferred']
    
    for (let i = 0; i < this.renderQueue.length; i += batchSize) {
      if (this.abortController.signal.aborted) break
      
      const batch = this.renderQueue.slice(i, i + batchSize)
      const phase = phases[Math.min(Math.floor(i / batchSize), phases.length - 1)]
      
      await this.renderBatch(batch, phase, delay, callback)
    }
    
    this.isProcessing = false
    this.renderQueue = []
  }

  private renderBatch(
    batch: HTMLElement[],
    phase: RenderPhase,
    delay: number,
    callback: (element: HTMLElement, phase: RenderPhase) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        batch.forEach((element, index) => {
          setTimeout(() => {
            callback(element, phase)
          }, index * Math.max(delay / batch.length, 8))
        })
        
        setTimeout(resolve, delay)
      })
    })
  }

  abort(): void {
    this.abortController?.abort()
    this.isProcessing = false
  }

  enqueue(elements: HTMLElement[]): void {
    this.renderQueue.push(...elements)
  }
}

// =============================================================================
// VISUAL PROGRESS CALCULATOR
// =============================================================================

class VisualProgressCalculator {
  private paintEntries: PerformanceEntry[] = []
  private lcpEntries: PerformanceEntry[] = []
  private observer: PerformanceObserver | null = null

  start(): void {
    if (typeof window === 'undefined') return
    
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (entry.entryType === 'paint') {
          this.paintEntries.push(entry)
        } else if (entry.entryType === 'largest-contentful-paint') {
          this.lcpEntries.push(entry)
        }
      })
    })
    
    this.observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] })
  }

  stop(): void {
    this.observer?.disconnect()
  }

  calculateSpeedIndex(): { score: number; visualProgress: VisualProgressPoint[] } {
    const fcp = this.paintEntries.find(e => e.name === 'first-contentful-paint')
    const fmp = this.paintEntries.find(e => e.name === 'first-meaningful-paint')
    
    if (!fcp) return { score: 0, visualProgress: [] }
    
    const visualProgress: VisualProgressPoint[] = [
      { timestamp: 0, progress: 0, type: 'fcp' },
      { timestamp: fcp.startTime, progress: 20, type: 'fcp' }
    ]
    
    if (fmp) {
      visualProgress.push({
        timestamp: fmp.startTime,
        progress: 60,
        type: 'fmp'
      })
    }
    
    // Add LCP point
    const lastLCP = this.lcpEntries[this.lcpEntries.length - 1]
    if (lastLCP) {
      visualProgress.push({
        timestamp: lastLCP.startTime,
        progress: 90,
        type: 'lcp',
        element: (lastLCP as any).element
      })
    }
    
    // Calculate Speed Index using visual progress
    let speedIndex = 0
    for (let i = 1; i < visualProgress.length; i++) {
      const current = visualProgress[i]
      const previous = visualProgress[i - 1]
      const progressDiff = current.progress - previous.progress
      const timeDiff = current.timestamp - previous.timestamp
      speedIndex += progressDiff * (previous.timestamp + timeDiff / 2) / 100
    }
    
    return { score: Math.round(speedIndex), visualProgress }
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const SpeedIndexOptimizer: React.FC<SpeedIndexOptimizerProps> = ({
  children,
  priority = 'medium',
  enableProgressiveRendering = true,
  enablePredictiveLoading = true,
  enableNetworkAdaptation = true,
  enableMemoryPressureHandling = true,
  renderStrategy = 'content-aware',
  skeletonFallback,
  onSpeedIndexCalculated,
  onRenderPhaseChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderPhase, setRenderPhase] = useState<RenderPhase>('idle')
  const [isOptimized, setIsOptimized] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [criticalElementsReady, setCriticalElementsReady] = useState(false)
  
  const renderEngine = useMemo(() => new PredictiveRenderEngine(), [])
  const visualCalculator = useMemo(() => new VisualProgressCalculator(), [])
  const phaseRef = useRef<RenderPhase>('idle')

  const updatePhase = useCallback((phase: RenderPhase) => {
    phaseRef.current = phase
    setRenderPhase(phase)
    onRenderPhaseChange?.(phase)
  }, [onRenderPhaseChange])

  // Network adaptation
  useEffect(() => {
    if (!enableNetworkAdaptation) return
    
    const nav = navigator as any
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection
    
    const handleNetworkChange = () => {
      const info = getNetworkInfo()
      
      // Adjust rendering based on network
      if (info.saveData) {
        updatePhase('deferred')
      } else if (info.type === '2g' || info.type === 'slow-2g') {
        updatePhase('secondary')
      }
    }
    
    if (connection) {
      connection.addEventListener('change', handleNetworkChange)
      return () => connection.removeEventListener('change', handleNetworkChange)
    }
  }, [enableNetworkAdaptation, updatePhase])

  // Memory pressure handling
  useEffect(() => {
    if (!enableMemoryPressureHandling) return
    
    const handleMemoryPressure = () => {
      const memory = (navigator as any).deviceMemory || 4
      
      if (memory < 2) {
        // Low memory - defer non-critical rendering
        updatePhase('deferred')
        
        // Clear any pending animations
        if (containerRef.current) {
          containerRef.current.style.willChange = 'auto'
        }
      }
    }
    
    // Check memory on mount and periodically
    handleMemoryPressure()
    const interval = setInterval(handleMemoryPressure, 5000)
    
    return () => clearInterval(interval)
  }, [enableMemoryPressureHandling, updatePhase])

  // Main optimization effect
  useEffect(() => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    
    // Start visual progress tracking
    visualCalculator.start()
    
    // Predictive loading
    if (enablePredictiveLoading) {
      updatePhase('predicting')
      const criticalElements = renderEngine.predictCriticalElements(container)
      renderEngine.enqueue(criticalElements)
    }
    
    // Setup intersection observer with dynamic rootMargin based on network
    const networkInfo = getNetworkInfo()
    const rootMargin = networkInfo.type === '4g' ? '200px' : '100px'
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            optimizeElement(target)
            
            if (entry.intersectionRatio > 0.5) {
              setCriticalElementsReady(true)
            }
          }
        })
      },
      { rootMargin, threshold: [0, 0.25, 0.5, 0.75, 1] }
    )
    
    observer.observe(container)
    
    // Progressive rendering with strategy selection
    if (enableProgressiveRendering) {
      startProgressiveRendering(container)
    }
    
    // Hide skeleton when content is ready
    const skeletonTimer = setTimeout(() => {
      setShowSkeleton(false)
    }, 100)
    
    return () => {
      observer.disconnect()
      visualCalculator.stop()
      renderEngine.abort()
      clearTimeout(skeletonTimer)
    }
  }, [
    enablePredictiveLoading,
    enableProgressiveRendering,
    renderStrategy,
    renderEngine,
    visualCalculator,
    updatePhase
  ])

  const startProgressiveRendering = async (container: HTMLElement) => {
    updatePhase('critical')
    
    const children = Array.from(container.children) as HTMLElement[]
    
    switch (renderStrategy) {
      case 'sequential':
        await renderSequentially(children)
        break
      case 'parallel':
        renderInParallel(children)
        break
      case 'interleaved':
        await renderInterleaved(children)
        break
      case 'content-aware':
      default:
        await renderContentAware(children)
        break
    }
    
    // Calculate final Speed Index
    const { score, visualProgress } = visualCalculator.calculateSpeedIndex()
    
    const metrics: SpeedIndexMetrics = {
      score,
      fcp: visualProgress.find(p => p.type === 'fcp')?.timestamp || 0,
      fmp: visualProgress.find(p => p.type === 'fmp')?.timestamp || 0,
      visualProgress,
      networkType: getNetworkInfo().type,
      deviceMemory: (navigator as any).deviceMemory || 4,
      connectionSpeed: getNetworkInfo().downlink + ' Mbps',
      optimizationLevel: priority
    }
    
    updatePhase('complete')
    onSpeedIndexCalculated?.(score, metrics)
    setIsOptimized(true)
  }

  const renderSequentially = async (elements: HTMLElement[]): Promise<void> => {
    for (let i = 0; i < elements.length; i++) {
      const phase = getPhaseForIndex(i, elements.length)
      if (phase !== phaseRef.current) {
        updatePhase(phase)
      }
      
      await fadeInElement(elements[i])
      
      // Yield to main thread
      if (i % 3 === 0) {
        await new Promise(resolve => requestAnimationFrame(resolve))
      }
    }
  }

  const renderInParallel = (elements: HTMLElement[]): void => {
    updatePhase('critical')
    
    elements.forEach((element, index) => {
      setTimeout(() => {
        fadeInElement(element)
      }, index * 16) // 60fps stagger
    })
    
    updatePhase('complete')
  }

  const renderInterleaved = async (elements: HTMLElement[]): Promise<void> => {
    // Split into critical and non-critical
    const critical = elements.slice(0, Math.ceil(elements.length * 0.3))
    const nonCritical = elements.slice(Math.ceil(elements.length * 0.3))
    
    updatePhase('critical')
    await Promise.all(critical.map(el => fadeInElement(el)))
    
    updatePhase('secondary')
    for (let i = 0; i < nonCritical.length; i++) {
      await fadeInElement(nonCritical[i])
      if (i % 2 === 0) {
        await new Promise(resolve => setTimeout(resolve, 8))
      }
    }
  }

  const renderContentAware = async (elements: HTMLElement[]): Promise<void> => {
    // Sort by criticality score
    const scored = elements.map(el => ({
      element: el,
      score: calculateContentScore(el)
    })).sort((a, b) => b.score - a.score)
    
    // Render in phases based on score
    const critical = scored.filter(s => s.score > 70).map(s => s.element)
    const important = scored.filter(s => s.score > 40 && s.score <= 70).map(s => s.element)
    const secondary = scored.filter(s => s.score <= 40).map(s => s.element)
    
    // Render critical immediately
    updatePhase('critical')
    await Promise.all(critical.map(el => fadeInElement(el, 0)))
    setCriticalElementsReady(true)
    
    // Render important with small delay
    updatePhase('important')
    await new Promise(resolve => setTimeout(resolve, 50))
    await Promise.all(important.map((el, i) => fadeInElement(el, i * 20)))
    
    // Defer secondary
    updatePhase('secondary')
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        secondary.forEach((el, i) => fadeInElement(el, i * 30))
      }, { timeout: 500 })
    } else {
      secondary.forEach((el, i) => fadeInElement(el, i * 30))
    }
  }

  const calculateContentScore = (element: HTMLElement): number => {
    let score = 0
    const rect = element.getBoundingClientRect()
    
    // Above the fold
    if (rect.top < window.innerHeight) score += 40
    if (rect.top < window.innerHeight / 2) score += 20
    
    // Has meaningful content
    const textLength = element.textContent?.length || 0
    if (textLength > 50) score += 20
    if (textLength > 200) score += 15
    
    // Is image
    if (element.tagName === 'IMG') score += 25
    
    // Is heading
    if (/^H[1-3]$/.test(element.tagName)) score += 30
    if (/^H[4-6]$/.test(element.tagName)) score += 15
    
    // Visible area
    const area = rect.width * rect.height
    if (area > 50000) score += 20
    else if (area > 10000) score += 10
    
    return score
  }

  const getPhaseForIndex = (index: number, total: number): RenderPhase => {
    const ratio = index / total
    if (ratio < 0.2) return 'critical'
    if (ratio < 0.5) return 'important'
    if (ratio < 0.8) return 'secondary'
    return 'deferred'
  }

  const fadeInElement = (element: HTMLElement, delay = 0): Promise<void> => {
    return new Promise((resolve) => {
      // Initial state
      element.style.opacity = '0'
      element.style.transform = 'translateY(15px) scale(0.98)'
      element.style.transition = 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      
      setTimeout(() => {
        requestAnimationFrame(() => {
          element.style.opacity = '1'
          element.style.transform = 'translateY(0) scale(1)'
          
          setTimeout(resolve, 400)
        })
      }, delay)
    })
  }

  const optimizeElement = (element: HTMLElement) => {
    // Apply CSS containment
    element.style.contain = 'layout style paint'
    
    // GPU acceleration with priority-based will-change
    element.style.transform = 'translateZ(0)'
    element.style.willChange = priority === 'critical' ? 'transform, opacity' : 'auto'
    
    // Content visibility for off-screen content
    const rect = element.getBoundingClientRect()
    if (rect.top > window.innerHeight * 1.5) {
      element.style.contentVisibility = 'auto'
      element.style.containIntrinsicSize = '0 500px'
    }
    
    // Optimize images within
    const images = element.querySelectorAll('img')
    images.forEach((img, index) => {
      const imageElement = img as HTMLImageElement
      
      if (priority === 'critical' && index === 0) {
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
      
      // Prevent layout shift
      if (!imageElement.width && !imageElement.height) {
        imageElement.style.width = '100%'
        imageElement.style.height = 'auto'
      }
    })
  }

  return (
    <div
      ref={containerRef}
      className={`speed-index-optimizer ${isOptimized ? 'optimized' : ''} phase-${renderPhase} priority-${priority}`}
      style={{
        contain: 'layout style paint',
        transform: 'translateZ(0)',
        opacity: renderPhase === 'idle' ? 0.98 : 1,
        transition: 'opacity 0.15s ease'
      }}
    >
      {showSkeleton && skeletonFallback && (
        <div 
          className="skeleton-fallback"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: criticalElementsReady ? 0 : 1,
            transition: 'opacity 0.3s ease',
            pointerEvents: criticalElementsReady ? 'none' : 'auto'
          }}
        >
          {skeletonFallback}
        </div>
      )}
      <div 
        className="content-wrapper"
        style={{
          opacity: showSkeleton && skeletonFallback ? (criticalElementsReady ? 1 : 0) : 1,
          transition: 'opacity 0.3s ease'
        }}
      >
        {children}
      </div>
    </div>
  )
}

// =============================================================================
// ENHANCED MONITORING UTILITIES
// =============================================================================

export const monitorSpeedIndex = (options?: {
  onUpdate?: (metrics: SpeedIndexMetrics) => void
  sampleInterval?: number
}): {
  getSpeedIndex: () => number
  getVisualProgress: () => VisualProgressPoint[]
  getMetrics: () => SpeedIndexMetrics
  observer: PerformanceObserver | null
} => {
  if (typeof window === 'undefined') {
    return {
      getSpeedIndex: () => 0,
      getVisualProgress: () => [],
      getMetrics: () => ({} as SpeedIndexMetrics),
      observer: null
    }
  }

  let speedIndexScore = 0
  let visualProgress: VisualProgressPoint[] = []
  let paintEntries: PerformanceEntry[] = []
  let lcpEntries: PerformanceEntry[] = []

  const calculator = new VisualProgressCalculator()
  calculator.start()

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    
    entries.forEach((entry) => {
      if (entry.entryType === 'paint') {
        paintEntries.push(entry)
      } else if (entry.entryType === 'largest-contentful-paint') {
        lcpEntries.push(entry)
      }
    })
    
    // Recalculate Speed Index
    const result = calculator.calculateSpeedIndex()
    speedIndexScore = result.score
    visualProgress = result.visualProgress
    
    const metrics: SpeedIndexMetrics = {
      score: speedIndexScore,
      fcp: visualProgress.find(p => p.type === 'fcp')?.timestamp || 0,
      fmp: visualProgress.find(p => p.type === 'fmp')?.timestamp || 0,
      visualProgress,
      networkType: getNetworkInfo().type,
      deviceMemory: (navigator as any).deviceMemory || 4,
      connectionSpeed: getNetworkInfo().downlink + ' Mbps',
      optimizationLevel: 'enhanced'
    }
    
    options?.onUpdate?.(metrics)
    
    if (import.meta.env.PROD) {
      // Analytics tracking
      if (speedIndexScore > 3400) {
        console.warn('[Speed Index] Poor performance detected:', speedIndexScore + 'ms')
      }
    }
  })

  observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] })

  return {
    getSpeedIndex: () => speedIndexScore,
    getVisualProgress: () => visualProgress,
    getMetrics: () => ({
      score: speedIndexScore,
      fcp: visualProgress.find(p => p.type === 'fcp')?.timestamp || 0,
      fmp: visualProgress.find(p => p.type === 'fmp')?.timestamp || 0,
      visualProgress,
      networkType: getNetworkInfo().type,
      deviceMemory: (navigator as any).deviceMemory || 4,
      connectionSpeed: getNetworkInfo().downlink + ' Mbps',
      optimizationLevel: 'enhanced'
    }),
    observer
  }
}

export const optimizeLCP = (options?: {
  aggressive?: boolean
  targetSelector?: string
  injectPreload?: boolean
}): MutationObserver | null => {
  if (typeof window === 'undefined') return null

  const optimizeElement = (element: Element) => {
    const htmlElement = element as HTMLElement
    
    // CSS containment
    htmlElement.style.contain = 'layout style paint'
    htmlElement.style.transform = 'translateZ(0)'
    htmlElement.style.willChange = options?.aggressive ? 'contents' : 'auto'
    
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement
      img.loading = 'eager'
      img.decoding = 'sync'
      img.fetchPriority = 'high'
      
      // Preload hint (respect injectPreload option)
      if (options?.injectPreload !== false && img.src && !document.querySelector(`link[rel="preload"][href="${img.src}"]`)) {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'image'
        link.href = img.src
        if (img.srcset) {
          link.imageSrcset = img.srcset
        }
        document.head.appendChild(link)
      }
    }
    
    if (element.tagName === 'VIDEO') {
      const video = element as HTMLVideoElement
      video.preload = options?.aggressive ? 'auto' : 'metadata'
      video.style.contain = 'layout style paint'
    }
  }

  // Optimize existing elements
  const selector = options?.targetSelector || 'img, video'
  document.querySelectorAll(selector).forEach(optimizeElement)

  // Watch for new elements
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          if (['IMG', 'VIDEO', 'CANVAS', 'PICTURE'].includes(element.tagName)) {
            optimizeElement(element)
          }
          // Optimize nested media
          element.querySelectorAll?.('img, video, canvas, picture').forEach(optimizeElement)
        }
      })
    })
  })

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  })

  return mutationObserver
}

export const enableProgressiveRendering = (
  container: HTMLElement,
  options?: {
    strategy?: 'interleaved' | 'sequential' | 'parallel'
    batchSize?: number
    delay?: number
  }
): Promise<void> => {
  const children = Array.from(container.children) as HTMLElement[]
  const delay = options?.delay || 50
  
  const engine = new PredictiveRenderEngine()
  engine.enqueue(children)
  
  return new Promise((resolve) => {
    engine.processQueue((element, phase) => {
      element.style.opacity = '0'
      element.style.transform = 'translateY(10px)'
      element.style.transition = `opacity ${delay}ms ease, transform ${delay}ms ease`
      
      requestAnimationFrame(() => {
        element.style.opacity = '1'
        element.style.transform = 'translateY(0)'
      })
      
      if (phase === 'deferred') {
        resolve()
      }
    })
  })
}

export default SpeedIndexOptimizer
