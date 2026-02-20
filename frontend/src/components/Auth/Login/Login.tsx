import styles from './Login.module.css'
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import type { ChangeEvent, FormEvent } from 'react'
import { useAuth } from '../../../contexts/AuthContext'

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    
    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    
    const from = location.state?.from?.pathname || '/dashboard'

    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target
        setFormData((currentData) => ({
            ...currentData,
            [name]: value,
        }))
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsSubmitting(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            await login(formData.email, formData.password)
            setSuccessMessage('Login successful. Redirecting...')
            setTimeout(() => {
                navigate(from, { replace: true })
            }, 500)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to the backend.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <main className={styles.page}>
            <section className={styles.login}>
                <header className={styles.header}>
                    <p className={styles.kicker}>Welcome Back</p>
                    <h1>Login</h1>
                    <p>Use your account credentials to access transport tools.</p>
                </header>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <label>
                        <span>Email</span>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            disabled={isSubmitting}
                            required
                        />
                    </label>

                    <label>
                        <span>Password</span>
                        <div className={styles.passwordField}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter password"
                                disabled={isSubmitting}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={styles.passwordToggle}
                            >
                                {showPassword ? '👁️' : '🙈'}
                            </button>
                        </div>
                    </label>

                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <p className={styles.switchAuth}>
                    Don't have an account?{' '}
                    <Link to="/register" className={styles.linkButton}>
                        Register here
                    </Link>
                </p>

                {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
                {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
            </section>
        </main>
    )
}

export default Login
