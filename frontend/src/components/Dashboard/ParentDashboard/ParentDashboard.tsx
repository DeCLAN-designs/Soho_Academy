import type { DashboardRoleConfig } from '../dashboard.types'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
    parentApi,
    type CreateParentTransportRequestPayload,
    type ParentChildRecord,
    type ParentTransportRequestDetailRecord,
    type ParentTransportRequestRecord,
    type ParentTransportRequestStatus,
    type ParentTransportRequestType,
} from '../../../lib/api'
import Loader from '../../Loader/Loader'
import './ParentDashboard.css'

type ParentDashboardProps = {
    activeSection: string
}

const REQUEST_TYPE_LABELS: Record<ParentTransportRequestType, string> = {
    route_change: 'Route Change',
    complaint: 'Complaint',
    general_support: 'General Support',
}

const formatTimestampValue = (value: string | null) => {
    if (!value) return 'N/A'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value

    return parsed.toLocaleString()
}

const getStatusBadgeClass = (status: ParentTransportRequestStatus) => {
    switch (status) {
        case 'APPROVED':
            return 'parentBadge parentBadge--approved'
        case 'REJECTED':
            return 'parentBadge parentBadge--rejected'
        case 'PENDING':
        default:
            return 'parentBadge parentBadge--pending'
    }
}

export const parentDashboardConfig: DashboardRoleConfig = {
    title: 'Parent Dashboard',
    subtitle: 'Monitor your child transport schedule and controlled request workflow.',
    quickActions: ['Submit Request', 'Track Status', 'View Audit Trail'],
    navigation: [
        { id: 'overview', label: 'Overview' },
        { id: 'children', label: 'Children' },
        { id: 'trips', label: 'Trips' },
        { id: 'requests', label: 'Requests' },
        { id: 'alerts', label: 'Alerts' },
    ],
    sections: {
        overview: {
            heading: 'Parent Overview',
            description: 'See your linked children, request activity, and recent workflow updates.',
            cards: [
                'Linked children summary',
                'Pending requests',
                'Latest review updates',
            ],
        },
        children: {
            heading: 'Children Profiles',
            description: 'Review linked child transport profiles.',
            cards: [
                'Assigned student accounts',
                'Linked identity check',
                'Transport workflow visibility',
            ],
        },
        trips: {
            heading: 'Trip Timeline',
            description: 'Review transport activity and follow trip readiness.',
            cards: [
                'Trip workflow readiness',
                'Pickup and drop-off status',
                'Recent transport activity',
            ],
        },
        requests: {
            heading: 'Requests & Complaints',
            description: 'Submit transport requests for manager review and track their outcomes.',
            cards: [
                'Pending approvals',
                'Approved changes',
                'Rejected requests',
            ],
        },
        alerts: {
            heading: 'Alerts & Messages',
            description: 'Track reviewed requests and workflow updates.',
            cards: [
                'Latest decisions',
                'Manager review notes',
                'Audit trail visibility',
            ],
        },
    },
}

const getChildLabel = (child: ParentChildRecord) =>
    `${child.admissionNumber} - ${child.firstName} ${child.lastName}`.trim()

const ParentDashboard = ({ activeSection }: ParentDashboardProps) => {
    const defaultSection = parentDashboardConfig.navigation[0].id
    const resolvedSectionId = parentDashboardConfig.sections[activeSection]
        ? activeSection
        : defaultSection

    const [children, setChildren] = useState<ParentChildRecord[]>([])
    const [requests, setRequests] = useState<ParentTransportRequestRecord[]>([])
    const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)
    const [selectedRequestDetail, setSelectedRequestDetail] =
        useState<ParentTransportRequestDetailRecord | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const [requestForm, setRequestForm] = useState({
        studentId: '',
        requestType: 'route_change' as ParentTransportRequestType,
        requestTitle: '',
        requestDetails: '',
        requestedPickupLocation: '',
        requestedDropoffLocation: '',
        preferredEffectiveDate: '',
    })

    const requestSummary = useMemo(() => {
        const pending = requests.filter((request) => request.status === 'PENDING').length
        const approved = requests.filter((request) => request.status === 'APPROVED').length
        const rejected = requests.filter((request) => request.status === 'REJECTED').length

        return {
            total: requests.length,
            pending,
            approved,
            rejected,
        }
    }, [requests])

    const childrenSummary = useMemo(() => {
        const activeCount = children.filter((child) => child.status === 'active').length
        const withdrawnCount = children.filter((child) => child.status === 'withdrawn').length

        return {
            total: children.length,
            active: activeCount,
            withdrawn: withdrawnCount,
        }
    }, [children])

    const sectionCards = useMemo(() => {
        if (resolvedSectionId === 'requests') {
            return [
                `${requestSummary.pending} pending`,
                `${requestSummary.approved} approved`,
                `${requestSummary.rejected} rejected`,
            ]
        }

        if (resolvedSectionId === 'alerts') {
            return [
                `${requests.filter((request) => request.status !== 'PENDING').length} reviewed requests`,
                `${requestSummary.pending} awaiting review`,
                `${selectedRequestDetail?.auditLogs.length || 0} audit events on selected request`,
            ]
        }

        if (resolvedSectionId === 'children') {
            return [
                `${childrenSummary.total} linked children`,
                `${childrenSummary.active} active students`,
                `${requestSummary.pending} pending workflow items`,
            ]
        }

        if (resolvedSectionId === 'trips') {
            return [
                `${requestSummary.approved} approved requests`,
                `${requestSummary.pending} items awaiting manager review`,
                `${childrenSummary.active} active student profiles`,
            ]
        }

        return [
            `${childrenSummary.total} linked children`,
            `${requestSummary.pending} pending requests`,
            `${requests.filter((request) => request.status !== 'PENDING').length} reviewed requests`,
        ]
    }, [childrenSummary, requestSummary, requests, resolvedSectionId, selectedRequestDetail])

    const reviewedRequests = useMemo(
        () => requests.filter((request) => request.status !== 'PENDING').slice(0, 5),
        [requests]
    )

    const selectedRequestSummary =
        selectedRequestDetail?.request ||
        requests.find((request) => request.id === selectedRequestId) ||
        null

    const loadRequestDetail = async (requestId: number, withLoader = true) => {
        if (withLoader) {
            setIsDetailLoading(true)
        }

        try {
            const response = await parentApi.getTransportRequest(requestId)
            const detail = response.data || null
            setSelectedRequestDetail(detail)
            return detail
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load request details.')
            return null
        } finally {
            if (withLoader) {
                setIsDetailLoading(false)
            }
        }
    }

    const loadParentData = async (withLoader = true) => {
        if (withLoader) {
            setIsLoading(true)
        }

        setErrorMessage('')

        try {
            const [childrenResponse, requestsResponse] = await Promise.all([
                parentApi.getChildren(),
                parentApi.getTransportRequests(),
            ])

            setChildren(childrenResponse.data?.children || [])
            setRequests(requestsResponse.data?.requests || [])
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load parent data.')
        } finally {
            if (withLoader) {
                setIsLoading(false)
            }
        }
    }

    useEffect(() => {
        void loadParentData(true)
    }, [])

    useEffect(() => {
        if (requests.length === 0) {
            setSelectedRequestId(null)
            setSelectedRequestDetail(null)
            return
        }

        if (selectedRequestId === null || !requests.some((request) => request.id === selectedRequestId)) {
            setSelectedRequestId(requests[0].id)
        }
    }, [requests, selectedRequestId])

    useEffect(() => {
        if (!selectedRequestId) {
            setSelectedRequestDetail(null)
            return
        }

        void loadRequestDetail(selectedRequestId, true)
    }, [selectedRequestId])

    const handleSubmitRequest = async (event: FormEvent) => {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')
        setIsSubmitting(true)

        const payload: CreateParentTransportRequestPayload = {
            studentId: Number(requestForm.studentId),
            requestType: requestForm.requestType,
            requestTitle: requestForm.requestTitle.trim(),
            requestDetails: requestForm.requestDetails.trim(),
            requestedPickupLocation: requestForm.requestedPickupLocation.trim() || null,
            requestedDropoffLocation: requestForm.requestedDropoffLocation.trim() || null,
            preferredEffectiveDate: requestForm.preferredEffectiveDate || null,
        }

        try {
            const response = await parentApi.createTransportRequest(payload)
            const detail = response.data || null
            const requestId = detail?.request.id || null

            setSelectedRequestDetail(detail)
            setSelectedRequestId(requestId)
            setSuccessMessage('Request submitted successfully. It is now pending manager review.')
            setRequestForm({
                studentId: '',
                requestType: 'route_change',
                requestTitle: '',
                requestDetails: '',
                requestedPickupLocation: '',
                requestedDropoffLocation: '',
                preferredEffectiveDate: '',
            })
            await loadParentData(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to submit request.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderOverviewContent = () => (
        <div className="parentPanel">
            <div className="parentStats">
                <article className="parentStatCard">
                    <p>Children Linked</p>
                    <strong>{childrenSummary.total}</strong>
                </article>
                <article className="parentStatCard">
                    <p>Pending Requests</p>
                    <strong>{requestSummary.pending}</strong>
                </article>
                <article className="parentStatCard">
                    <p>Reviewed Requests</p>
                    <strong>{requestSummary.approved + requestSummary.rejected}</strong>
                </article>
            </div>

            <div className="parentLists">
                <section className="parentRecords" aria-label="Children preview">
                    <div className="parentRecordsHeader">
                        <h3>My Children</h3>
                        <button
                            type="button"
                            className="parentGhostButton"
                            onClick={() => void loadParentData(true)}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                    {isLoading ? (
                        <Loader variant="section" label="Loading children" />
                    ) : (
                        <ul>
                            {children.length === 0 ? (
                                <li className="parentListItem parentListItem--empty">
                                    No children are linked to this parent account yet.
                                </li>
                            ) : null}
                            {children.slice(0, 5).map((child) => (
                                <li key={child.id} className="parentListItem">
                                    <span className="parentPrimary">{getChildLabel(child)}</span>
                                    <span className="parentMuted">
                                        {child.grade} {child.stream}
                                    </span>
                                    <span
                                        className={
                                            child.status === 'active'
                                                ? 'parentBadge parentBadge--active'
                                                : 'parentBadge parentBadge--withdrawn'
                                        }
                                    >
                                        {child.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="parentRecords" aria-label="Latest request updates">
                    <h3>Latest Request Updates</h3>
                    <ul>
                        {reviewedRequests.length === 0 ? (
                            <li className="parentListItem parentListItem--empty">
                                No reviewed requests yet. Decisions from transport management will show here.
                            </li>
                        ) : (
                            reviewedRequests.map((request) => (
                                <li key={request.id} className="parentListItem">
                                    <span className="parentPrimary">{request.requestTitle}</span>
                                    <span className="parentMuted">
                                        {REQUEST_TYPE_LABELS[request.requestType]} for {request.studentName}
                                    </span>
                                    <span className={getStatusBadgeClass(request.status)}>
                                        {request.status}
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </section>
            </div>
        </div>
    )

    const renderChildrenContent = () => (
        <div className="parentPanel">
            <section className="parentRecords parentRecords--wide" aria-label="Children list">
                <div className="parentRecordsHeader">
                    <div>
                        <h3>Children Profiles</h3>
                        <p className="parentHint">
                            Children are matched using your Parent ID or Passport identifier.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="parentGhostButton"
                        onClick={() => void loadParentData(true)}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
                {isLoading ? (
                    <Loader variant="section" label="Loading children" />
                ) : (
                    <ul>
                        {children.length === 0 ? (
                            <li className="parentListItem parentListItem--empty">
                                No children are linked to this parent account yet.
                            </li>
                        ) : null}
                        {children.map((child) => (
                            <li key={child.id} className="parentListItem">
                                <span className="parentPrimary">{getChildLabel(child)}</span>
                                <span className="parentMuted">
                                    {child.grade} {child.stream}
                                </span>
                                <span
                                    className={
                                        child.status === 'active'
                                            ? 'parentBadge parentBadge--active'
                                            : 'parentBadge parentBadge--withdrawn'
                                    }
                                >
                                    {child.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )

    const renderTripsContent = () => (
        <div className="parentPanel">
            <section className="parentRecords parentRecords--wide" aria-label="Trips">
                <h3>Trip Timeline</h3>
                <p className="parentHint">
                    Live trip tracking is not connected yet. You can now submit route-related requests
                    through the workflow and follow the decision trail while trip telemetry is still being added.
                </p>
                <ul>
                    <li className="parentListItem parentListItem--empty">
                        No live trip events are available yet.
                    </li>
                </ul>
            </section>
        </div>
    )

    const renderRequestsContent = () => (
        <div className="parentPanel">
            <div className="parentRequestLayout">
                <form className="parentRecords parentRecords--wide" onSubmit={handleSubmitRequest}>
                    <div className="parentRecordsHeader">
                        <div>
                            <h3>Submit Transport Request</h3>
                            <p className="parentHint">
                                Requests go to the Transport Manager as pending items. Parents cannot
                                change routes or assignments directly.
                            </p>
                        </div>
                    </div>

                    <div className="parentFormGrid">
                        <label className="parentField">
                            <span>Child</span>
                            <select
                                value={requestForm.studentId}
                                onChange={(event) =>
                                    setRequestForm((current) => ({
                                        ...current,
                                        studentId: event.target.value,
                                    }))
                                }
                                required
                            >
                                <option value="">Select child</option>
                                {children.map((child) => (
                                    <option key={child.id} value={String(child.id)}>
                                        {getChildLabel(child)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="parentField">
                            <span>Request Type</span>
                            <select
                                value={requestForm.requestType}
                                onChange={(event) =>
                                    setRequestForm((current) => ({
                                        ...current,
                                        requestType: event.target.value as ParentTransportRequestType,
                                    }))
                                }
                            >
                                {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="parentField parentField--full">
                            <span>Title</span>
                            <input
                                value={requestForm.requestTitle}
                                onChange={(event) =>
                                    setRequestForm((current) => ({
                                        ...current,
                                        requestTitle: event.target.value,
                                    }))
                                }
                                placeholder="Short request summary"
                                required
                            />
                        </label>

                        <label className="parentField parentField--full">
                            <span>Details</span>
                            <textarea
                                value={requestForm.requestDetails}
                                onChange={(event) =>
                                    setRequestForm((current) => ({
                                        ...current,
                                        requestDetails: event.target.value,
                                    }))
                                }
                                placeholder="Describe the request, concern, or complaint in detail"
                                rows={5}
                                required
                            />
                        </label>

                        <label className="parentField">
                            <span>Requested Pickup Location</span>
                            <input
                                value={requestForm.requestedPickupLocation}
                                onChange={(event) =>
                                    setRequestForm((current) => ({
                                        ...current,
                                        requestedPickupLocation: event.target.value,
                                    }))
                                }
                                placeholder="Optional"
                            />
                        </label>

                        <label className="parentField">
                            <span>Requested Drop-off Location</span>
                            <input
                                value={requestForm.requestedDropoffLocation}
                                onChange={(event) =>
                                    setRequestForm((current) => ({
                                        ...current,
                                        requestedDropoffLocation: event.target.value,
                                    }))
                                }
                                placeholder="Optional"
                            />
                        </label>

                        <label className="parentField">
                            <span>Preferred Effective Date</span>
                            <input
                                type="date"
                                value={requestForm.preferredEffectiveDate}
                                onChange={(event) =>
                                    setRequestForm((current) => ({
                                        ...current,
                                        preferredEffectiveDate: event.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>

                    <button type="submit" className="parentPrimaryButton" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </form>

                <section className="parentRecords parentRecords--wide" aria-label="Request history">
                    <div className="parentRecordsHeader">
                        <div>
                            <h3>Request History</h3>
                            <p className="parentHint">
                                Select a request to inspect manager notes and the audit trail.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="parentGhostButton"
                            onClick={() => void loadParentData(true)}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>

                    <div className="parentRequestLayout">
                        <div className="parentRequestList">
                            {requests.length === 0 ? (
                                <p className="parentHint">No transport requests submitted yet.</p>
                            ) : (
                                requests.map((request) => (
                                    <button
                                        key={request.id}
                                        type="button"
                                        className="parentRequestCard"
                                        onClick={() => setSelectedRequestId(request.id)}
                                    >
                                        <strong>{request.requestTitle}</strong>
                                        <p>
                                            {REQUEST_TYPE_LABELS[request.requestType]} for {request.studentName}
                                        </p>
                                        <p>Submitted {formatTimestampValue(request.createdAt)}</p>
                                        <span className={getStatusBadgeClass(request.status)}>
                                            {request.status}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="parentRequestDetail">
                            {isDetailLoading ? (
                                <Loader variant="section" label="Loading request detail" />
                            ) : selectedRequestDetail?.request ? (
                                <div className="parentRequestTimeline">
                                    <div>
                                        <h4>{selectedRequestDetail.request.requestTitle}</h4>
                                        <p>
                                            {REQUEST_TYPE_LABELS[selectedRequestDetail.request.requestType]} for{' '}
                                            {selectedRequestDetail.request.studentName}
                                        </p>
                                        <p>{selectedRequestDetail.request.requestDetails}</p>
                                        <p>
                                            Route Context:{' '}
                                            {selectedRequestDetail.request.currentRouteCode
                                                ? `${selectedRequestDetail.request.currentRouteCode} - ${selectedRequestDetail.request.currentRouteName}`
                                                : 'No active route linked'}
                                        </p>
                                        <p>
                                            Pickup: {selectedRequestDetail.request.requestedPickupLocation || 'Not provided'}
                                        </p>
                                        <p>
                                            Drop-off:{' '}
                                            {selectedRequestDetail.request.requestedDropoffLocation || 'Not provided'}
                                        </p>
                                        <p>
                                            Preferred Date:{' '}
                                            {selectedRequestDetail.request.preferredEffectiveDate || 'Not provided'}
                                        </p>
                                        <p>
                                            Reviewed By:{' '}
                                            {selectedRequestDetail.request.reviewedByName || 'Pending review'}
                                        </p>
                                        <p>
                                            Review Notes:{' '}
                                            {selectedRequestDetail.request.managerReviewNotes || 'No review notes yet.'}
                                        </p>
                                        <span className={getStatusBadgeClass(selectedRequestDetail.request.status)}>
                                            {selectedRequestDetail.request.status}
                                        </span>
                                    </div>

                                    <div>
                                        <h4>Audit Trail</h4>
                                        {selectedRequestDetail.auditLogs.length === 0 ? (
                                            <p className="parentHint">No audit events recorded yet.</p>
                                        ) : (
                                            <div className="parentAuditList">
                                                {selectedRequestDetail.auditLogs.map((log) => (
                                                    <div key={log.id} className="parentAuditItem">
                                                        <strong>{log.action}</strong>
                                                        <p>
                                                            {log.actorName || 'System'} at{' '}
                                                            {formatTimestampValue(log.createdAt)}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : selectedRequestSummary ? (
                                <p className="parentHint">
                                    Request details are loading or temporarily unavailable.
                                </p>
                            ) : (
                                <p className="parentHint">
                                    Select a request to review its audit trail.
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )

    const renderAlertsContent = () => (
        <div className="parentPanel">
            <section className="parentRecords parentRecords--wide" aria-label="Alerts">
                <h3>Workflow Alerts</h3>
                <p className="parentHint">
                    Reviewed requests appear here so you can quickly see decisions and notes.
                </p>
                <ul>
                    {reviewedRequests.length === 0 ? (
                        <li className="parentListItem parentListItem--empty">
                            No reviewed requests available yet.
                        </li>
                    ) : (
                        reviewedRequests.map((request) => (
                            <li key={request.id} className="parentListItem">
                                <span className="parentPrimary">{request.requestTitle}</span>
                                <span className="parentMuted">
                                    {request.managerReviewNotes || 'No manager notes provided.'}
                                </span>
                                <span className={getStatusBadgeClass(request.status)}>
                                    {request.status}
                                </span>
                            </li>
                        ))
                    )}
                </ul>
            </section>
        </div>
    )

    const renderSectionContent = () => {
        switch (resolvedSectionId) {
            case 'children':
                return renderChildrenContent()
            case 'trips':
                return renderTripsContent()
            case 'requests':
                return renderRequestsContent()
            case 'alerts':
                return renderAlertsContent()
            case 'overview':
            default:
                return renderOverviewContent()
        }
    }

    return (
        <>
            <div className="dashboardCards">
                {sectionCards.map((card) => (
                    <article key={card} className="dashboardCard">
                        <p>{card}</p>
                    </article>
                ))}
            </div>

            {errorMessage ? <p className="parentStatus parentStatus--error">{errorMessage}</p> : null}
            {successMessage ? <p className="parentStatus parentStatus--success">{successMessage}</p> : null}

            {renderSectionContent()}
        </>
    )
}

export default ParentDashboard
