import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { authApi, type AuthenticatedUserRecord } from '../../../../../lib/api'
import { useAuth } from '../../../../../contexts/AuthContext'
import Loader from '../../../../Loader/Loader'
import './Profile.css'

const MAX_PROFILE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024

type ProfileFormState = {
    firstName: string
    lastName: string
    currentPassword: string
    newPassword: string
    confirmPassword: string
}

type StatusMessage = {
    tone: 'success' | 'error'
    message: string
} | null

const getInitials = (firstName: string, lastName: string) => {
    const initials = [firstName, lastName]
        .map((part) => String(part || '').trim().charAt(0).toUpperCase())
        .filter(Boolean)
        .join('')

    return initials || 'BA'
}

const createFormState = (profile: AuthenticatedUserRecord): ProfileFormState => ({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
})

const BusAssistantProfileMenuItem = () => {
    const { user, updateUser } = useAuth()
    const [profile, setProfile] = useState<AuthenticatedUserRecord | null>(null)
    const [formData, setFormData] = useState<ProfileFormState>({
        firstName: '',
        lastName: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })
    const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
    const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [statusMessage, setStatusMessage] = useState<StatusMessage>(null)
    const [lastSyncedAt, setLastSyncedAt] = useState('')

    const fallbackProfile: AuthenticatedUserRecord = {
        id: 0,
        email: '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phoneNumber: '',
        role: user?.role || '',
        numberPlate: user?.numberPlate || null,
        profilePhotoUrl: user?.profilePhotoUrl || null,
    }

    const syncLocalForm = (nextProfile: AuthenticatedUserRecord) => {
        setFormData(createFormState(nextProfile))
        setSelectedPhotoFile(null)
    }

    const loadProfile = async (withLoader = true) => {
        if (withLoader) {
            setIsLoading(true)
        } else {
            setIsRefreshing(true)
        }

        setErrorMessage('')
        setStatusMessage(null)

        try {
            const response = await authApi.me()
            const nextProfile = response.data || fallbackProfile
            setProfile(nextProfile)
            syncLocalForm(nextProfile)
            setLastSyncedAt(new Date().toLocaleString())
        } catch (error) {
            const nextProfile = profile || fallbackProfile
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load profile.')
            setProfile(nextProfile)
            syncLocalForm(nextProfile)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!selectedPhotoFile) {
            setSelectedPhotoPreviewUrl('')
            return
        }

        const nextPreviewUrl = URL.createObjectURL(selectedPhotoFile)
        setSelectedPhotoPreviewUrl(nextPreviewUrl)

        return () => {
            URL.revokeObjectURL(nextPreviewUrl)
        }
    }, [selectedPhotoFile])

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target

        setFormData((currentFormData) => ({
            ...currentFormData,
            [name]: value,
        }))
        setStatusMessage(null)
    }

    const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0] || null

        if (!nextFile) {
            setSelectedPhotoFile(null)
            return
        }

        if (!String(nextFile.type || '').toLowerCase().startsWith('image/')) {
            setStatusMessage({
                tone: 'error',
                message: 'Choose an image file for the passport photo.',
            })
            event.target.value = ''
            return
        }

        if (nextFile.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
            setStatusMessage({
                tone: 'error',
                message: 'The passport photo must be 5MB or smaller.',
            })
            event.target.value = ''
            return
        }

        setSelectedPhotoFile(nextFile)
        setStatusMessage(null)
    }

    const activeProfile = profile || fallbackProfile
    const firstName = formData.firstName.trim()
    const lastName = formData.lastName.trim()
    const fullName = [activeProfile.firstName, activeProfile.lastName].filter(Boolean).join(' ').trim()
    const previewPhotoUrl = selectedPhotoPreviewUrl || activeProfile.profilePhotoUrl || ''
    const passwordChangeRequested =
        Boolean(formData.currentPassword) ||
        Boolean(formData.newPassword) ||
        Boolean(formData.confirmPassword)
    const hasPendingChanges =
        firstName !== activeProfile.firstName.trim() ||
        lastName !== activeProfile.lastName.trim() ||
        Boolean(selectedPhotoFile) ||
        passwordChangeRequested

    const resetEdits = () => {
        syncLocalForm(activeProfile)
        setStatusMessage(null)
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!user?.token) {
            setStatusMessage({
                tone: 'error',
                message: 'Your session is missing. Please sign in again.',
            })
            return
        }

        if (!firstName || !lastName) {
            setStatusMessage({
                tone: 'error',
                message: 'First name and last name are required.',
            })
            return
        }

        if (passwordChangeRequested) {
            if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
                setStatusMessage({
                    tone: 'error',
                    message: 'Complete all password fields before saving.',
                })
                return
            }

            if (formData.newPassword.length < 6) {
                setStatusMessage({
                    tone: 'error',
                    message: 'New password must be at least 6 characters.',
                })
                return
            }

            if (formData.newPassword !== formData.confirmPassword) {
                setStatusMessage({
                    tone: 'error',
                    message: 'New password and confirm password do not match.',
                })
                return
            }
        }

        if (!hasPendingChanges) {
            setStatusMessage({
                tone: 'error',
                message: 'Update at least one field before saving.',
            })
            return
        }

        setIsSaving(true)
        setErrorMessage('')
        setStatusMessage(null)

        const payload = new FormData()

        if (firstName !== activeProfile.firstName.trim()) {
            payload.append('firstName', firstName)
        }

        if (lastName !== activeProfile.lastName.trim()) {
            payload.append('lastName', lastName)
        }

        if (passwordChangeRequested) {
            payload.append('currentPassword', formData.currentPassword)
            payload.append('newPassword', formData.newPassword)
        }

        if (selectedPhotoFile) {
            payload.append('profilePhoto', selectedPhotoFile)
        }

        try {
            const response = await authApi.updateProfile(payload)
            const nextProfile = response.data?.user || activeProfile

            setProfile(nextProfile)
            syncLocalForm(nextProfile)
            setLastSyncedAt(new Date().toLocaleString())
            setStatusMessage({
                tone: 'success',
                message: 'Profile updated successfully.',
            })
            updateUser({
                token: user.token,
                firstName: nextProfile.firstName,
                lastName: nextProfile.lastName,
                role: nextProfile.role,
                numberPlate: nextProfile.numberPlate || null,
                profilePhotoUrl: nextProfile.profilePhotoUrl || null,
            })
        } catch (error) {
            setStatusMessage({
                tone: 'error',
                message: error instanceof Error ? error.message : 'Failed to update profile.',
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <Loader variant="section" label="Loading profile" />
    }

    return (
        <section className="driverProfile">
            <div className="driverProfile__header">
                <div className="driverProfile__identity">
                    <div className="driverProfile__avatar" aria-hidden="true">
                        {previewPhotoUrl ? (
                            <img src={previewPhotoUrl} alt="" />
                        ) : (
                            <span>{getInitials(activeProfile.firstName, activeProfile.lastName)}</span>
                        )}
                    </div>

                    <div>
                        <h3 className="driverProfile__title">{fullName || 'Bus Assistant Profile'}</h3>
                        <p className="driverProfile__description">
                            Update your name, change your password, and add the passport photo
                            shown in the dashboard header.
                        </p>
                    </div>
                </div>

                <div className="driverProfile__actions">
                    <span className="driverProfile__roleBadge">
                        {activeProfile.role || 'Bus Assistant'}
                    </span>

                    <button
                        type="button"
                        className="driverProfile__ghostButton"
                        onClick={() => void loadProfile(false)}
                        disabled={isRefreshing || isSaving}
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {errorMessage ? (
                <p className="driverProfile__status driverProfile__status--error">{errorMessage}</p>
            ) : null}

            {statusMessage ? (
                <p
                    className={
                        statusMessage.tone === 'success'
                            ? 'driverProfile__status driverProfile__status--success'
                            : 'driverProfile__status driverProfile__status--error'
                    }
                >
                    {statusMessage.message}
                </p>
            ) : null}

            <div className="driverProfile__hero">
                <article className="driverProfile__photoCard">
                    <span className="driverProfile__eyebrow">Passport Photo</span>

                    <div className="driverProfile__photoPreview" aria-hidden="true">
                        {previewPhotoUrl ? (
                            <img src={previewPhotoUrl} alt="" />
                        ) : (
                            <span>{getInitials(activeProfile.firstName, activeProfile.lastName)}</span>
                        )}
                    </div>

                    <p className="driverProfile__photoHelp">
                        Upload one clear headshot image. The same photo appears on the right side
                        of the dashboard header.
                    </p>

                    <label className="driverProfile__fileButton">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                        />
                        Choose photo
                    </label>

                    {selectedPhotoFile ? (
                        <button
                            type="button"
                            className="driverProfile__textButton"
                            onClick={() => setSelectedPhotoFile(null)}
                        >
                            Use saved photo
                        </button>
                    ) : null}
                </article>

                <div className="driverProfile__summaryGrid">
                    <article className="driverProfile__summaryCard">
                        <span>Email</span>
                        <strong>{activeProfile.email || 'Not available'}</strong>
                    </article>

                    <article className="driverProfile__summaryCard">
                        <span>Phone Number</span>
                        <strong>{activeProfile.phoneNumber || 'Not available'}</strong>
                    </article>

                    <article className="driverProfile__summaryCard">
                        <span>Assigned Bus</span>
                        <strong>{activeProfile.numberPlate || 'Not assigned'}</strong>
                    </article>

                    <article className="driverProfile__summaryCard">
                        <span>Last Synced</span>
                        <strong>{lastSyncedAt || 'Not synced yet'}</strong>
                    </article>
                </div>
            </div>

            <form className="driverProfile__form" onSubmit={handleSubmit}>
                <div className="driverProfile__formGrid">
                    <article className="driverProfile__panel">
                        <div className="driverProfile__panelHeader">
                            <h4>Personal Details</h4>
                            <p>Edit the name shown throughout the dashboard.</p>
                        </div>

                        <label className="driverProfile__field">
                            <span>First Name</span>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                placeholder="Enter first name"
                                autoComplete="given-name"
                            />
                        </label>

                        <label className="driverProfile__field">
                            <span>Last Name</span>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                placeholder="Enter last name"
                                autoComplete="family-name"
                            />
                        </label>

                        <label className="driverProfile__field">
                            <span>Email</span>
                            <input
                                type="email"
                                value={activeProfile.email || ''}
                                readOnly
                                aria-readonly="true"
                            />
                        </label>

                        <label className="driverProfile__field">
                            <span>Phone Number</span>
                            <input
                                type="text"
                                value={activeProfile.phoneNumber || ''}
                                readOnly
                                aria-readonly="true"
                            />
                        </label>
                    </article>

                    <article className="driverProfile__panel">
                        <div className="driverProfile__panelHeader">
                            <h4>Change Password</h4>
                            <p>Leave these fields empty if you do not want to update your password.</p>
                        </div>

                        <label className="driverProfile__field">
                            <span>Current Password</span>
                            <input
                                type="password"
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleInputChange}
                                placeholder="Enter current password"
                                autoComplete="current-password"
                            />
                        </label>

                        <label className="driverProfile__field">
                            <span>New Password</span>
                            <input
                                type="password"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleInputChange}
                                placeholder="Enter new password"
                                autoComplete="new-password"
                            />
                        </label>

                        <label className="driverProfile__field">
                            <span>Confirm New Password</span>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="Confirm new password"
                                autoComplete="new-password"
                            />
                        </label>

                        <div className="driverProfile__accountMeta">
                            <div>
                                <span>Role</span>
                                <strong>{activeProfile.role || 'Bus Assistant'}</strong>
                            </div>

                            <div>
                                <span>Account ID</span>
                                <strong>{activeProfile.id || 'Not available'}</strong>
                            </div>
                        </div>
                    </article>
                </div>

                <div className="driverProfile__formActions">
                    <button
                        type="button"
                        className="driverProfile__ghostButton"
                        onClick={resetEdits}
                        disabled={isSaving}
                    >
                        Reset changes
                    </button>

                    <button
                        type="submit"
                        className="driverProfile__primaryButton"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save profile changes'}
                    </button>
                </div>
            </form>
        </section>
    )
}

export default BusAssistantProfileMenuItem
