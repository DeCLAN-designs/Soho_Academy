import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
    transportManagerApi,
    type ParentTransportRequestDetailRecord,
    type ParentTransportRequestRecord,
    type ParentTransportRequestStatus,
    type ParentTransportRequestType,
} from '../../../../../../lib/api'
import Loader from '../../../../../Loader/Loader'
import './ChangeRequests.css'

const REQUEST_TYPE_LABELS: Record<ParentTransportRequestType, string> = {
    route_change: 'Route Change',
    complaint: 'Complaint',
    general_support: 'General Support',
}

const formatTimestamp = (value: string | null) => {
    if (!value) return 'N/A'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value

    return parsed.toLocaleString()
}

const getStatusBadgeClass = (status: ParentTransportRequestStatus) => {
    switch (status) {
        case 'APPROVED':
            return 'change-requests__badge change-requests__badge--approved'
        case 'REJECTED':
            return 'change-requests__badge change-requests__badge--rejected'
        case 'PENDING':
        default:
            return 'change-requests__badge change-requests__badge--pending'
    }
}

const ChangeRequests = () => {
    const [requests, setRequests] = useState<ParentTransportRequestRecord[]>([])
    const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)
    const [selectedDetail, setSelectedDetail] =
        useState<ParentTransportRequestDetailRecord | null>(null)
    const [statusFilter, setStatusFilter] = useState<'ALL' | ParentTransportRequestStatus>('ALL')
    const [reviewNotes, setReviewNotes] = useState('')
    const [reviewStatus, setReviewStatus] =
        useState<Extract<ParentTransportRequestStatus, 'APPROVED' | 'REJECTED'>>('APPROVED')
    const [isLoading, setIsLoading] = useState(true)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [isReviewing, setIsReviewing] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const summary = useMemo(
        () => ({
            pending: requests.filter((request) => request.status === 'PENDING').length,
            approved: requests.filter((request) => request.status === 'APPROVED').length,
            rejected: requests.filter((request) => request.status === 'REJECTED').length,
        }),
        [requests]
    )

    const filteredRequests = useMemo(() => {
        if (statusFilter === 'ALL') {
            return requests
        }

        return requests.filter((request) => request.status === statusFilter)
    }, [requests, statusFilter])

    const loadRequests = async (withLoader = true) => {
        if (withLoader) {
            setIsLoading(true)
        }

        setErrorMessage('')

        try {
            const response = await transportManagerApi.getParentRequests()
            const nextRequests = response.data?.requests || []
            setRequests(nextRequests)

            if (nextRequests.length === 0) {
                setSelectedRequestId(null)
                setSelectedDetail(null)
                return
            }

            const stillSelected = nextRequests.some((request) => request.id === selectedRequestId)
            if (!stillSelected) {
                setSelectedRequestId(nextRequests[0].id)
            }
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to load change requests.'
            )
        } finally {
            if (withLoader) {
                setIsLoading(false)
            }
        }
    }

    const loadRequestDetail = async (requestId: number) => {
        setIsDetailLoading(true)
        setErrorMessage('')

        try {
            const response = await transportManagerApi.getParentRequest(requestId)
            setSelectedDetail(response.data || null)
        } catch (error) {
            setSelectedDetail(null)
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to load request details.'
            )
        } finally {
            setIsDetailLoading(false)
        }
    }

    useEffect(() => {
        void loadRequests(true)
    }, [])

    useEffect(() => {
        if (!selectedRequestId) {
            setSelectedDetail(null)
            return
        }

        void loadRequestDetail(selectedRequestId)
    }, [selectedRequestId])

    useEffect(() => {
        if (!selectedDetail?.request) {
            setReviewNotes('')
            return
        }

        setReviewNotes(selectedDetail.request.managerReviewNotes || '')
    }, [selectedDetail?.request?.id])

    const handleReview = async (event: FormEvent) => {
        event.preventDefault()

        if (!selectedRequestId || selectedDetail?.request.status !== 'PENDING') {
            return
        }

        setIsReviewing(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            const response = await transportManagerApi.reviewParentRequest(selectedRequestId, {
                status: reviewStatus,
                managerReviewNotes: reviewNotes.trim() || null,
            })

            setSelectedDetail(response.data || null)
            setSuccessMessage(
                reviewStatus === 'APPROVED'
                    ? 'Change request approved successfully.'
                    : 'Change request rejected successfully.'
            )
            await loadRequests(false)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to submit review.'
            )
        } finally {
            setIsReviewing(false)
        }
    }

    if (isLoading) {
        return <Loader variant="section" label="Loading change requests..." />
    }

    return (
        <div className="change-requests">
            <header className="change-requests__header">
                <div>
                    <h2 className="change-requests__title">Change Requests</h2>
                    <p className="change-requests__description">
                        Review parent-submitted route, stop, and schedule change requests.
                    </p>
                </div>
                <button
                    type="button"
                    className="change-requests__refresh"
                    onClick={() => void loadRequests(true)}
                >
                    Refresh
                </button>
            </header>

            {successMessage ? (
                <div className="change-requests__message change-requests__message--success">
                    {successMessage}
                </div>
            ) : null}

            {errorMessage ? (
                <div className="change-requests__message change-requests__message--error">
                    {errorMessage}
                </div>
            ) : null}

            <div className="change-requests__stats">
                <article className="change-requests__stat-card">
                    <span className="change-requests__stat-value">{summary.pending}</span>
                    <span className="change-requests__stat-label">Pending</span>
                </article>
                <article className="change-requests__stat-card">
                    <span className="change-requests__stat-value">{summary.approved}</span>
                    <span className="change-requests__stat-label">Approved</span>
                </article>
                <article className="change-requests__stat-card">
                    <span className="change-requests__stat-value">{summary.rejected}</span>
                    <span className="change-requests__stat-label">Rejected</span>
                </article>
            </div>

            <div className="change-requests__toolbar">
                <label className="change-requests__filter">
                    <span>Status</span>
                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(event.target.value as typeof statusFilter)
                        }
                    >
                        <option value="ALL">All requests</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </label>
            </div>

            <div className="change-requests__layout">
                <section className="change-requests__list" aria-label="Change request list">
                    {filteredRequests.length === 0 ? (
                        <p className="change-requests__empty">No change requests found.</p>
                    ) : (
                        filteredRequests.map((request) => (
                            <button
                                key={request.id}
                                type="button"
                                className={
                                    selectedRequestId === request.id
                                        ? 'change-requests__card change-requests__card--active'
                                        : 'change-requests__card'
                                }
                                onClick={() => setSelectedRequestId(request.id)}
                            >
                                <div className="change-requests__card-header">
                                    <strong>{request.requestTitle}</strong>
                                    <span className={getStatusBadgeClass(request.status)}>
                                        {request.status}
                                    </span>
                                </div>
                                <p>
                                    {REQUEST_TYPE_LABELS[request.requestType]} for{' '}
                                    {request.studentName}
                                </p>
                                <p className="change-requests__card-meta">
                                    Parent: {request.parentName || 'Unknown'}
                                </p>
                                <p className="change-requests__card-meta">
                                    Submitted {formatTimestamp(request.createdAt)}
                                </p>
                            </button>
                        ))
                    )}
                </section>

                <section className="change-requests__detail" aria-label="Change request detail">
                    {isDetailLoading ? (
                        <Loader variant="section" label="Loading request detail" />
                    ) : selectedDetail?.request ? (
                        <div className="change-requests__detail-content">
                            <div className="change-requests__detail-header">
                                <div>
                                    <h3>{selectedDetail.request.requestTitle}</h3>
                                    <p>
                                        {REQUEST_TYPE_LABELS[selectedDetail.request.requestType]} for{' '}
                                        {selectedDetail.request.studentName}
                                    </p>
                                </div>
                                <span className={getStatusBadgeClass(selectedDetail.request.status)}>
                                    {selectedDetail.request.status}
                                </span>
                            </div>

                            <dl className="change-requests__detail-grid">
                                <div>
                                    <dt>Parent</dt>
                                    <dd>{selectedDetail.request.parentName || 'Unknown'}</dd>
                                </div>
                                <div>
                                    <dt>Student</dt>
                                    <dd>
                                        {selectedDetail.request.studentName} (
                                        {selectedDetail.request.admissionNumber})
                                    </dd>
                                </div>
                                <div>
                                    <dt>Grade / Stream</dt>
                                    <dd>
                                        Grade {selectedDetail.request.grade} ·{' '}
                                        {selectedDetail.request.stream}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Current Route</dt>
                                    <dd>
                                        {selectedDetail.request.currentRouteCode
                                            ? `${selectedDetail.request.currentRouteCode} - ${selectedDetail.request.currentRouteName}`
                                            : 'No active route linked'}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Pickup Location</dt>
                                    <dd>
                                        {selectedDetail.request.requestedPickupLocation ||
                                            'Not provided'}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Drop-off Location</dt>
                                    <dd>
                                        {selectedDetail.request.requestedDropoffLocation ||
                                            'Not provided'}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Preferred Effective Date</dt>
                                    <dd>
                                        {selectedDetail.request.preferredEffectiveDate ||
                                            'Not provided'}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Reviewed By</dt>
                                    <dd>
                                        {selectedDetail.request.reviewedByName || 'Pending review'}
                                    </dd>
                                </div>
                            </dl>

                            <div className="change-requests__detail-block">
                                <h4>Request Details</h4>
                                <p>{selectedDetail.request.requestDetails}</p>
                            </div>

                            {selectedDetail.request.status === 'PENDING' ? (
                                <form className="change-requests__review-form" onSubmit={handleReview}>
                                    <h4>Manager Review</h4>
                                    <label className="change-requests__field">
                                        <span>Decision</span>
                                        <select
                                            value={reviewStatus}
                                            onChange={(event) =>
                                                setReviewStatus(
                                                    event.target
                                                        .value as typeof reviewStatus
                                                )
                                            }
                                        >
                                            <option value="APPROVED">Approve</option>
                                            <option value="REJECTED">Reject</option>
                                        </select>
                                    </label>
                                    <label className="change-requests__field change-requests__field--full">
                                        <span>Review Notes</span>
                                        <textarea
                                            value={reviewNotes}
                                            onChange={(event) => setReviewNotes(event.target.value)}
                                            rows={4}
                                            placeholder="Add notes for the parent and audit trail"
                                        />
                                    </label>
                                    <button
                                        type="submit"
                                        className="change-requests__submit"
                                        disabled={isReviewing}
                                    >
                                        {isReviewing ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                </form>
                            ) : (
                                <div className="change-requests__detail-block">
                                    <h4>Manager Review Notes</h4>
                                    <p>
                                        {selectedDetail.request.managerReviewNotes ||
                                            'No review notes recorded.'}
                                    </p>
                                    <p className="change-requests__card-meta">
                                        Reviewed {formatTimestamp(selectedDetail.request.reviewedAt)}
                                    </p>
                                </div>
                            )}

                            <div className="change-requests__detail-block">
                                <h4>Audit Trail</h4>
                                {selectedDetail.auditLogs.length === 0 ? (
                                    <p className="change-requests__empty">No audit events yet.</p>
                                ) : (
                                    <ul className="change-requests__audit-list">
                                        {selectedDetail.auditLogs.map((log) => (
                                            <li key={log.id} className="change-requests__audit-item">
                                                <strong>{log.action}</strong>
                                                <span>
                                                    {log.actorName || 'System'} ·{' '}
                                                    {formatTimestamp(log.createdAt)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="change-requests__empty">Select a request to view details.</p>
                    )}
                </section>
            </div>
        </div>
    )
}

export default ChangeRequests
