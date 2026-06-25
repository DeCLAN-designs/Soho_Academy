import type { DashboardRoleConfig } from '../dashboard.types'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
    parentApi,
    type CreateParentTransportRequestPayload,
    type ParentChildRecord,
    type ParentChildTransportRecord,
    type ParentTransportRequestDetailRecord,
    type ParentTransportRequestRecord,
    type ParentTransportRequestStatus,
    type ParentTransportRequestType,
    type ParentTransportStopRecord,
} from '../../../lib/api'
import Loader from '../../Loader/Loader'
import './ParentDashboard.css'

type ParentDashboardProps = {
    activeSection: string
}

// eslint-disable-next-line react-refresh/only-export-components
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

const formatTimeValue = (value: string | null) => {
    if (!value) return 'Not recorded yet'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value

    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatStopLocation = (stop: ParentTransportStopRecord | null) => {
    if (!stop) return 'Not assigned'

    return [stop.stopName, stop.address, stop.landmark].filter(Boolean).join(' · ')
}

const formatAttendanceDateLabel = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return value

    return parsed.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })
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
        { id: 'requests', label: 'Request' },
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
            description: 'Review linked children, current routes, and assigned pickup and drop-off stops.',
            cards: [
                'Current route assignment',
                'Pickup stop location',
                'Drop-off stop location',
            ],
        },
        trips: {
            heading: 'Trip Timeline',
            description: 'See pickup and drop-off locations, times, and recent attendance history.',
            cards: [
                'Today pickup times',
                'Today drop-off times',
                'Recent trip attendance',
            ],
        },
        requests: {
            heading: 'Request',
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
    const [transportProfiles, setTransportProfiles] = useState<ParentChildTransportRecord[]>([])
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

    const transportSummary = useMemo(() => {
        const boardedToday = transportProfiles.reduce((count, profile) => {
            const boarded = profile.todayAttendance.some(
                (record) =>
                    record.tripType === 'Morning' && record.boardingStatus === 'Boarded'
            )
            return boarded ? count + 1 : count
        }, 0)

        const droppedToday = transportProfiles.reduce((count, profile) => {
            const dropped = profile.todayAttendance.some(
                (record) =>
                    record.tripType === 'Evening' && record.dropoffStatus === 'Dropped Off'
            )
            return dropped ? count + 1 : count
        }, 0)

        const assignedRoutes = transportProfiles.filter((profile) => profile.route).length

        return {
            assignedRoutes,
            boardedToday,
            droppedToday,
            recentEvents: transportProfiles.reduce(
                (count, profile) => count + profile.recentAttendance.length,
                0
            ),
        }
    }, [transportProfiles])

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
                `${transportSummary.assignedRoutes} assigned routes`,
                `${transportSummary.boardedToday} picked up today`,
            ]
        }

        if (resolvedSectionId === 'trips') {
            return [
                `${transportSummary.boardedToday} morning pickups recorded`,
                `${transportSummary.droppedToday} evening drop-offs recorded`,
                `${transportSummary.recentEvents} recent attendance events`,
            ]
        }

        return [
            `${childrenSummary.total} linked children`,
            `${transportSummary.assignedRoutes} active routes`,
            `${transportSummary.boardedToday} picked up today`,
        ]
    }, [
        childrenSummary,
        requestSummary,
        requests,
        resolvedSectionId,
        selectedRequestDetail,
        transportSummary,
    ])

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
            const [childrenResponse, transportResponse, requestsResponse] = await Promise.all([
                parentApi.getChildren(),
                parentApi.getChildrenTransport(),
                parentApi.getTransportRequests(),
            ])

            setChildren(childrenResponse.data?.children || [])
            setTransportProfiles(transportResponse.data?.children || [])
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

    const renderTransportProfileCard = (profile: ParentChildTransportRecord) => {
        const morningRecord = profile.todayAttendance.find((record) => record.tripType === 'Morning')
        const eveningRecord = profile.todayAttendance.find((record) => record.tripType === 'Evening')

        return (
            <article key={profile.studentId} className="parentTransportCard">
                <div className="parentTransportCard__header">
                    <div>
                        <h4>
                            {profile.admissionNumber} - {profile.firstName} {profile.lastName}
                        </h4>
                        <p className="parentHint">
                            Grade {profile.grade} · {profile.stream}
                        </p>
                    </div>
                    <span
                        className={
                            profile.status === 'active'
                                ? 'parentBadge parentBadge--active'
                                : 'parentBadge parentBadge--withdrawn'
                        }
                    >
                        {profile.status}
                    </span>
                </div>

                <div className="parentTransportCard__route">
                    <span className="parentTransportCard__label">Current Route</span>
                    <strong>
                        {profile.route
                            ? `${profile.route.routeCode} - ${profile.route.routeName}`
                            : 'No route assigned yet'}
                    </strong>
                    {profile.route ? (
                        <p className="parentHint">
                            Vehicle {profile.route.vehiclePlate || 'TBD'} · Driver{' '}
                            {profile.route.assignedDriver || 'TBD'}
                        </p>
                    ) : null}
                </div>

                <div className="parentTransportCard__stops">
                    <div>
                        <span className="parentTransportCard__label">Pickup Stop</span>
                        <strong>{formatStopLocation(profile.pickupStop)}</strong>
                        <p className="parentHint">
                            Today: {morningRecord?.boardingStatus || 'Awaiting trip'}{' '}
                            {morningRecord?.boardingStatus === 'Boarded'
                                ? `at ${formatTimeValue(morningRecord.boardedAt)}`
                                : ''}
                        </p>
                    </div>
                    <div>
                        <span className="parentTransportCard__label">Drop-off Stop</span>
                        <strong>{formatStopLocation(profile.dropoffStop)}</strong>
                        <p className="parentHint">
                            Today: {eveningRecord?.dropoffStatus || 'Awaiting trip'}{' '}
                            {eveningRecord?.dropoffStatus === 'Dropped Off'
                                ? `at ${formatTimeValue(eveningRecord.droppedOffAt)}`
                                : ''}
                        </p>
                    </div>
                </div>
            </article>
        )
    }

    const renderOverviewContent = () => (
        <div className="parentPanel">
            <div className="parentStats">
                <article className="parentStatCard">
                    <p>Children Linked</p>
                    <strong>{childrenSummary.total}</strong>
                </article>
                <article className="parentStatCard">
                    <p>Picked Up Today</p>
                    <strong>{transportSummary.boardedToday}</strong>
                </article>
                <article className="parentStatCard">
                    <p>Dropped Off Today</p>
                    <strong>{transportSummary.droppedToday}</strong>
                </article>
            </div>

            <div className="parentLists">
                <section className="parentRecords parentRecords--wide" aria-label="Transport snapshot">
                    <div className="parentRecordsHeader">
                        <div>
                            <h3>Today&apos;s Transport</h3>
                            <p className="parentHint">
                                Pickup and drop-off times update when attendance is marked on the bus.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="parentGhostButton"
                            onClick={() => void loadParentData(false)}
                            disabled={isLoading}
                        >
                            Refresh
                        </button>
                    </div>
                    {isLoading ? (
                        <Loader variant="section" label="Loading transport details" />
                    ) : transportProfiles.length === 0 ? (
                        <p className="parentHint">No linked children with transport assignments yet.</p>
                    ) : (
                        <div className="parentTransportGrid">
                            {transportProfiles.map((profile) => renderTransportProfileCard(profile))}
                        </div>
                    )}
                </section>

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
            <section className="parentRecords parentRecords--wide" aria-label="Children transport profiles">
                <div className="parentRecordsHeader">
                    <div>
                        <h3>Children & Current Routes</h3>
                        <p className="parentHint">
                            View each child&apos;s assigned route, pickup stop, drop-off stop, and today&apos;s
                            recorded times from attendance.
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
                    <Loader variant="section" label="Loading children transport" />
                ) : transportProfiles.length === 0 ? (
                    <p className="parentHint">No children are linked to this parent account yet.</p>
                ) : (
                    <div className="parentTransportGrid">
                        {transportProfiles.map((profile) => renderTransportProfileCard(profile))}
                    </div>
                )}
            </section>
        </div>
    )

    const renderTripsContent = () => {
        const timeline = transportProfiles.flatMap((profile) =>
            profile.recentAttendance.map((record) => ({
                ...record,
                studentName: `${profile.firstName} ${profile.lastName}`,
                admissionNumber: profile.admissionNumber,
            }))
        )

        return (
            <div className="parentPanel">
                <section className="parentRecords parentRecords--wide" aria-label="Trip attendance timeline">
                    <div className="parentRecordsHeader">
                        <div>
                            <h3>Trip Timeline</h3>
                            <p className="parentHint">
                                Pickup and drop-off times are recorded automatically when bus staff mark
                                attendance.
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
                        <Loader variant="section" label="Loading trip timeline" />
                    ) : timeline.length === 0 ? (
                        <p className="parentHint">No attendance records are available yet.</p>
                    ) : (
                        <ul className="parentTripTimeline">
                            {timeline.map((record) => (
                                <li key={`${record.id}-${record.studentName}`} className="parentTripTimeline__item">
                                    <div className="parentTripTimeline__header">
                                        <strong>
                                            {record.studentName} · {record.tripType} Trip
                                        </strong>
                                        <span className="parentMuted">
                                            {formatAttendanceDateLabel(record.attendanceDate)}
                                        </span>
                                    </div>
                                    <p>
                                        Route: {record.routeCode} - {record.routeName}
                                    </p>
                                    <p>Stop: {record.stopName}{record.stopAddress ? ` · ${record.stopAddress}` : ''}</p>
                                    <div className="parentTripTimeline__times">
                                        <span>
                                            Pickup: {record.boardingStatus}
                                            {record.boardedAt
                                                ? ` at ${formatTimeValue(record.boardedAt)}`
                                                : ''}
                                        </span>
                                        <span>
                                            Drop-off: {record.dropoffStatus}
                                            {record.droppedOffAt
                                                ? ` at ${formatTimeValue(record.droppedOffAt)}`
                                                : ''}
                                        </span>
                                    </div>
                                    {record.notes ? (
                                        <p className="parentHint">Notes: {record.notes}</p>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        )
    }

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
