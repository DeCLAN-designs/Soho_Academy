import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { driverComplaintApi } from '../../../../../lib/api'
import type {
    ComplaintType,
    DriverComplaintFormMeta,
    DriverComplaintReportRecord,
} from '../../../../../lib/api'
import Loader from '../../../../Loader/Loader'
import './Compliants&Reports.css'

type ComplaintView = 'report' | 'history'

type ComplaintFormState = {
    numberPlate: string
    timing: string
    tripNumber: string
    complaintType: ComplaintType | ''
    learnerName: string
    details: string
}

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024

const createInitialFormState = (meta: DriverComplaintFormMeta | null): ComplaintFormState => {
    const nextNumberPlate =
        meta?.assignedNumberPlate && meta.numberPlates.includes(meta.assignedNumberPlate)
            ? meta.assignedNumberPlate
            : meta?.numberPlates[0] || ''

    return {
        numberPlate: nextNumberPlate,
        timing: meta?.timingOptions[0] || 'Morning',
        tripNumber: meta?.tripNumbers[0] ? String(meta.tripNumbers[0]) : '1',
        complaintType: '',
        learnerName: '',
        details: '',
    }
}

const formatDisplayDate = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleString()
}

const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`
    }

    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
}

const DriverCompliantsReportsMenuItem = () => {
    const [activeView, setActiveView] = useState<ComplaintView>('report')
    const [meta, setMeta] = useState<DriverComplaintFormMeta | null>(null)
    const [form, setForm] = useState<ComplaintFormState>(createInitialFormState(null))
    const [reports, setReports] = useState<DriverComplaintReportRecord[]>([])
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
    const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('')
    const [isLoadingMeta, setIsLoadingMeta] = useState(true)
    const [isLoadingReports, setIsLoadingReports] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const selectedAttachmentLabel = useMemo(() => {
        if (!attachmentFile) {
            return ''
        }

        return `${attachmentFile.name} • ${formatFileSize(attachmentFile.size)}`
    }, [attachmentFile])

    useEffect(() => {
        const loadMeta = async () => {
            setIsLoadingMeta(true)
            setErrorMessage('')

            try {
                const response = await driverComplaintApi.getMeta()
                const nextMeta = response.data || null
                setMeta(nextMeta)
                setForm(createInitialFormState(nextMeta))
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to load complaint form data.')
            } finally {
                setIsLoadingMeta(false)
            }
        }

        void loadMeta()
    }, [])

    useEffect(() => {
        const loadReports = async () => {
            setIsLoadingReports(true)
            setErrorMessage('')

            try {
                const response = await driverComplaintApi.getReports()
                setReports(response.data?.reports || [])
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to load complaint reports.')
            } finally {
                setIsLoadingReports(false)
            }
        }

        void loadReports()
    }, [])

    useEffect(() => {
        if (!attachmentFile) {
            setAttachmentPreviewUrl('')
            return
        }

        const nextPreviewUrl = URL.createObjectURL(attachmentFile)
        setAttachmentPreviewUrl(nextPreviewUrl)

        return () => {
            URL.revokeObjectURL(nextPreviewUrl)
        }
    }, [attachmentFile])

    const refreshReports = async (withLoader = true) => {
        if (withLoader) {
            setIsLoadingReports(true)
        }

        setErrorMessage('')

        try {
            const response = await driverComplaintApi.getReports()
            setReports(response.data?.reports || [])
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load complaint reports.')
        } finally {
            if (withLoader) {
                setIsLoadingReports(false)
            }
        }
    }

    const handleChange = (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = event.target

        setForm((currentFormState) => {
            const nextFormState = {
                ...currentFormState,
                [name]: value,
            }

            if (name === 'complaintType' && value !== 'Learner') {
                nextFormState.learnerName = ''
            }

            return nextFormState
        })
    }

    const clearAttachment = () => {
        setAttachmentFile(null)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
        setErrorMessage('')
        const nextFile = event.target.files?.[0] || null

        if (!nextFile) {
            setAttachmentFile(null)
            return
        }

        if (!nextFile.type.startsWith('image/')) {
            clearAttachment()
            setErrorMessage('Only image files are allowed for complaint attachments.')
            return
        }

        if (nextFile.size > MAX_ATTACHMENT_SIZE_BYTES) {
            clearAttachment()
            setErrorMessage('The attachment photo must be 5MB or smaller.')
            return
        }

        setAttachmentFile(nextFile)
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')

        if (form.complaintType === 'Learner' && !form.learnerName.trim()) {
            setErrorMessage('Learner name is required when complaint type is Learner.')
            return
        }

        setIsSubmitting(true)

        try {
            const payload = new FormData()
            payload.append('numberPlate', form.numberPlate)
            payload.append('timing', form.timing)
            payload.append('tripNumber', form.tripNumber)
            payload.append('complaintType', form.complaintType)
            payload.append('learnerName', form.learnerName.trim())
            payload.append('details', form.details.trim())

            if (attachmentFile) {
                payload.append('attachment', attachmentFile)
            }

            await driverComplaintApi.createReport(payload)

            setSuccessMessage('Complaint report submitted successfully.')
            setForm(createInitialFormState(meta))
            clearAttachment()
            setActiveView('history')
            await refreshReports(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to submit complaint report.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoadingMeta) {
        return <Loader variant="section" label="Loading complaints form" />
    }

    return (
        <section className="driverMenuCompliantsReports">
            <div className="driverMenuCompliantsReports__tabs">
                <button
                    type="button"
                    className={
                        activeView === 'report'
                            ? 'driverMenuCompliantsReports__tab driverMenuCompliantsReports__tab--active'
                            : 'driverMenuCompliantsReports__tab'
                    }
                    onClick={() => setActiveView('report')}
                >
                    Complaint Form
                </button>

                <button
                    type="button"
                    className={
                        activeView === 'history'
                            ? 'driverMenuCompliantsReports__tab driverMenuCompliantsReports__tab--active'
                            : 'driverMenuCompliantsReports__tab'
                    }
                    onClick={() => setActiveView('history')}
                >
                    Submitted Reports
                </button>
            </div>

            {errorMessage ? (
                <p className="driverMenuCompliantsReports__status driverMenuCompliantsReports__status--error">
                    {errorMessage}
                </p>
            ) : null}

            {successMessage ? (
                <p className="driverMenuCompliantsReports__status driverMenuCompliantsReports__status--success">
                    {successMessage}
                </p>
            ) : null}

            {activeView === 'report' ? (
                <>
                    <div className="driverMenuCompliantsReports__header">
                        <div>
                            <h3 className="driverMenuCompliantsReports__title">Complaints & Reports</h3>
                            <p className="driverMenuCompliantsReports__description">
                                Record trip complaints using the logged-in user details and active
                                bus or van number plates from the database.
                            </p>
                        </div>
                    </div>

                    <form className="driverMenuCompliantsReports__form" onSubmit={handleSubmit}>
                        <div className="driverMenuCompliantsReports__grid">
                            <label>
                                Requested by
                                <input
                                    type="text"
                                    value={meta?.requestedBy || ''}
                                    disabled
                                    readOnly
                                />
                            </label>

                            <label>
                                Contact
                                <input
                                    type="text"
                                    value={meta?.contactPhoneNumber || ''}
                                    disabled
                                    readOnly
                                />
                            </label>

                            <label>
                                Bus / Van Number Plate
                                <select
                                    name="numberPlate"
                                    value={form.numberPlate}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                >
                                    <option value="">Select number plate</option>
                                    {(meta?.numberPlates || []).map((numberPlate) => (
                                        <option key={numberPlate} value={numberPlate}>
                                            {numberPlate}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Timing
                                <select
                                    name="timing"
                                    value={form.timing}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                >
                                    {(meta?.timingOptions || []).map((timingOption) => (
                                        <option key={timingOption} value={timingOption}>
                                            {timingOption}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Trip Number
                                <select
                                    name="tripNumber"
                                    value={form.tripNumber}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                >
                                    {(meta?.tripNumbers || []).map((tripNumber) => (
                                        <option key={tripNumber} value={tripNumber}>
                                            Trip {tripNumber}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Complaint Type
                                <select
                                    name="complaintType"
                                    value={form.complaintType}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                >
                                    <option value="">Select complaint type</option>
                                    {(meta?.complaintTypes || []).map((complaintType) => (
                                        <option key={complaintType} value={complaintType}>
                                            {complaintType}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {form.complaintType === 'Learner' ? (
                                <label className="driverMenuCompliantsReports__fullWidth">
                                    Learner Name
                                    <input
                                        type="text"
                                        name="learnerName"
                                        value={form.learnerName}
                                        onChange={handleChange}
                                        placeholder="Enter learner name"
                                        disabled={isSubmitting}
                                        required
                                    />
                                </label>
                            ) : null}

                            <label className="driverMenuCompliantsReports__fullWidth">
                                Details or Description of Request / Complaint
                                <textarea
                                    name="details"
                                    value={form.details}
                                    onChange={handleChange}
                                    placeholder="Describe the request or complaint in detail"
                                    disabled={isSubmitting}
                                    required
                                />
                            </label>

                            <div className="driverMenuCompliantsReports__fullWidth driverMenuCompliantsReports__attachmentPanel">
                                <div className="driverMenuCompliantsReports__attachmentHeader">
                                    <div>
                                        <h4>Attachment Photo</h4>
                                        <p>Optional. One photo only, maximum 5MB.</p>
                                    </div>

                                    {attachmentFile ? (
                                        <button
                                            type="button"
                                            className="driverMenuCompliantsReports__ghostButton"
                                            onClick={clearAttachment}
                                            disabled={isSubmitting}
                                        >
                                            Clear Attachment
                                        </button>
                                    ) : null}
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAttachmentChange}
                                    disabled={isSubmitting}
                                />

                                {attachmentPreviewUrl ? (
                                    <div className="driverMenuCompliantsReports__attachmentPreview">
                                        <img src={attachmentPreviewUrl} alt={attachmentFile?.name || 'Attachment preview'} />
                                        <span>{selectedAttachmentLabel}</span>
                                    </div>
                                ) : (
                                    <p className="driverMenuCompliantsReports__emptyText">
                                        No attachment selected.
                                    </p>
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting Complaint...' : 'Submit Complaint Report'}
                        </button>

                        {isSubmitting ? <Loader variant="inline" label="Submitting complaint" /> : null}
                    </form>
                </>
            ) : (
                <div className="driverMenuCompliantsReports__history">
                    <div className="driverMenuCompliantsReports__header">
                        <div>
                            <h3 className="driverMenuCompliantsReports__title">Submitted Reports</h3>
                            <p className="driverMenuCompliantsReports__description">
                                Review previously submitted complaints and any attached photo.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="driverMenuCompliantsReports__ghostButton"
                            onClick={() => void refreshReports(true)}
                            disabled={isLoadingReports}
                        >
                            {isLoadingReports ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>

                    {isLoadingReports ? (
                        <Loader variant="section" label="Loading complaints" />
                    ) : null}

                    {!isLoadingReports && reports.length === 0 ? (
                        <p className="driverMenuCompliantsReports__emptyText">
                            No complaint reports have been submitted yet.
                        </p>
                    ) : null}

                    {!isLoadingReports && reports.length > 0 ? (
                        <ul className="driverMenuCompliantsReports__historyList">
                            {reports.map((report) => (
                                <li key={report.id} className="driverMenuCompliantsReports__historyItem">
                                    <div className="driverMenuCompliantsReports__historyTop">
                                        <div>
                                            <strong>{report.requestedBy}</strong>
                                            <span>{report.contactPhoneNumber}</span>
                                        </div>

                                        <span className="driverMenuCompliantsReports__badge">
                                            {report.numberPlate}
                                        </span>
                                    </div>

                                    <div className="driverMenuCompliantsReports__metaGrid">
                                        <div>
                                            <h4>Timing</h4>
                                            <p>{report.timing}</p>
                                        </div>

                                        <div>
                                            <h4>Trip Number</h4>
                                            <p>Trip {report.tripNumber}</p>
                                        </div>

                                        <div>
                                            <h4>Complaint Type</h4>
                                            <p>{report.complaintType}</p>
                                        </div>

                                        <div>
                                            <h4>Submitted</h4>
                                            <p>{formatDisplayDate(report.createdAt)}</p>
                                        </div>

                                        <div>
                                            <h4>Status</h4>
                                            <p>
                                                <strong
                                                    style={{
                                                        color:
                                                            report.status === 'Approved'
                                                                ? '#22c55e'
                                                                : report.status === 'Rejected'
                                                                  ? '#ef4444'
                                                                  : '#f59e0b',
                                                    }}
                                                >
                                                    {report.status}
                                                </strong>
                                            </p>
                                        </div>

                                        {report.confirmedBy ? (
                                            <div>
                                                <h4>Confirmed By</h4>
                                                <p>{report.confirmedBy}</p>
                                            </div>
                                        ) : null}
                                    </div>

                                    {report.complaintType === 'Learner' && report.learnerName ? (
                                        <div className="driverMenuCompliantsReports__detailBlock">
                                            <h4>Learner Name</h4>
                                            <p>{report.learnerName}</p>
                                        </div>
                                    ) : null}

                                    <div className="driverMenuCompliantsReports__detailBlock">
                                        <h4>Details</h4>
                                        <p>{report.details}</p>
                                    </div>

                                    <div className="driverMenuCompliantsReports__detailBlock">
                                        <h4>Attachment</h4>
                                        {report.attachment ? (
                                            <a
                                                href={report.attachment.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="driverMenuCompliantsReports__attachmentLink"
                                            >
                                                <img
                                                    src={report.attachment.fileUrl}
                                                    alt={report.attachment.fileName}
                                                    loading="lazy"
                                                />
                                                <span>{report.attachment.fileName}</span>
                                            </a>
                                        ) : (
                                            <p>No attachment uploaded.</p>
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

export default DriverCompliantsReportsMenuItem
