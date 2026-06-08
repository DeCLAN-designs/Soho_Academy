import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:5000'

  return {
    plugins: [react()],

    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },

    build: {
      target: 'es2015',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,       // removes all console.log in prod
          drop_debugger: true,
          pure_funcs: ['console.info', 'console.debug', 'console.warn'],
        },
      },
      rollupOptions: {
        output: {
          // Split vendor chunks so browsers can cache them independently
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'axios-vendor': ['axios'],
          },
        },
      },
      // Warn if any chunk exceeds 400kb
      chunkSizeWarningLimit: 400,
      // Generate CSS code splitting
      cssCodeSplit: true,
      // Enable source maps only in dev
      sourcemap: mode === 'development',
    },

    // Optimize dependencies pre-bundling
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios'],
    },
  }
})