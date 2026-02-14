import styles from './Login.module.css'
import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { authApi } from '../../../lib/api'

type LoginProps = {
    onSwitchToRegister: () => void
    onLoginSuccess: (token: string, role: string) => void
}

type LoginFormData = {
    email: string
    password: string
}

const initialFormData: LoginFormData = {
    email: '',
    password: '',
}

const Login = ({ onSwitchToRegister, onLoginSuccess }: LoginProps) => {
    const [formData, setFormData] = useState<LoginFormData>(initialFormData)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [showPassword, setShowPassword] = useState(false)

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
            const response = await authApi.login(formData)
            setSuccessMessage(response.message || 'Login successful. Redirecting...')
            window.setTimeout(() => {
                onLoginSuccess(response.data?.token || '', response.data?.role || '')
            }, 500)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to the backend.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
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
                <button type="button" onClick={onSwitchToRegister} className={styles.linkButton}>
                    Register here
                </button>
            </p>

            {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
            {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
        </section>
    )
}

export default Login
