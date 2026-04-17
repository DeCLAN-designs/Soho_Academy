import { useState, useEffect, useRef, useCallback } from 'react'

interface UseLazyLoadOptions {
  rootMargin?: string
  threshold?: number
  triggerOnce?: boolean
}

export const useLazyLoad = (options: UseLazyLoadOptions = {}) => {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    triggerOnce = true
  } = options

  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    
    if (entry.isIntersecting) {
      setIsIntersecting(true)
      setHasIntersected(true)
      
      if (triggerOnce) {
        observerRef.current?.disconnect()
      }
    } else if (!triggerOnce) {
      setIsIntersecting(false)
    }
  }, [triggerOnce])

  useEffect(() => {
    if (!elementRef.current) return

    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold
    })

    observerRef.current.observe(elementRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [rootMargin, threshold, handleIntersection])

  const setElement = useCallback((element: HTMLElement | null) => {
    elementRef.current = element
  }, [])

  return {
    isIntersecting: triggerOnce ? hasIntersected : isIntersecting,
    setElement,
    hasIntersected
  }
}

// Lazy loading utility for images
export const useLazyImage = (src: string, options: UseLazyLoadOptions = {}) => {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const { isIntersecting, setElement } = useLazyLoad(options)

  useEffect(() => {
    if (!isIntersecting || !src) return

    const img = new Image()
    img.src = src
    
    img.onload = () => {
      setImageSrc(src)
      setIsLoading(false)
      setHasError(false)
    }
    
    img.onerror = () => {
      setIsLoading(false)
      setHasError(true)
    }
  }, [isIntersecting, src])

  return {
    imageSrc,
    isLoading,
    hasError,
    setElement,
    isIntersecting
  }
}
