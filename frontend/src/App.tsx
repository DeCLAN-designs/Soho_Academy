import './App.css'
import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AuthProvider, { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import Loader from './components/Loader/Loader'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'

// ─── Lazy-loaded route components ────────────────────────────────────────────
const Login    = lazy(() => import('./components/Auth/Login/Login'))
const Register = lazy(() => import('./components/Auth/Register/Register'))
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'))
const Layout   = lazy(() => import('./components/Layout/Layout'))

// ─── Loading fallback ─────────────────────────────────────────────────────────
const FullPageLoading: React.FC = () => (
  <Loader variant="page" label="Loading" />
)

// ─── Route guards ─────────────────────────────────────────────────────────────
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <FullPageLoading />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

const AuthAwareFallback: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <FullPageLoading />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <Navigate to="/dashboard" replace />
}

// ─── Routes ───────────────────────────────────────────────────────────────────
const AppRoutes: React.FC = () => (
  // Suspense catches ALL lazy imports inside — one boundary for everything
  <Suspense fallback={<FullPageLoading />}>
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

      {/* Canonical aliases */}
      <Route path="/auth/login"    element={<Navigate to="/login" replace />} />
      <Route path="/auth/register" element={<Navigate to="/register" replace />} />
      <Route path="/signin"        element={<Navigate to="/login" replace />} />
      <Route path="/signup"        element={<Navigate to="/register" replace />} />
      <Route path="/user/login"    element={<Navigate to="/login" replace />} />
      <Route path="/user/register" element={<Navigate to="/register" replace />} />

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"              element={<Dashboard />} />
        <Route path="dashboard/:sectionId"   element={<Dashboard />} />
        <Route path=":roleSlug"              element={<Dashboard />} />
        <Route path=":roleSlug/:sectionId"   element={<Dashboard />} />
      </Route>

      <Route path="*" element={<AuthAwareFallback />} />
    </Routes>
  </Suspense>
)

// ─── Root ─────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
)

export default App
  )
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
