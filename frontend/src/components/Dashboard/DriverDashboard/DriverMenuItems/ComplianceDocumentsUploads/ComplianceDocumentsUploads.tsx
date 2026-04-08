import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
    driverComplianceDocumentApi,
    type ComplianceDocumentType,
    type DriverComplianceDocumentRecord,
} from '../../../../../lib/api'
import { useAuth } from '../../../../../contexts/AuthContext'
import Loader from '../../../../Loader/Loader'
import './ComplianceDocumentsUploads.css'

const DOCUMENT_RELATED_TO = 'Driver'
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024
const DOCUMENT_TYPES: ComplianceDocumentType[] = [
    'Insurance',
    'NTSA Inspection',
    'Speed Governor',
    'RSL',
    'Driving License',
    'PSV',
    'Police Clearance',
    'Warranty Certificate',
    'Other',
]

type ComplianceDocumentFormState = {
    documentType: ComplianceDocumentType | ''
    validFromDate: string
    validToDate: string
}

type StatusMessage = {
    tone: 'success' | 'error'
    message: string
} | null

type RenewalInfo = {
    tone: 'active' | 'warning' | 'expired'
    label: string
}

const formatDate = (value: string) => {
    const date = new Date(`${value}T00:00:00`)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleDateString()
}

const formatTimestamp = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleString()
}

const buildUploadedByName = (firstName?: string, lastName?: string) => {
    const fullName = [firstName, lastName]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' ')
        .trim()

    return fullName || 'Current Driver'
}

const formatDateRange = (validFromDate: string, validToDate: string) => {
    return [formatDate(validFromDate), formatDate(validToDate)].filter(Boolean).join(' to ')
}

const getRenewalInfo = (validToDate: string): RenewalInfo | null => {
    if (!validToDate) {
        return null
    }

    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const expiryDate = new Date(`${validToDate}T00:00:00`)

    if (Number.isNaN(expiryDate.getTime())) {
        return null
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000
    const daysUntilExpiry = Math.round((expiryDate.getTime() - startOfToday.getTime()) / millisecondsPerDay)

    if (daysUntilExpiry < 0) {
        const elapsedDays = Math.abs(daysUntilExpiry)
        return {
            tone: 'expired',
            label: `Expired ${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago. Renew immediately.`,
        }
    }

    if (daysUntilExpiry === 0) {
        return {
            tone: 'expired',
            label: 'Expires today. Renew immediately.',
        }
    }

    if (daysUntilExpiry <= 30) {
        return {
            tone: 'warning',
            label: `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Renewal is due soon.`,
        }
    }

    return {
        tone: 'active',
        label: `Valid for ${daysUntilExpiry} more day${daysUntilExpiry === 1 ? '' : 's'}.`,
    }
}

const isAllowedDocumentFile = (file: File) => {
    const mimeType = String(file.type || '').toLowerCase()
    return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

const DriverComplianceDocumentsUploadsMenuItem = () => {
    const { user } = useAuth()
    const [documents, setDocuments] = useState<DriverComplianceDocumentRecord[]>([])
    const [formData, setFormData] = useState<ComplianceDocumentFormState>({
        documentType: '',
        validFromDate: '',
        validToDate: '',
    })
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [fileInputKey, setFileInputKey] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [statusMessage, setStatusMessage] = useState<StatusMessage>(null)

    const uploadedByName = buildUploadedByName(user?.firstName, user?.lastName)
    const renewalInfo = getRenewalInfo(formData.validToDate)

    const loadDocuments = async (withLoader = true) => {
        if (withLoader) {
            setIsLoading(true)
        } else {
            setIsRefreshing(true)
        }

        setErrorMessage('')

        try {
            const response = await driverComplianceDocumentApi.getDocuments()
            setDocuments(response.data?.documents || [])
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to load compliance documents.'
            )
        } finally {
            if (withLoader) {
                setIsLoading(false)
            } else {
                setIsRefreshing(false)
            }
        }
    }

    useEffect(() => {
        void loadDocuments(true)
    }, [])

    const handleInputChange = (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = event.target

        setFormData((currentFormData) => ({
            ...currentFormData,
            [name]: value,
        }))
        setStatusMessage(null)
    }

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0] || null

        if (!nextFile) {
            setSelectedFile(null)
            return
        }

        if (!isAllowedDocumentFile(nextFile)) {
            setStatusMessage({
                tone: 'error',
                message: 'Only PDF or image files are allowed for compliance documents.',
            })
            event.target.value = ''
            return
        }

        if (nextFile.size > MAX_DOCUMENT_SIZE_BYTES) {
            setStatusMessage({
                tone: 'error',
                message: 'The compliance document must be 10MB or smaller.',
            })
            event.target.value = ''
            return
        }

        setSelectedFile(nextFile)
        setStatusMessage(null)
    }

    const resetForm = () => {
        setFormData({
            documentType: '',
            validFromDate: '',
            validToDate: '',
        })
        setSelectedFile(null)
        setFileInputKey((currentValue) => currentValue + 1)
        setStatusMessage(null)
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!formData.documentType) {
            setStatusMessage({
                tone: 'error',
                message: 'Choose a document type before uploading.',
            })
            return
        }

        if (!formData.validFromDate || !formData.validToDate) {
            setStatusMessage({
                tone: 'error',
                message: 'Choose both validity dates before uploading.',
            })
            return
        }

        if (new Date(`${formData.validToDate}T00:00:00`).getTime() < new Date(`${formData.validFromDate}T00:00:00`).getTime()) {
            setStatusMessage({
                tone: 'error',
                message: 'Validity To must be the same as or later than Validity From.',
            })
            return
        }

        if (!selectedFile) {
            setStatusMessage({
                tone: 'error',
                message: 'Add a scanned document file before uploading.',
            })
            return
        }

        setIsSubmitting(true)
        setErrorMessage('')
        setStatusMessage(null)

        const payload = new FormData()
        payload.append('relatedTo', DOCUMENT_RELATED_TO)
        payload.append('documentType', formData.documentType)
        payload.append('validFromDate', formData.validFromDate)
        payload.append('validToDate', formData.validToDate)
        payload.append('documentFile', selectedFile)

        try {
            const response = await driverComplianceDocumentApi.createDocument(payload)
            const nextDocument = response.data?.document

            if (nextDocument) {
                setDocuments((currentDocuments) => [nextDocument, ...currentDocuments])
            }

            resetForm()
            setStatusMessage({
                tone: 'success',
                message: 'Compliance document uploaded successfully.',
            })
        } catch (error) {
            setStatusMessage({
                tone: 'error',
                message: error instanceof Error ? error.message : 'Failed to upload compliance document.',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return <Loader variant="section" label="Loading compliance documents" />
    }

    return (
        <section className="driverComplianceDocuments">
            <div className="driverComplianceDocuments__header">
                <div>
                    <h3 className="driverComplianceDocuments__title">Compliance Documents</h3>
                    <p className="driverComplianceDocuments__description">
                        Upload clear scanned driver compliance documents and keep an eye on expiry
                        dates before renewal is due.
                    </p>
                </div>

                <button
                    type="button"
                    className="driverComplianceDocuments__ghostButton"
                    onClick={() => void loadDocuments(false)}
                    disabled={isRefreshing || isSubmitting}
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {errorMessage ? (
                <p className="driverComplianceDocuments__status driverComplianceDocuments__status--error">
                    {errorMessage}
                </p>
            ) : null}

            {statusMessage ? (
                <p
                    className={
                        statusMessage.tone === 'success'
                            ? 'driverComplianceDocuments__status driverComplianceDocuments__status--success'
                            : 'driverComplianceDocuments__status driverComplianceDocuments__status--error'
                    }
                >
                    {statusMessage.message}
                </p>
            ) : null}

            <div className="driverComplianceDocuments__content">
                <section className="driverComplianceDocuments__panel">
                    <div className="driverComplianceDocuments__panelHeader">
                        <h4>Upload Document</h4>
                        <span>10MB file max</span>
                    </div>

                    <form className="driverComplianceDocuments__form" onSubmit={handleSubmit}>
                        <div className="driverComplianceDocuments__formGrid">
                            <label className="driverComplianceDocuments__field">
                                <span>Document Related To</span>
                                <input type="text" value={DOCUMENT_RELATED_TO} readOnly aria-readonly="true" />
                            </label>

                            <label className="driverComplianceDocuments__field">
                                <span>Document Type</span>
                                <select
                                    name="documentType"
                                    value={formData.documentType}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Select document type</option>
                                    {DOCUMENT_TYPES.map((documentType) => (
                                        <option key={documentType} value={documentType}>
                                            {documentType}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="driverComplianceDocuments__field">
                                <span>Validity From</span>
                                <input
                                    type="date"
                                    name="validFromDate"
                                    value={formData.validFromDate}
                                    onChange={handleInputChange}
                                />
                            </label>

                            <label className="driverComplianceDocuments__field">
                                <span>Validity To</span>
                                <input
                                    type="date"
                                    name="validToDate"
                                    value={formData.validToDate}
                                    onChange={handleInputChange}
                                />
                            </label>

                            <label className="driverComplianceDocuments__field">
                                <span>Uploaded By</span>
                                <input type="text" value={uploadedByName} readOnly aria-readonly="true" />
                            </label>
                        </div>

                        {renewalInfo ? (
                            <div
                                className={
                                    renewalInfo.tone === 'expired'
                                        ? 'driverComplianceDocuments__renewalNotice driverComplianceDocuments__renewalNotice--expired'
                                        : renewalInfo.tone === 'warning'
                                          ? 'driverComplianceDocuments__renewalNotice driverComplianceDocuments__renewalNotice--warning'
                                          : 'driverComplianceDocuments__renewalNotice driverComplianceDocuments__renewalNotice--active'
                                }
                            >
                                {renewalInfo.label}
                            </div>
                        ) : null}

                        <div className="driverComplianceDocuments__uploadPanel">
                            <div className="driverComplianceDocuments__uploadHeader">
                                <h5>Copy of the Document</h5>
                                <p>Disclaimer: Please upload a clear scanned document.</p>
                            </div>

                            <input
                                key={fileInputKey}
                                type="file"
                                accept="application/pdf,image/*"
                                onChange={handleFileChange}
                            />

                            <p className="driverComplianceDocuments__fileMeta">
                                {selectedFile
                                    ? `${selectedFile.name} • ${Math.max(
                                          1,
                                          Math.round(selectedFile.size / 1024)
                                      )} KB`
                                    : 'No file selected yet.'}
                            </p>
                        </div>

                        <div className="driverComplianceDocuments__actions">
                            <button
                                type="button"
                                className="driverComplianceDocuments__ghostButton"
                                onClick={resetForm}
                                disabled={isSubmitting}
                            >
                                Reset
                            </button>

                            <button
                                type="submit"
                                className="driverComplianceDocuments__primaryButton"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Uploading...' : 'Upload document'}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="driverComplianceDocuments__panel">
                    <div className="driverComplianceDocuments__panelHeader">
                        <h4>Uploaded Documents</h4>
                        <span>{documents.length} record{documents.length === 1 ? '' : 's'}</span>
                    </div>

                    {documents.length === 0 ? (
                        <p className="driverComplianceDocuments__emptyText">
                            No compliance documents have been uploaded yet.
                        </p>
                    ) : (
                        <ul className="driverComplianceDocuments__documentList">
                            {documents.map((document) => {
                                const documentRenewalInfo = getRenewalInfo(document.validToDate)

                                return (
                                    <li key={document.id} className="driverComplianceDocuments__documentCard">
                                        <div className="driverComplianceDocuments__documentTop">
                                            <div>
                                                <strong>{document.documentType}</strong>
                                                <span>{formatDateRange(document.validFromDate, document.validToDate)}</span>
                                            </div>

                                            {documentRenewalInfo ? (
                                                <span
                                                    className={
                                                        documentRenewalInfo.tone === 'expired'
                                                            ? 'driverComplianceDocuments__badge driverComplianceDocuments__badge--expired'
                                                            : documentRenewalInfo.tone === 'warning'
                                                              ? 'driverComplianceDocuments__badge driverComplianceDocuments__badge--warning'
                                                              : 'driverComplianceDocuments__badge driverComplianceDocuments__badge--active'
                                                    }
                                                >
                                                    {documentRenewalInfo.tone === 'expired'
                                                        ? 'Expired'
                                                        : documentRenewalInfo.tone === 'warning'
                                                          ? 'Renew Soon'
                                                          : 'Active'}
                                                </span>
                                            ) : null}
                                        </div>

                                        <p className="driverComplianceDocuments__documentReminder">
                                            {documentRenewalInfo?.label || 'Validity range not available.'}
                                        </p>

                                        <div className="driverComplianceDocuments__metaGrid">
                                            <div>
                                                <span>Related To</span>
                                                <strong>{document.relatedTo}</strong>
                                            </div>

                                            <div>
                                                <span>Valid From</span>
                                                <strong>{formatDate(document.validFromDate)}</strong>
                                            </div>

                                            <div>
                                                <span>Valid To</span>
                                                <strong>{formatDate(document.validToDate)}</strong>
                                            </div>

                                            <div>
                                                <span>Uploaded By</span>
                                                <strong>{document.uploadedBy}</strong>
                                            </div>

                                            <div>
                                                <span>Uploaded At</span>
                                                <strong>{formatTimestamp(document.createdAt)}</strong>
                                            </div>

                                            <div>
                                                <span>File</span>
                                                <strong>{document.fileName}</strong>
                                            </div>
                                        </div>

                                        <a
                                            className="driverComplianceDocuments__fileLink"
                                            href={document.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open document
                                        </a>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </section>
    )
}

export default DriverComplianceDocumentsUploadsMenuItem
