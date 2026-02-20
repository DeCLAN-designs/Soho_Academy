import styles from './Register.module.css'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ChangeEvent, FormEvent } from 'react'
import { authApi } from '../../../lib/api'

type RegisterFormData = {
    email: string
    firstName: string
    lastName: string
    phoneNumber: string
    numberPlate: string
    role: string
    password: string
    confirmPassword: string
}

const initialFormData: RegisterFormData = {
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    numberPlate: '',
    role: '',
    password: '',
    confirmPassword: '',
}

const ROLES_REQUIRING_NUMBER_PLATE = new Set(['Driver', 'Bus Assistant'])

const Register = () => {
    const [formData, setFormData] = useState<RegisterFormData>(initialFormData)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoadingNumberPlates, setIsLoadingNumberPlates] = useState(false)
    const [numberPlateOptions, setNumberPlateOptions] = useState<string[]>([])
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const navigate = useNavigate()
    const needsNumberPlate = ROLES_REQUIRING_NUMBER_PLATE.has(formData.role)

    useEffect(() => {
        if (!needsNumberPlate) {
            setNumberPlateOptions([])
            setIsLoadingNumberPlates(false)
            return
        }

        let isCancelled = false

        const loadNumberPlates = async () => {
            setIsLoadingNumberPlates(true)

            try {
                const response = await authApi.getNumberPlates()

                if (isCancelled) {
                    return
                }

                const plates = response.data?.numberPlates || []
                setNumberPlateOptions(plates)
            } catch (error) {
                if (isCancelled) {
                    return
                }

                setNumberPlateOptions([])
                setErrorMessage(error instanceof Error ? error.message : 'Failed to load number plates.')
            } finally {
                if (!isCancelled) {
                    setIsLoadingNumberPlates(false)
                }
            }
        }

        loadNumberPlates()

        return () => {
            isCancelled = true
        }
    }, [needsNumberPlate])

    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target

        if (name === 'role') {
            setFormData((currentData) => ({
                ...currentData,
                role: value,
                numberPlate: '',
            }))

            return
        }

        const nextValue = name === 'phoneNumber' ? value.replace(/\D/g, '') : value

        setFormData((currentData) => ({
            ...currentData,
            [name]: nextValue,
        }))
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsSubmitting(true)
        setErrorMessage('')
        setSuccessMessage('')

        if (needsNumberPlate && !formData.numberPlate) {
            setErrorMessage('Select a number plate for this role.')
            setIsSubmitting(false)
            return
        }

        if (formData.password !== formData.confirmPassword) {
            setErrorMessage('Passwords do not match.')
            setIsSubmitting(false)
            return
        }

        try {
            const payload = {
                ...formData,
                numberPlate: needsNumberPlate ? formData.numberPlate : '',
            }
            const response = await authApi.register(payload)
            setSuccessMessage(response.message || 'Registration successful. Redirecting to login...')
            setFormData(initialFormData)
            setNumberPlateOptions([])
            setTimeout(() => {
                navigate('/login')
            }, 800)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to the backend.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <main className={styles.page}>
            <section className={styles.register}>
                <header className={styles.header}>
                    <p className={styles.kicker}>Transport Account</p>
                    <h1>Create Register Profile</h1>
                    <p>Fill in driver, parent, transport, or school admin details.</p>
                </header>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <label>
                        <span>First Name</span>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            placeholder="John"
                            disabled={isSubmitting}
                            required
                        />
                    </label>

                    <label>
                        <span>Last Name</span>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            placeholder="Doe"
                            disabled={isSubmitting}
                            required
                        />
                    </label>

                    <label>
                        <span>Email</span>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="john@example.com"
                            disabled={isSubmitting}
                            required
                        />
                    </label>

                    <label>
                        <span>Phone Number</span>
                        <input
                            type="text"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            placeholder="0798799729"
                            inputMode="numeric"
                            pattern="[0-9]+"
                            disabled={isSubmitting}
                            required
                        />
                    </label>

                    <label>
                        <span>Role</span>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            required
                        >
                            <option value="">Select role</option>
                            <option value="Parent">Parent</option>
                            <option value="Driver">Driver</option>
                            <option value="Bus Assistant">Bus Assistant</option>
                            <option value="Transport Manager">Transport Manager</option>
                            <option value="School Admin">School Admin</option>
                        </select>
                    </label>

                    {needsNumberPlate ? (
                        <label>
                            <span>Number Plate</span>
                            <select
                                name="numberPlate"
                                value={formData.numberPlate}
                                onChange={handleChange}
                                disabled={isSubmitting || isLoadingNumberPlates}
                                required
                            >
                                <option value="">
                                    {isLoadingNumberPlates ? 'Loading number plates...' : 'Select number plate'}
                                </option>
                                {numberPlateOptions.map((plate) => (
                                    <option key={plate} value={plate}>
                                        {plate}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}

                    {needsNumberPlate && !isLoadingNumberPlates && numberPlateOptions.length === 0 ? (
                        <p className={`${styles.fullWidth} ${styles.hint}`}>
                            No number plates are currently available to assign.
                        </p>
                    ) : null}

                    <label className={styles.fullWidth}>
                        <span>Password</span>
                        <div className={styles.passwordField}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="At least 6 characters"
                                minLength={6}
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

                    <label className={styles.fullWidth}>
                        <span>Confirm Password</span>
                        <div className={styles.passwordField}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm password"
                                minLength={6}
                                disabled={isSubmitting}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className={styles.passwordToggle}
                            >
                                {showConfirmPassword ? '👁️' : '🙈'}
                            </button>
                        </div>
                    </label>

                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <p className={styles.switchAuth}>
                    Already have an account?{' '}
                    <Link to="/login" className={styles.linkButton}>
                        Login here
                    </Link>
                </p>

                {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
                {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
            </section>
        </main>
    )
}

export default Register
