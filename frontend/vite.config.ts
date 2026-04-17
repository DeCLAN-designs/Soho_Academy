import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:5000'
  const isProduction = mode === 'production'

  return {
    plugins: [
      react({
        // Optimize React builds
        jsxImportSource: isProduction ? undefined : 'react',
        // Enable concurrent features for better performance
        jsxRuntime: 'automatic',
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@contexts': resolve(__dirname, 'src/contexts'),
        '@lib': resolve(__dirname, 'src/lib'),
        '@assets': resolve(__dirname, 'src/assets'),
      },
    },
    build: {
      // Enable source maps for debugging in production
      sourcemap: isProduction ? 'hidden' : true,
      // Optimize chunk splitting for better TBT and LCP
      rollupOptions: {
        output: {
          // Enhanced manual chunks for optimal loading
          manualChunks: (id) => {
            // Separate vendor chunks for better caching and TBT
            if (id.includes('node_modules')) {
              // React ecosystem - critical for LCP
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react'
              }
              // Utility libraries
              if (id.includes('axios') || id.includes('date-fns') || id.includes('lodash')) {
                return 'vendor-utils'
              }
              // Other third-party libraries
              return 'vendor-external'
            }
            
            // Dashboard components - load on demand (excluding auth to avoid circular dependency)
            if (id.includes('/Dashboard/BusAssistantDashboard') || 
                id.includes('/Dashboard/DriverDashboard') ||
                id.includes('/Dashboard/SchoolAdminDashboard') ||
                id.includes('/Dashboard/ParentDashboard')) {
              return 'dashboard'
            }
            
            // API layer - could block main thread
            if (id.includes('/lib/api')) {
              return 'api'
            }
            
            // Performance components - load early for monitoring
            if (id.includes('/components/OptimizedImage') || 
                id.includes('/components/AsyncComponent') ||
                id.includes('/components/LayoutStabilizer') ||
                id.includes('/hooks/useLazyLoad') ||
                id.includes('/hooks/usePerformanceMonitor')) {
              return 'performance'
            }
            
            // Critical components for LCP
            if (id.includes('/components/DashboardHeader') ||
                id.includes('/components/Auth/Login')) {
              return 'critical'
            }
            
            // Auth components - separate to avoid circular dependency
            if (id.includes('/components/Auth') || id.includes('/contexts/AuthContext')) {
              return 'auth'
            }
          },
          // Optimize chunk naming for better caching
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk'
            return `js/${facadeModuleId?.replace(/\.[^.]*$/, '') || 'chunk'}-[hash].js`
          },
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || 'asset'
            const extType = name.split('.').pop()
            
            // Optimize image loading for LCP
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(name)) {
              return `media/${name.split('.')[0]}-[hash][extname]`
            }
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(name)) {
              return `images/${name.split('.')[0]}-[hash][extname]`
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
              return `fonts/${name.split('.')[0]}-[hash][extname]`
            }
            return `${extType}/${name.split('.')[0]}-[hash][extname]`
          },
        },
      },
      // Optimize chunk size warning threshold
      chunkSizeWarningLimit: 1000,
      // Enable CSS code splitting for better TBT
      cssCodeSplit: true,
      // Target modern browsers for better performance
      target: ['es2020', 'chrome87', 'firefox78', 'safari14'],
      // Enable CSS minification for better Speed Index
      cssMinify: true,
      // Optimize dependencies for better loading
      modulePreload: {
        polyfill: true,
      },
      // Enable compression for better LCP
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          // Optimize for better TBT
          reduce_funcs: true,
          reduce_vars: true,
          sequences: true,
          dead_code: true,
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      } as any,
    },
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
      // Enable HMR with optimization
      hmr: {
        overlay: true,
      },
      // Optimize dev server performance
      fs: {
        strict: false,
      },
    },
    preview: {
      port: 4173,
      host: true,
    },
    optimizeDeps: {
      // Pre-bundle dependencies for faster development
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'axios',
      ],
      // Exclude large dependencies from pre-bundling
      exclude: ['@types/react'],
      // Force optimization for better TBT
      force: true,
    },
    define: {
      // Enable production optimizations
      __DEV__: JSON.stringify(!isProduction),
      // Enable performance monitoring
      __PERFORMANCE_MONITORING__: JSON.stringify(isProduction),
      // Enable concurrent features
      __CONCURRENT_FEATURES__: JSON.stringify(isProduction),
    },
    // CSS optimization for better Speed Index and CLS
    css: {
      devSourcemap: !isProduction,
      preprocessorOptions: {
        scss: {
          // Optimize SCSS compilation
          includePaths: [resolve(__dirname, 'src/styles')],
        },
      },
      // Enable CSS modules for better performance
      modules: {
        localsConvention: 'camelCase',
      },
    },
    // Experimental features for better performance
    experimental: {
      renderBuiltUrl: (filename, { hostType }) => {
        if (hostType === 'js') {
          return { js: `/${filename}` }
        } else {
          return { relative: true }
        }
      },
      // Enable build optimizations
      buildOptimize: true,
    },
    // App optimization for better TBT
    appType: 'spa',
    // Enable worker threads for better performance
    worker: {
      format: 'es',
      rollupOptions: {
        output: {
          entryFileNames: 'js/[name]-[hash].js',
          chunkFileNames: 'js/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
})
