import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { driverIncidentApi } from '../../../../../lib/api'
import type { DriverIncidentReportRecord } from '../../../../../lib/api'
import { useAuth } from '../../../../../contexts/AuthContext'
import Loader from '../../../../Loader/Loader'
import './IncidentsAndAccidents.css'

type IncidentFormState = {
    incidentDate: string
    incidentTime: string
    pointOfIncident: string
    childrenInvolved: string
    description: string
    actionTaken: string
}

type ImagePreview = {
    id: string
    fileName: string
    fileSizeLabel: string
    url: string
}

type IncidentView = 'report' | 'history'

const MAX_IMAGE_COUNT = 5
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const today = () => new Date().toISOString().slice(0, 10)

const currentTime = () => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
}

const createInitialFormState = (): IncidentFormState => ({
    incidentDate: today(),
    incidentTime: currentTime(),
    pointOfIncident: '',
    childrenInvolved: '',
    description: '',
    actionTaken: '',
})

const formatDateTime = (incidentDate: string, incidentTime: string) => {
    const normalizedTime = incidentTime ? incidentTime.slice(0, 5) : ''
    return [incidentDate, normalizedTime].filter(Boolean).join(' at ')
}

const formatDisplayDate = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleDateString()
}

const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`
    }

    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
}

const DriverIncidentsAndAccidentsMenuItem = () => {
    const { user } = useAuth()
    const [activeView, setActiveView] = useState<IncidentView>('report')
    const [form, setForm] = useState<IncidentFormState>(createInitialFormState())
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([])
    const [reports, setReports] = useState<DriverIncidentReportRecord[]>([])
    const [isLoadingReports, setIsLoadingReports] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const assignedNumberPlate = user?.numberPlate?.trim() || ''

    const loadReports = async (withLoader = true) => {
        if (withLoader) {
            setIsLoadingReports(true)
        }

        setErrorMessage('')

        try {
            const response = await driverIncidentApi.getReports()
            setReports(response.data?.reports || [])
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load incident reports.')
        } finally {
            if (withLoader) {
                setIsLoadingReports(false)
            }
        }
    }

    useEffect(() => {
        void loadReports(true)
    }, [])

    useEffect(() => {
        const nextPreviews = selectedFiles.map((file, index) => ({
            id: `${file.name}-${file.size}-${index}`,
            fileName: file.name,
            fileSizeLabel: formatFileSize(file.size),
            url: URL.createObjectURL(file),
        }))

        setImagePreviews(nextPreviews)

        return () => {
            nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
        }
    }, [selectedFiles])

    const handleChange = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = event.target

        setForm((currentFormState) => ({
            ...currentFormState,
            [name]: value,
        }))
    }

    const handleImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
        setErrorMessage('')
        const nextFiles = Array.from(event.target.files || [])

        if (nextFiles.length === 0) {
            setSelectedFiles([])
            return
        }

        if (nextFiles.length > MAX_IMAGE_COUNT) {
            setSelectedFiles([])
            event.target.value = ''
            setErrorMessage(`Upload a maximum of ${MAX_IMAGE_COUNT} incident photos.`)
            return
        }

        const unsupportedFile = nextFiles.find((file) => !file.type.startsWith('image/'))
        if (unsupportedFile) {
            setSelectedFiles([])
            event.target.value = ''
            setErrorMessage('Only image files are allowed for incident uploads.')
            return
        }

        const oversizeFile = nextFiles.find((file) => file.size > MAX_IMAGE_SIZE_BYTES)
        if (oversizeFile) {
            setSelectedFiles([])
            event.target.value = ''
            setErrorMessage('Each incident photo must be 5MB or smaller.')
            return
        }

        setSelectedFiles(nextFiles)
    }

    const clearSelectedImages = () => {
        setSelectedFiles([])

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')

        if (!assignedNumberPlate) {
            setErrorMessage('No number plate is assigned to this driver account.')
            return
        }

        if (selectedFiles.length === 0) {
            setErrorMessage('Add at least one scene or vehicle photo before submitting.')
            return
        }

        setIsSubmitting(true)

        try {
            const payload = new FormData()
            payload.append('incidentDate', form.incidentDate)
            payload.append('incidentTime', form.incidentTime)
            payload.append('pointOfIncident', form.pointOfIncident.trim())
            payload.append('childrenInvolved', form.childrenInvolved.trim())
            payload.append('description', form.description.trim())
            payload.append('actionTaken', form.actionTaken.trim())

            selectedFiles.forEach((file) => {
                payload.append('images', file)
            })

            await driverIncidentApi.createReport(payload)

            setSuccessMessage('Incident report submitted successfully.')
            setForm(createInitialFormState())
            clearSelectedImages()
            setActiveView('history')
            await loadReports(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to submit incident report.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section className="driverIncidentReport">
            <div className="driverIncidentReport__tabs">
                <button
                    type="button"
                    className={
                        activeView === 'report'
                            ? 'driverIncidentReport__tab driverIncidentReport__tab--active'
                            : 'driverIncidentReport__tab'
                    }
                    onClick={() => setActiveView('report')}
                >
                    Report Incident
                </button>
                <button
                    type="button"
                    className={
                        activeView === 'history'
                            ? 'driverIncidentReport__tab driverIncidentReport__tab--active'
                            : 'driverIncidentReport__tab'
                    }
                    onClick={() => setActiveView('history')}
                >
                    Incident History
                </button>
            </div>

            {errorMessage ? (
                <p className="driverIncidentReport__status driverIncidentReport__status--error">
                    {errorMessage}
                </p>
            ) : null}

            {successMessage ? (
                <p className="driverIncidentReport__status driverIncidentReport__status--success">
                    {successMessage}
                </p>
            ) : null}

            {activeView === 'report' ? (
                <>
                    <div className="driverIncidentReport__intro">
                        <div>
                            <h3 className="driverIncidentReport__title">Incidents & Accidents</h3>
                            <p className="driverIncidentReport__description">
                                Capture the exact event details and upload up to 5 scene or vehicle
                                photos for cloud storage and tracking.
                            </p>
                        </div>

                        <div className="driverIncidentReport__plateCard">
                            <span>Assigned Bus</span>
                            <strong>{assignedNumberPlate || 'Not assigned'}</strong>
                        </div>
                    </div>

                    <form className="driverIncidentReport__form" onSubmit={handleSubmit}>
                        <div className="driverIncidentReport__grid">
                            <label>
                                Date
                                <input
                                    type="date"
                                    name="incidentDate"
                                    value={form.incidentDate}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                />
                            </label>

                            <label>
                                Time
                                <input
                                    type="time"
                                    name="incidentTime"
                                    value={form.incidentTime}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                />
                            </label>

                            <label className="driverIncidentReport__fullWidth">
                                Point of accident or incident
                                <input
                                    type="text"
                                    name="pointOfIncident"
                                    value={form.pointOfIncident}
                                    onChange={handleChange}
                                    placeholder="Road, landmark, estate, or stage"
                                    disabled={isSubmitting}
                                    required
                                />
                            </label>

                            <label className="driverIncidentReport__fullWidth">
                                Name of child(ren) involved
                                <textarea
                                    name="childrenInvolved"
                                    value={form.childrenInvolved}
                                    onChange={handleChange}
                                    placeholder="List the children involved, separated by commas"
                                    disabled={isSubmitting}
                                    required
                                />
                            </label>

                            <label className="driverIncidentReport__fullWidth">
                                Particulars or description
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    placeholder="Describe what happened"
                                    disabled={isSubmitting}
                                    required
                                />
                            </label>

                            <label className="driverIncidentReport__fullWidth">
                                Action taken
                                <textarea
                                    name="actionTaken"
                                    value={form.actionTaken}
                                    onChange={handleChange}
                                    placeholder="State the response or next steps taken"
                                    disabled={isSubmitting}
                                    required
                                />
                            </label>

                            <div className="driverIncidentReport__fullWidth driverIncidentReport__uploadPanel">
                                <div className="driverIncidentReport__uploadHeader">
                                    <div>
                                        <h4>Scene / Vehicle Photos</h4>
                                        <p>Upload up to 5 photos, maximum 5MB per photo.</p>
                                    </div>

                                    {selectedFiles.length > 0 ? (
                                        <button
                                            type="button"
                                            className="driverIncidentReport__ghostButton"
                                            onClick={clearSelectedImages}
                                            disabled={isSubmitting}
                                        >
                                            Clear Photos
                                        </button>
                                    ) : null}
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    name="images"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImagesChange}
                                    disabled={isSubmitting}
                                />

                                {imagePreviews.length > 0 ? (
                                    <div className="driverIncidentReport__previewGrid">
                                        {imagePreviews.map((preview) => (
                                            <article key={preview.id} className="driverIncidentReport__previewCard">
                                                <img src={preview.url} alt={preview.fileName} />
                                                <div>
                                                    <strong>{preview.fileName}</strong>
                                                    <span>{preview.fileSizeLabel}</span>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="driverIncidentReport__emptyHint">
                                        No photos selected yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting Report...' : 'Submit Incident Report'}
                        </button>

                        {isSubmitting ? <Loader variant="inline" label="Uploading report" /> : null}
                    </form>
                </>
            ) : (
                <div className="driverIncidentReport__history">
                    <div className="driverIncidentReport__historyHeader">
                        <div>
                            <h3 className="driverIncidentReport__title">Incident History</h3>
                            <p className="driverIncidentReport__description">
                                Review submitted reports and the uploaded scene evidence.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="driverIncidentReport__ghostButton"
                            onClick={() => void loadReports(true)}
                            disabled={isLoadingReports}
                        >
                            {isLoadingReports ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>

                    {isLoadingReports ? (
                        <Loader variant="section" label="Loading incident reports" />
                    ) : null}

                    {!isLoadingReports && reports.length === 0 ? (
                        <p className="driverIncidentReport__emptyHint">
                            No incident reports have been submitted yet.
                        </p>
                    ) : null}

                    {!isLoadingReports && reports.length > 0 ? (
                        <ul className="driverIncidentReport__historyList">
                            {reports.map((report) => (
                                <li key={report.id} className="driverIncidentReport__historyItem">
                                    <div className="driverIncidentReport__historyTop">
                                        <div>
                                            <strong>{formatDisplayDate(report.incidentDate)}</strong>
                                            <span>{formatDateTime(report.incidentDate, report.incidentTime)}</span>
                                        </div>

                                        <span className="driverIncidentReport__badge">
                                            {report.numberPlate}
                                        </span>
                                    </div>

                                    <div className="driverIncidentReport__detailGrid">
                                        <div>
                                            <h4>Point of accident or incident</h4>
                                            <p>{report.pointOfIncident}</p>
                                        </div>

                                        <div>
                                            <h4>Child(ren) involved</h4>
                                            <p>{report.childrenInvolved}</p>
                                        </div>

                                        <div>
                                            <h4>Description</h4>
                                            <p>{report.description}</p>
                                        </div>

                                        <div>
                                            <h4>Action taken</h4>
                                            <p>{report.actionTaken}</p>
                                        </div>
                                    </div>

                                    <div className="driverIncidentReport__gallerySection">
                                        <h4>Uploaded Photos</h4>
                                        {report.uploads.length === 0 ? (
                                            <p className="driverIncidentReport__emptyHint">
                                                No photos were uploaded with this report.
                                            </p>
                                        ) : (
                                            <div className="driverIncidentReport__gallery">
                                                {report.uploads.map((upload) => (
                                                    <a
                                                        key={upload.id}
                                                        href={upload.fileUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="driverIncidentReport__galleryItem"
                                                    >
                                                        <img
                                                            src={upload.fileUrl}
                                                            alt={upload.fileName}
                                                            loading="lazy"
                                                        />
                                                        <span>{upload.fileName}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            )}
        </section>
    )
}

export default DriverIncidentsAndAccidentsMenuItem
