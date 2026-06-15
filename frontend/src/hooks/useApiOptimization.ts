import { useState, useEffect, useCallback, useRef } from 'react'

interface ApiCache<T> {
  data: T
  timestamp: number
  ttl: number
}

interface UseApiOptimizationOptions {
  cacheTTL?: number // Time to live in milliseconds
  retryAttempts?: number
  retryDelay?: number
  enableCache?: boolean
}

interface UseApiOptimizationReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  execute: (...args: any[]) => Promise<T>
  invalidateCache: () => void
  refetch: () => void
}

const cache = new Map<string, ApiCache<any>>()

export const useApiOptimization = <T>(
  apiFunction: (...args: any[]) => Promise<T>,
  cacheKey: string,
  options: UseApiOptimizationOptions = {}
): UseApiOptimizationReturn<T> => {
  const {
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    retryAttempts = 3,
    retryDelay = 1000,
    enableCache = true
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastArgsRef = useRef<any[]>([])

  const getCachedData = useCallback((): T | null => {
    if (!enableCache) return null
    
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    
    if (cached) {
      cache.delete(cacheKey)
    }
    
    return null
  }, [cacheKey, enableCache])

  const setCachedData = useCallback((newData: T) => {
    if (!enableCache) return
    
    cache.set(cacheKey, {
      data: newData,
      timestamp: Date.now(),
      ttl: cacheTTL
    })
  }, [cacheKey, cacheTTL, enableCache])

  const execute = useCallback(async (...args: any[]): Promise<T> => {
    lastArgsRef.current = args
    
    // Check cache first
    const cachedData = getCachedData()
    if (cachedData) {
      setData(cachedData)
      return cachedData
    }

    setLoading(true)
    setError(null)

    let lastError: Error | null = null

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        const result = await apiFunction(...args)
        setData(result)
        setCachedData(result)
        return result
      } catch (err) {
        lastError = err as Error
        
        if (attempt < retryAttempts - 1) {
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          )
        }
      }
    }

    const errorMessage = lastError?.message || 'An error occurred'
    setError(errorMessage)
    throw lastError || new Error(errorMessage)
  }, [apiFunction, getCachedData, setCachedData, retryAttempts, retryDelay])

  const invalidateCache = useCallback(() => {
    cache.delete(cacheKey)
  }, [cacheKey])

  const refetch = useCallback(() => {
    return execute(...lastArgsRef.current)
  }, [execute])

  // Auto-execute on mount if no cached data
  useEffect(() => {
    const cachedData = getCachedData()
    if (cachedData) {
      setData(cachedData)
    } else if (lastArgsRef.current.length > 0) {
      execute(...lastArgsRef.current)
    }
  }, [])

  return {
    data,
    loading,
    error,
    execute,
    invalidateCache,
    refetch
  }
}

// Debounced API call hook
export const useDebouncedApi = <T>(
  apiFunction: (...args: any[]) => Promise<T>,
  delay: number = 300
) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)

  const execute = useCallback((...args: any[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    setLoading(true)
    setError(null)

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await apiFunction(...args)
        setData(result)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }, delay)
  }, [apiFunction, delay])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return { data, loading, error, execute }
}

// Request batching utility
export class ApiBatcher {
  private static instance: ApiBatcher
  private batchQueue: Map<string, {
    requests: Array<{
      resolve: (value: any) => void
      reject: (error: any) => void
      args: any[]
    }>
    timeout: number
  }> = new Map()

  static getInstance(): ApiBatcher {
    if (!ApiBatcher.instance) {
      ApiBatcher.instance = new ApiBatcher()
    }
    return ApiBatcher.instance
  }

  batch<T>(
    key: string,
    apiFunction: (...args: any[]) => Promise<T>,
    args: any[],
    batchDelay: number = 50
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(key)) {
        this.batchQueue.set(key, {
          requests: [],
          timeout: setTimeout(() => this.flushBatch(key, apiFunction), batchDelay)
        })
      }

      const batch = this.batchQueue.get(key)!
      batch.requests.push({ resolve, reject, args })
    })
  }

  private async flushBatch<T>(key: string, apiFunction: (...args: any[]) => Promise<T>) {
    const batch = this.batchQueue.get(key)
    if (!batch) return

    this.batchQueue.delete(key)

    try {
      // For now, execute the first request. In a real implementation,
      // you might want to batch multiple requests into a single API call
      const firstRequest = batch.requests[0]
      const result = await apiFunction(...firstRequest.args)
      
      // Resolve all requests with the same result
      batch.requests.forEach(({ resolve }) => resolve(result))
    } catch (error) {
      // Reject all requests
      batch.requests.forEach(({ reject }) => reject(error))
    }
  }
}
