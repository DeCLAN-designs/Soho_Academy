import { useEffect, useState } from 'react'
import { authApi, type AuthenticatedUserRecord } from '../../../../../lib/api'
import { useAuth } from '../../../../../contexts/AuthContext'
import Loader from '../../../../Loader/Loader'
import './Profile.css'

const getInitials = (firstName: string, lastName: string) => {
    const initials = [firstName, lastName]
        .map((part) => String(part || '').trim().charAt(0).toUpperCase())
        .filter(Boolean)
        .join('')

    return initials || 'DR'
}

const DriverProfileMenuItem = () => {
    const { user } = useAuth()
    const [profile, setProfile] = useState<AuthenticatedUserRecord | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [lastSyncedAt, setLastSyncedAt] = useState('')

    const fallbackProfile: AuthenticatedUserRecord = {
        id: 0,
        email: '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phoneNumber: '',
        role: user?.role || '',
        numberPlate: user?.numberPlate || null,
    }

    const loadProfile = async (withLoader = true) => {
        if (withLoader) {
            setIsLoading(true)
        } else {
            setIsRefreshing(true)
        }

        setErrorMessage('')

        try {
            const response = await authApi.me()
            setProfile(response.data || null)
            setLastSyncedAt(new Date().toLocaleString())
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load profile.')
            setProfile((currentProfile) => currentProfile || fallbackProfile)
        } finally {
            if (withLoader) {
                setIsLoading(false)
            } else {
                setIsRefreshing(false)
            }
        }
    }

    useEffect(() => {
        void loadProfile(true)
    }, [])

    const activeProfile = profile || fallbackProfile
    const fullName = [activeProfile.firstName, activeProfile.lastName].filter(Boolean).join(' ').trim()

    if (isLoading) {
        return <Loader variant="section" label="Loading profile" />
    }

    return (
        <section className="driverProfile">
            <div className="driverProfile__header">
                <div className="driverProfile__identity">
                    <div className="driverProfile__avatar" aria-hidden="true">
                        {getInitials(activeProfile.firstName, activeProfile.lastName)}
                    </div>

                    <div>
                        <h3 className="driverProfile__title">{fullName || 'Driver Profile'}</h3>
                        <p className="driverProfile__description">
                            Review your current account details and assigned vehicle information.
                        </p>
                    </div>
                </div>

                <div className="driverProfile__actions">
                    <span className="driverProfile__roleBadge">
                        {activeProfile.role || 'Driver'}
                    </span>

                    <button
                        type="button"
                        className="driverProfile__ghostButton"
                        onClick={() => void loadProfile(false)}
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {errorMessage ? (
                <p className="driverProfile__status driverProfile__status--error">{errorMessage}</p>
            ) : null}

            <div className="driverProfile__hero">
                <div className="driverProfile__plateCard">
                    <span>Assigned Bus</span>
                    <strong>{activeProfile.numberPlate || 'Not assigned'}</strong>
                </div>

                <div className="driverProfile__syncCard">
                    <span>Last Synced</span>
                    <strong>{lastSyncedAt || 'Not synced yet'}</strong>
                </div>
            </div>

            <div className="driverProfile__grid">
                <article className="driverProfile__infoCard">
                    <h4>First Name</h4>
                    <p>{activeProfile.firstName || 'Not available'}</p>
                </article>

                <article className="driverProfile__infoCard">
                    <h4>Last Name</h4>
                    <p>{activeProfile.lastName || 'Not available'}</p>
                </article>

                <article className="driverProfile__infoCard">
                    <h4>Email</h4>
                    <p>{activeProfile.email || 'Not available'}</p>
                </article>

                <article className="driverProfile__infoCard">
                    <h4>Phone Number</h4>
                    <p>{activeProfile.phoneNumber || 'Not available'}</p>
                </article>

                <article className="driverProfile__infoCard">
                    <h4>Role</h4>
                    <p>{activeProfile.role || 'Not available'}</p>
                </article>

                <article className="driverProfile__infoCard">
                    <h4>Account ID</h4>
                    <p>{activeProfile.id || 'Not available'}</p>
                </article>
            </div>
        </section>
    )
}

export default DriverProfileMenuItem
