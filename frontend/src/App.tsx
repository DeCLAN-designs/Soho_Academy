import './App.css'
import { useState } from 'react'
import Login from './components/Auth/Login/Login'
import Register from './components/Auth/Register/Register'
import Dashboard from './components/Dashboard/Dashboard'
import PrivateRoute from './components/PrivateRoute/PrivateRoute'

const AUTH_TOKEN_KEY = 'soho_auth_token'
const AUTH_ROLE_KEY = 'soho_user_role'

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(
        () => Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY))
    )
    const [role, setRole] = useState(
        () => window.localStorage.getItem(AUTH_ROLE_KEY) || ''
    )
    const [currentView, setCurrentView] = useState<'login' | 'register' | 'dashboard'>('login')

    const handleLoginSuccess = (token: string, nextRole: string) => {
        if (token) {
            window.localStorage.setItem(AUTH_TOKEN_KEY, token)
        }
        if (nextRole) {
            window.localStorage.setItem(AUTH_ROLE_KEY, nextRole)
        }

        setIsAuthenticated(true)
        setRole(nextRole || '')
        setCurrentView('dashboard')
    }

    const handleLogout = () => {
        window.localStorage.removeItem(AUTH_TOKEN_KEY)
        window.localStorage.removeItem(AUTH_ROLE_KEY)
        setIsAuthenticated(false)
        setRole('')
        setCurrentView('login')
    }

    const loginView = (
        <Login
            onSwitchToRegister={() => setCurrentView('register')}
            onLoginSuccess={handleLoginSuccess}
        />
    )
    const isDashboardView = isAuthenticated && currentView !== 'register'

    return (
        <main className={isDashboardView ? 'authLayout authLayout--dashboard' : 'authLayout'}>
            {currentView === 'register' ? (
                <Register onSwitchToLogin={() => setCurrentView('login')} />
            ) : null}

            {currentView !== 'register' ? (
                <PrivateRoute isAuthenticated={isAuthenticated} fallback={loginView}>
                    <Dashboard role={role} onLogout={handleLogout} />
                </PrivateRoute>
            ) : null}
        </main>
    )
}

export default App
