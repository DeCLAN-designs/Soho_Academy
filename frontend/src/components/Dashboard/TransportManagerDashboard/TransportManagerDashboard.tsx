import { type FormEvent, useEffect, useMemo, useState } from 'react'
import type { DashboardRoleConfig } from '../dashboard.types'
import Loader from '../../Loader/Loader'
import {
    transportManagerApi,
    type CreateRoutePayload,
    type DriverComplianceDocumentRecord,
    type DriverComplaintReportRecord,
    type ParentTransportRequestDetailRecord,
    type ParentTransportRequestRecord,
    type RouteRecord,
    type RouteStopPayload,
    type TripAttendanceRecord,
    type TripDetailRecord,
    type TripRecord,
    type TripStatus,
    type TransportStaffRecord,
    type TransportVehicleRecord,
    type UpdateTripAttendancePayload,
    type UpdateTripStatusPayload,
} from '../../../lib/api'

type TransportManagerDashboardProps = {
    activeSection: string
}

const NEXT_TRIP_STATUS: Record<TripStatus, UpdateTripStatusPayload['status'] | null> = {
    scheduled: 'started',
    started: 'in_progress',
    in_progress: 'completed',
    completed: null,
}

const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
    scheduled: 'Scheduled',
    started: 'Started',
    in_progress: 'In Progress',
    completed: 'Completed',
}

const NEXT_ATTENDANCE_STATUS: Record<
    TripAttendanceRecord['boardingStatus'],
    UpdateTripAttendancePayload['boardingStatus'] | null
> = {
    not_boarded: 'boarded',
    boarded: 'dropped_off',
    dropped_off: null,
}

const ATTENDANCE_STATUS_LABELS: Record<TripAttendanceRecord['boardingStatus'], string> = {
    not_boarded: 'Not Boarded',
    boarded: 'Boarded',
    dropped_off: 'Dropped Off',
}

const REQUEST_TYPE_LABELS = {
    route_change: 'Route Change',
    complaint: 'Complaint',
    general_support: 'General Support',
} as const

const formatDateValue = (value: string | null) => (value ? value.slice(0, 10) : 'N/A')
const formatTimeValue = (value: string | null) => (value ? value.slice(0, 5) : 'N/A')

const formatTimestampValue = (value: string | null) => {
    if (!value) return 'N/A'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value

    return parsed.toLocaleString()
}

const countOpenTrips = (trips: TripRecord[]) =>
    trips.filter((trip) => trip.status !== 'completed').length

export const transportManagerDashboardConfig: DashboardRoleConfig = {
    title: 'Transport Manager Dashboard',
    subtitle: 'Oversee vehicles, personnel, routes, trips, and parent workflow requests.',
    quickActions: ['Create Route', 'Schedule Trip', 'Review Requests'],
    navigation: [
        { id: 'overview', label: 'Overview' },
        { id: 'fleet', label: 'Fleet' },
        { id: 'trips', label: 'Trips' },
        { id: 'requests', label: 'Requests' },
        { id: 'staff', label: 'Staff' },
        { id: 'reports', label: 'Reports' },
    ],
    sections: {
        overview: {
            heading: 'Operations Overview',
            description: 'Review route readiness, trip activity, and fleet utilization.',
            cards: [
                'Active routes today',
                'Open trips in motion',
                'Fleet readiness snapshot',
            ],
        },
        fleet: {
            heading: 'Fleet Management',
            description: 'Create routes, maintain ordered stops, and assign vehicles and staff.',
            cards: [
                'Configured routes',
                'Vehicle assignment readiness',
                'Student capacity checks',
            ],
        },
        trips: {
            heading: 'Trip Lifecycle',
            description: 'Schedule trips, move them through lifecycle states, and manage boarding.',
            cards: [
                'Trips awaiting start',
                'Trips in progress',
                'Student attendance progress',
            ],
        },
        requests: {
            heading: 'Parent Requests',
            description: 'Review parent route changes, complaints, and transport support requests.',
            cards: [
                'Pending approvals',
                'Reviewed requests',
                'Audit trail events',
            ],
        },
        staff: {
            heading: 'Staff Allocation',
            description: 'Monitor assignment coverage and overlap safeguards.',
            cards: [
                'Driver assignments',
                'Bus assistant assignments',
                'Conflict validation safeguards',
            ],
        },
        reports: {
            heading: 'Reports Center',
            description: 'Review and export transport performance reports.',
            cards: [
                'Route performance trends',
                'Incident frequency report',
                'Monthly operations summary',
            ],
        },
    },
}

const TransportManagerDashboard = ({ activeSection }: TransportManagerDashboardProps) => {
    const defaultSectionId = transportManagerDashboardConfig.navigation[0].id
    const resolvedSectionId = transportManagerDashboardConfig.sections[activeSection]
        ? activeSection
        : defaultSectionId

    const [isLoading, setIsLoading] = useState(true)
    const [isTripDetailLoading, setIsTripDetailLoading] = useState(false)
    const [isRequestDetailLoading, setIsRequestDetailLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const [routes, setRoutes] = useState<RouteRecord[]>([])
    const [vehicles, setVehicles] = useState<TransportVehicleRecord[]>([])
    const [staff, setStaff] = useState<TransportStaffRecord[]>([])
    const [trips, setTrips] = useState<TripRecord[]>([])
    const [parentRequests, setParentRequests] = useState<ParentTransportRequestRecord[]>([])
    const [selectedTripId, setSelectedTripId] = useState<number | null>(null)
    const [selectedTripDetail, setSelectedTripDetail] = useState<TripDetailRecord | null>(null)
    const [selectedParentRequestId, setSelectedParentRequestId] = useState<number | null>(null)
    const [selectedParentRequestDetail, setSelectedParentRequestDetail] =
        useState<ParentTransportRequestDetailRecord | null>(null)
    const [managerReviewNotes, setManagerReviewNotes] = useState('')

    const drivers = useMemo(() => staff.filter((member) => member.role === 'Driver'), [staff])
    const busAssistants = useMemo(
        () => staff.filter((member) => member.role === 'Bus Assistant'),
        [staff]
    )

    const [routeForm, setRouteForm] = useState({
        routeCode: '',
        routeName: '',
        routeDate: '',
        startTime: '',
        endTime: '',
    })

    const [stops, setStops] = useState<RouteStopPayload[]>([
        { stopType: 'pickup', stopOrder: 1, location: '', timeAllocation: null },
        { stopType: 'dropoff', stopOrder: 2, location: '', timeAllocation: null },
    ])

    const [assignVehicleForm, setAssignVehicleForm] = useState({
        routeId: '',
        numberPlate: '',
        driverUserId: '',
        assistantUserId: '',
    })

    const [assignStudentsForm, setAssignStudentsForm] = useState({
        routeId: '',
        studentIdsCsv: '',
    })

    const [createTripForm, setCreateTripForm] = useState({
        routeId: '',
    })

    // Fleet section form visibility states
    const [showCreateRouteForm, setShowCreateRouteForm] = useState(false)
    const [showAssignVehicleForm, setShowAssignVehicleForm] = useState(false)
    const [showAssignStudentsForm, setShowAssignStudentsForm] = useState(false)

    // Staff section form visibility states
    const [showComplianceDocumentsForm, setShowComplianceDocumentsForm] = useState(false)
    const [showComplaintsForm, setShowComplaintsForm] = useState(false)

    // Staff section data
    const [complianceDocuments, setComplianceDocuments] = useState<DriverComplianceDocumentRecord[]>([])
    const [complaints, setComplaints] = useState<DriverComplaintReportRecord[]>([])
    const [isComplianceLoading, setIsComplianceLoading] = useState(false)
    const [isComplaintsLoading, setIsComplaintsLoading] = useState(false)

    const loadParentRequestDetail = async (requestId: number, withLoader = true) => {
        if (withLoader) {
            setIsRequestDetailLoading(true)
        }

        try {
            const requestRes = await transportManagerApi.getParentRequest(requestId)
            const nextDetail = requestRes.data || null
            setSelectedParentRequestDetail(nextDetail)
            setManagerReviewNotes(nextDetail?.request.managerReviewNotes || '')
            return nextDetail
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load request details.')
            return null
        } finally {
            if (withLoader) {
                setIsRequestDetailLoading(false)
            }
        }
    }

    const loadTripDetail = async (tripId: number, withLoader = true) => {
        if (withLoader) {
            setIsTripDetailLoading(true)
        }

        try {
            const tripRes = await transportManagerApi.getTrip(tripId)
            const nextDetail = tripRes.data || null
            setSelectedTripDetail(nextDetail)
            return nextDetail
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load trip details.')
            return null
        } finally {
            if (withLoader) {
                setIsTripDetailLoading(false)
            }
        }
    }

    const loadAllTransportData = async (withLoader = true) => {
        if (withLoader) {
            setIsLoading(true)
        }

        setErrorMessage('')

        try {
            const [routesRes, vehiclesRes, staffRes, tripsRes, parentRequestsRes] = await Promise.all([
                transportManagerApi.getRoutes(),
                transportManagerApi.getVehicles(),
                transportManagerApi.getStaff(),
                transportManagerApi.getTrips(),
                transportManagerApi.getParentRequests(),
            ])

            setRoutes(routesRes.data?.routes || [])
            setVehicles(vehiclesRes.data?.vehicles || [])
            setStaff(staffRes.data?.staff || [])
            setTrips(tripsRes.data?.trips || [])
            setParentRequests(parentRequestsRes.data?.requests || [])
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load transport data.')
        } finally {
            if (withLoader) {
                setIsLoading(false)
            }
        }
    }

    const loadComplianceDocuments = async () => {
        setIsComplianceLoading(true)
        try {
            const response = await transportManagerApi.getComplianceDocuments()
            setComplianceDocuments(response.data?.documents || [])
        } catch (error) {
            console.error('Failed to load compliance documents:', error)
            setErrorMessage('Failed to load compliance documents.')
        } finally {
            setIsComplianceLoading(false)
        }
    }

    const loadComplaints = async () => {
        setIsComplaintsLoading(true)
        try {
            const response = await transportManagerApi.getComplaints()
            setComplaints(response.data?.reports || [])
        } catch (error) {
            console.error('Failed to load complaints:', error)
            setErrorMessage('Failed to load complaints.')
        } finally {
            setIsComplaintsLoading(false)
        }
    }

    useEffect(() => {
        void loadAllTransportData(true)
    }, [])

    useEffect(() => {
        if (trips.length === 0) {
            setSelectedTripId(null)
            setSelectedTripDetail(null)
            return
        }

        const selectedTripStillExists =
            selectedTripId !== null && trips.some((trip) => trip.id === selectedTripId)

        if (!selectedTripStillExists) {
            setSelectedTripId(trips[0].id)
        }
    }, [trips, selectedTripId])

    useEffect(() => {
        if (parentRequests.length === 0) {
            setSelectedParentRequestId(null)
            setSelectedParentRequestDetail(null)
            setManagerReviewNotes('')
            return
        }

        const selectedRequestStillExists =
            selectedParentRequestId !== null &&
            parentRequests.some((request) => request.id === selectedParentRequestId)

        if (!selectedRequestStillExists) {
            const firstPendingRequest =
                parentRequests.find((request) => request.status === 'PENDING') || parentRequests[0]
            setSelectedParentRequestId(firstPendingRequest.id)
        }
    }, [parentRequests, selectedParentRequestId])

    useEffect(() => {
        if (!selectedTripId) {
            setSelectedTripDetail(null)
            return
        }

        void loadTripDetail(selectedTripId, true)
    }, [selectedTripId])

    useEffect(() => {
        if (!selectedParentRequestId) {
            setSelectedParentRequestDetail(null)
            setManagerReviewNotes('')
            return
        }

        void loadParentRequestDetail(selectedParentRequestId, true)
    }, [selectedParentRequestId])

    const openTripRouteIds = useMemo(
        () => new Set(trips.filter((trip) => trip.status !== 'completed').map((trip) => trip.routeId)),
        [trips]
    )

    const tripEligibleRoutes = useMemo(
        () =>
            routes.filter((route) => route.status === 'active' && !openTripRouteIds.has(route.id)),
        [openTripRouteIds, routes]
    )

    const overviewCards = useMemo(() => {
        const activeRoutes = routes.filter((route) => route.status === 'active').length
        const activeVehicles = vehicles.filter((vehicle) => vehicle.status === 'active').length
        const openTrips = countOpenTrips(trips)

        if (resolvedSectionId === 'fleet') {
            return [
                `${routes.length} configured routes`,
                `${activeVehicles} active vehicles`,
                `${trips.filter((trip) => trip.status === 'scheduled').length} scheduled trips`,
            ]
        }

        if (resolvedSectionId === 'trips') {
            return [
                `${trips.filter((trip) => trip.status === 'scheduled').length} awaiting start`,
                `${trips.filter((trip) => trip.status === 'in_progress').length} in progress`,
                `${trips.reduce((sum, trip) => sum + trip.totalStudents, 0)} total trip student seats`,
            ]
        }

        if (resolvedSectionId === 'requests') {
            return [
                `${parentRequests.filter((request) => request.status === 'PENDING').length} pending approvals`,
                `${parentRequests.filter((request) => request.status !== 'PENDING').length} reviewed requests`,
                `${selectedParentRequestDetail?.auditLogs.length || 0} audit events on selected request`,
            ]
        }

        if (resolvedSectionId === 'staff') {
            return [
                `${drivers.length} drivers available`,
                `${busAssistants.length} bus assistants available`,
                `${openTrips} open trips requiring coverage`,
            ]
        }

        return [
            `${activeRoutes} active routes`,
            `${openTrips} open trips`,
            `${parentRequests.filter((request) => request.status === 'PENDING').length} pending requests`,
        ]
    }, [
        busAssistants.length,
        drivers.length,
        parentRequests,
        resolvedSectionId,
        routes,
        selectedParentRequestDetail,
        trips,
        vehicles,
    ])

    const selectedTripSummary =
        selectedTripDetail?.trip || trips.find((trip) => trip.id === selectedTripId) || null
    const selectedParentRequestSummary =
        selectedParentRequestDetail?.request ||
        parentRequests.find((request) => request.id === selectedParentRequestId) ||
        null

    const handleCreateRoute = async (event: FormEvent) => {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')

        const cleanedStops = stops
            .filter((stop) => stop.location.trim().length > 0)
            .map((stop, index) => ({
                stopType: stop.stopType,
                stopOrder: index + 1,
                location: stop.location.trim(),
                timeAllocation: stop.timeAllocation ?? null,
            }))

        const payload: CreateRoutePayload = {
            routeCode: routeForm.routeCode.trim(),
            routeName: routeForm.routeName.trim(),
            routeDate: routeForm.routeDate,
            startTime: routeForm.startTime,
            endTime: routeForm.endTime,
            stops: cleanedStops,
        }

        try {
            await transportManagerApi.createRoute(payload)
            setSuccessMessage('Route created successfully.')
            setRouteForm({ routeCode: '', routeName: '', routeDate: '', startTime: '', endTime: '' })
            setStops([
                { stopType: 'pickup', stopOrder: 1, location: '', timeAllocation: null },
                { stopType: 'dropoff', stopOrder: 2, location: '', timeAllocation: null },
            ])
            await loadAllTransportData(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to create route.')
        }
    }

    const handleAssignVehicleAndStaff = async (event: FormEvent) => {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')

        const routeId = Number(assignVehicleForm.routeId)
        const driverUserId = Number(assignVehicleForm.driverUserId)
        const assistantUserId =
            assignVehicleForm.assistantUserId.trim().length > 0
                ? Number(assignVehicleForm.assistantUserId)
                : null

        try {
            await transportManagerApi.assignVehicleStaff(routeId, {
                numberPlate: assignVehicleForm.numberPlate,
                driverUserId,
                assistantUserId,
            })
            setSuccessMessage('Vehicle and staff assigned successfully.')
            await loadAllTransportData(false)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to assign vehicle and staff.'
            )
        }
    }

    const handleAssignStudents = async (event: FormEvent) => {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')

        const routeId = Number(assignStudentsForm.routeId)
        const studentIds = assignStudentsForm.studentIdsCsv
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value > 0)

        try {
            await transportManagerApi.assignStudents(routeId, { studentIds })
            setSuccessMessage('Students assigned successfully.')
            await loadAllTransportData(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to assign students.')
        }
    }

    const handleCreateTrip = async (event: FormEvent) => {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')

        const routeId = Number(createTripForm.routeId)

        try {
            const response = await transportManagerApi.createTrip(routeId)
            const nextTripId = response.data?.trip.id || null

            setSelectedTripDetail(response.data || null)
            setSelectedTripId(nextTripId)
            setCreateTripForm({ routeId: '' })
            setSuccessMessage('Trip scheduled successfully.')
            await loadAllTransportData(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to create trip.')
        }
    }

    const handleAdvanceTripStatus = async (trip: TripRecord) => {
        const nextStatus = NEXT_TRIP_STATUS[trip.status]
        if (!nextStatus) {
            return
        }

        setErrorMessage('')
        setSuccessMessage('')

        try {
            const response = await transportManagerApi.updateTripStatus(trip.id, {
                status: nextStatus,
            })

            setSelectedTripDetail(response.data || null)
            setSelectedTripId(trip.id)
            setSuccessMessage(`Trip moved to ${TRIP_STATUS_LABELS[nextStatus]}.`)
            await loadAllTransportData(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to update trip status.')
        }
    }

    const handleAttendanceUpdate = async (
        tripId: number,
        student: TripAttendanceRecord
    ) => {
        const nextStatus = NEXT_ATTENDANCE_STATUS[student.boardingStatus]
        if (!nextStatus) {
            return
        }

        setErrorMessage('')
        setSuccessMessage('')

        try {
            const response = await transportManagerApi.updateTripAttendance(tripId, student.studentId, {
                boardingStatus: nextStatus,
            })

            setSelectedTripDetail(response.data || null)
            setSuccessMessage(
                `${student.firstName} ${student.lastName} marked as ${ATTENDANCE_STATUS_LABELS[nextStatus]}.`
            )
            await loadAllTransportData(false)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to update trip attendance.'
            )
        }
    }

    const handleReviewParentRequest = async (status: 'APPROVED' | 'REJECTED') => {
        if (!selectedParentRequestSummary) {
            return
        }

        setErrorMessage('')
        setSuccessMessage('')

        try {
            const response = await transportManagerApi.reviewParentRequest(
                selectedParentRequestSummary.id,
                {
                    status,
                    managerReviewNotes: managerReviewNotes.trim() || null,
                }
            )

            setSelectedParentRequestDetail(response.data || null)
            setSelectedParentRequestId(selectedParentRequestSummary.id)
            setManagerReviewNotes(response.data?.request.managerReviewNotes || '')
            setSuccessMessage(
                `Parent request ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully.`
            )
            await loadAllTransportData(false)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to review parent request.'
            )
        }
    }

    return (
        <>
            <div className="dashboardCards">
                {overviewCards.map((card) => (
                    <article key={card} className="dashboardCard">
                        <p>{card}</p>
                    </article>
                ))}
            </div>

            {errorMessage ? (
                <p className="schoolAdminStatus schoolAdminStatus--error">{errorMessage}</p>
            ) : null}
            {successMessage ? (
                <p className="schoolAdminStatus schoolAdminStatus--success">{successMessage}</p>
            ) : null}

            {isLoading ? <Loader variant="section" label="Loading transport manager data" /> : null}

            {resolvedSectionId === 'overview' ? (
                <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
                    <article className="schoolAdminForm">
                        <h3>Transport Snapshot</h3>
                        <p>
                            {routes.length} routes are configured, {countOpenTrips(trips)} trips are
                            currently open, and {vehicles.filter((vehicle) => vehicle.status === 'active').length}{' '}
                            vehicles are active.
                        </p>
                    </article>

                    <article className="schoolAdminForm">
                        <h3>Recent Trip Activity</h3>
                        {trips.length === 0 ? (
                            <p>No trips have been scheduled yet.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {trips.slice(0, 4).map((trip) => (
                                    <button
                                        key={trip.id}
                                        type="button"
                                        className="schoolAdminForm"
                                        style={{
                                            textAlign: 'left',
                                            padding: 16,
                                            borderWidth: 1,
                                            margin: 0,
                                        }}
                                        onClick={() => setSelectedTripId(trip.id)}
                                    >
                                        <strong>
                                            {trip.routeCode} - {trip.routeName}
                                        </strong>
                                        <p>
                                            {TRIP_STATUS_LABELS[trip.status]} | {trip.numberPlate} |{' '}
                                            {trip.boardedStudents}/{trip.totalStudents} boarded
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </article>

                    <article className="schoolAdminForm">
                        <h3>Parent Request Queue</h3>
                        {parentRequests.length === 0 ? (
                            <p>No parent requests have been submitted yet.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {parentRequests.slice(0, 4).map((request) => (
                                    <button
                                        key={request.id}
                                        type="button"
                                        className="schoolAdminForm"
                                        style={{
                                            textAlign: 'left',
                                            padding: 16,
                                            borderWidth: 1,
                                            margin: 0,
                                        }}
                                        onClick={() => setSelectedParentRequestId(request.id)}
                                    >
                                        <strong>{request.requestTitle}</strong>
                                        <p>
                                            {REQUEST_TYPE_LABELS[request.requestType]} | {request.studentName}
                                        </p>
                                        <p>{request.status}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </article>
                </div>
            ) : null}

            {resolvedSectionId === 'fleet' ? (
                <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
                    {/* Action Buttons */}
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            marginBottom: 8,
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setShowCreateRouteForm(!showCreateRouteForm)
                                setShowAssignVehicleForm(false)
                                setShowAssignStudentsForm(false)
                            }}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                background: showCreateRouteForm ? '#1976d2' : '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span style={{ fontSize: '14px' }}>🛣️</span>
                            {showCreateRouteForm ? 'Hide Create Route' : 'Create Route'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setShowAssignVehicleForm(!showAssignVehicleForm)
                                setShowCreateRouteForm(false)
                                setShowAssignStudentsForm(false)
                            }}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                background: showAssignVehicleForm ? '#388e3c' : '#4caf50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span style={{ fontSize: '14px' }}>🚐</span>
                            {showAssignVehicleForm ? 'Hide Assign Vehicle & Staff' : 'Assign Vehicle & Staff'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setShowAssignStudentsForm(!showAssignStudentsForm)
                                setShowCreateRouteForm(false)
                                setShowAssignVehicleForm(false)
                            }}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                background: showAssignStudentsForm ? '#f57c00' : '#ff9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span style={{ fontSize: '14px' }}>👨‍🎓</span>
                            {showAssignStudentsForm ? 'Hide Assign Students' : 'Assign Students to Route'}
                        </button>
                    </div>

                    {/* Create Route Form */}
                    {showCreateRouteForm && (
                    <form className="schoolAdminForm" onSubmit={handleCreateRoute}>
                        <h3>Create Route</h3>
                        <fieldset className="schoolAdminFieldset">
                            <legend>Route Details</legend>
                            <div className="schoolAdminGrid">
                                <label>
                                    Route Code
                                    <input
                                        value={routeForm.routeCode}
                                        onChange={(event) =>
                                            setRouteForm((current) => ({
                                                ...current,
                                                routeCode: event.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </label>
                                <label>
                                    Route Name
                                    <input
                                        value={routeForm.routeName}
                                        onChange={(event) =>
                                            setRouteForm((current) => ({
                                                ...current,
                                                routeName: event.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </label>
                                <label>
                                    Route Date
                                    <input
                                        type="date"
                                        value={routeForm.routeDate}
                                        onChange={(event) =>
                                            setRouteForm((current) => ({
                                                ...current,
                                                routeDate: event.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </label>
                                <label>
                                    Start Time
                                    <input
                                        type="time"
                                        value={routeForm.startTime}
                                        onChange={(event) =>
                                            setRouteForm((current) => ({
                                                ...current,
                                                startTime: event.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </label>
                                <label>
                                    End Time
                                    <input
                                        type="time"
                                        value={routeForm.endTime}
                                        onChange={(event) =>
                                            setRouteForm((current) => ({
                                                ...current,
                                                endTime: event.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </label>
                            </div>
                        </fieldset>

                        <fieldset className="schoolAdminFieldset">
                            <legend>Ordered Stops</legend>
                            <div style={{ display: 'grid', gap: 12 }}>
                                {stops.map((stop, index) => (
                                    <div
                                        key={`${stop.stopOrder}-${index}`}
                                        style={{ display: 'flex', gap: 12, alignItems: 'center' }}
                                    >
                                        <select
                                            value={stop.stopType}
                                            onChange={(event) => {
                                                const nextStops = [...stops]
                                                nextStops[index] = {
                                                    ...nextStops[index],
                                                    stopType: event.target.value as 'pickup' | 'dropoff',
                                                }
                                                setStops(nextStops)
                                            }}
                                        >
                                            <option value="pickup">pickup</option>
                                            <option value="dropoff">dropoff</option>
                                        </select>
                                        <input
                                            value={stop.location}
                                            placeholder="Location"
                                            onChange={(event) => {
                                                const nextStops = [...stops]
                                                nextStops[index] = {
                                                    ...nextStops[index],
                                                    location: event.target.value,
                                                }
                                                setStops(nextStops)
                                            }}
                                            required
                                        />
                                        {index > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextStops = stops.filter((_, stopIndex) => stopIndex !== index)
                                                    setStops(
                                                        nextStops.map((currentStop, stopIndex) => ({
                                                            ...currentStop,
                                                            stopOrder: stopIndex + 1,
                                                        }))
                                                    )
                                                }}
                                            >
                                                Remove
                                            </button>
                                        ) : null}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStops((current) => [
                                            ...current,
                                            {
                                                stopType: 'pickup',
                                                stopOrder: current.length + 1,
                                                location: '',
                                                timeAllocation: null,
                                            },
                                        ])
                                    }}
                                >
                                    Add Stop
                                </button>
                            </div>
                        </fieldset>

                        <button type="submit">Create Route</button>
                    </form>
                    )}

                    {/* Assign Vehicle and Staff Form */}
                    {showAssignVehicleForm && (
                    <form className="schoolAdminForm" onSubmit={handleAssignVehicleAndStaff}>
                        <h3>Assign Vehicle and Staff</h3>
                        <fieldset className="schoolAdminFieldset">
                            <legend>Assignment</legend>
                            <div className="schoolAdminGrid">
                                <label>
                                    Route
                                    <select
                                        value={assignVehicleForm.routeId}
                                        onChange={(event) =>
                                            setAssignVehicleForm((current) => ({
                                                ...current,
                                                routeId: event.target.value,
                                            }))
                                        }
                                        required
                                    >
                                        <option value="">Select route</option>
                                        {routes.map((route) => (
                                            <option key={route.id} value={String(route.id)}>
                                                {route.routeCode} - {route.routeName}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Vehicle
                                    <select
                                        value={assignVehicleForm.numberPlate}
                                        onChange={(event) =>
                                            setAssignVehicleForm((current) => ({
                                                ...current,
                                                numberPlate: event.target.value,
                                            }))
                                        }
                                        required
                                    >
                                        <option value="">Select vehicle</option>
                                        {vehicles.map((vehicle) => (
                                            <option key={vehicle.plateNumber} value={vehicle.plateNumber}>
                                                {vehicle.plateNumber} (capacity: {vehicle.capacity})
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Driver
                                    <select
                                        value={assignVehicleForm.driverUserId}
                                        onChange={(event) =>
                                            setAssignVehicleForm((current) => ({
                                                ...current,
                                                driverUserId: event.target.value,
                                            }))
                                        }
                                        required
                                    >
                                        <option value="">Select driver</option>
                                        {drivers.map((driver) => (
                                            <option key={driver.id} value={String(driver.id)}>
                                                {driver.firstName} {driver.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Bus Assistant
                                    <select
                                        value={assignVehicleForm.assistantUserId}
                                        onChange={(event) =>
                                            setAssignVehicleForm((current) => ({
                                                ...current,
                                                assistantUserId: event.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">None</option>
                                        {busAssistants.map((assistant) => (
                                            <option key={assistant.id} value={String(assistant.id)}>
                                                {assistant.firstName} {assistant.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </fieldset>

                        <button type="submit">Assign Vehicle and Staff</button>
                    </form>
                    )}

                    {/* Assign Students to Route Form */}
                    {showAssignStudentsForm && (
                    <form className="schoolAdminForm" onSubmit={handleAssignStudents}>
                        <h3>Assign Students to Route</h3>
                        <fieldset className="schoolAdminFieldset">
                            <legend>Student Assignment</legend>
                            <div className="schoolAdminGrid">
                                <label>
                                    Route
                                    <select
                                        value={assignStudentsForm.routeId}
                                        onChange={(event) =>
                                            setAssignStudentsForm((current) => ({
                                                ...current,
                                                routeId: event.target.value,
                                            }))
                                        }
                                        required
                                    >
                                        <option value="">Select route</option>
                                        {routes.map((route) => (
                                            <option key={route.id} value={String(route.id)}>
                                                {route.routeCode} - {route.routeName}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="schoolAdminFullWidth">
                                    Student IDs (comma separated)
                                    <input
                                        value={assignStudentsForm.studentIdsCsv}
                                        onChange={(event) =>
                                            setAssignStudentsForm((current) => ({
                                                ...current,
                                                studentIdsCsv: event.target.value,
                                            }))
                                        }
                                        placeholder="e.g. 12, 13, 14"
                                        required
                                    />
                                </label>
                            </div>
                        </fieldset>

                        <button type="submit">Assign Students</button>
                    </form>
                    )}

                    {/* Fleet Summary - Drivers and Vehicles */}
                    <article className="schoolAdminForm">
                        <h3>Fleet Resources</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <h4>Drivers ({drivers.length})</h4>
                                {drivers.length === 0 ? (
                                    <p>No drivers available.</p>
                                ) : (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {drivers.slice(0, 10).map((driver) => (
                                            <li key={driver.id} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>
                                                {driver.firstName} {driver.lastName} - {driver.phoneNumber}
                                            </li>
                                        ))}
                                        {drivers.length > 10 && (
                                            <li style={{ padding: '4px 0', fontStyle: 'italic', color: '#666' }}>
                                                ...and {drivers.length - 10} more
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <h4>Vehicles ({vehicles.length})</h4>
                                {vehicles.length === 0 ? (
                                    <p>No vehicles available.</p>
                                ) : (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {vehicles.slice(0, 10).map((vehicle) => (
                                            <li key={vehicle.id} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>
                                                {vehicle.plateNumber} (Capacity: {vehicle.capacity})
                                            </li>
                                        ))}
                                        {vehicles.length > 10 && (
                                            <li style={{ padding: '4px 0', fontStyle: 'italic', color: '#666' }}>
                                                ...and {vehicles.length - 10} more
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </article>
                </div>
            ) : null}

            {resolvedSectionId === 'trips' ? (
                <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
                    <form className="schoolAdminForm" onSubmit={handleCreateTrip}>
                        <h3>Schedule Trip From Route</h3>
                        <fieldset className="schoolAdminFieldset">
                            <legend>Trip Setup</legend>
                            <div className="schoolAdminGrid">
                                <label>
                                    Eligible Route
                                    <select
                                        value={createTripForm.routeId}
                                        onChange={(event) =>
                                            setCreateTripForm({ routeId: event.target.value })
                                        }
                                        required
                                    >
                                        <option value="">Select route</option>
                                        {tripEligibleRoutes.map((route) => (
                                            <option key={route.id} value={String(route.id)}>
                                                {route.routeCode} - {route.routeName} ({formatDateValue(route.routeDate)})
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </fieldset>

                        <button type="submit" disabled={tripEligibleRoutes.length === 0}>
                            Schedule Trip
                        </button>
                        {tripEligibleRoutes.length === 0 ? (
                            <p style={{ marginTop: 12 }}>
                                No eligible routes are ready. Each route must stay active, have a
                                vehicle/staff assignment, contain active students, and not already
                                have an open trip.
                            </p>
                        ) : null}
                    </form>

                    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
                        <article className="schoolAdminForm">
                            <h3>Scheduled and Active Trips</h3>
                            {trips.length === 0 ? (
                                <p>No trips scheduled yet.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {trips.map((trip) => (
                                        <button
                                            key={trip.id}
                                            type="button"
                                            className="schoolAdminForm"
                                            style={{
                                                textAlign: 'left',
                                                padding: 16,
                                                borderWidth: selectedTripId === trip.id ? 2 : 1,
                                                margin: 0,
                                            }}
                                            onClick={() => setSelectedTripId(trip.id)}
                                        >
                                            <strong>
                                                {trip.routeCode} - {trip.routeName}
                                            </strong>
                                            <p>
                                                {TRIP_STATUS_LABELS[trip.status]} | {trip.numberPlate} |{' '}
                                                {trip.driverName || 'Driver pending'}
                                            </p>
                                            <p>
                                                Date {formatDateValue(trip.tripDate)} | Start{' '}
                                                {formatTimeValue(trip.scheduledStartTime)} | Attendance{' '}
                                                {trip.boardedStudents}/{trip.totalStudents} boarded
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </article>

                        <article className="schoolAdminForm">
                            <h3>Selected Trip</h3>
                            {isTripDetailLoading ? (
                                <Loader variant="section" label="Loading trip details" />
                            ) : selectedTripDetail?.trip ? (
                                <div style={{ display: 'grid', gap: 16 }}>
                                    <div>
                                        <p>
                                            <strong>
                                                {selectedTripDetail.trip.routeCode} - {selectedTripDetail.trip.routeName}
                                            </strong>
                                        </p>
                                        <p>
                                            {TRIP_STATUS_LABELS[selectedTripDetail.trip.status]} |{' '}
                                            {selectedTripDetail.trip.numberPlate} |{' '}
                                            {selectedTripDetail.trip.driverName || 'Driver pending'}
                                        </p>
                                        <p>
                                            Route Date {formatDateValue(selectedTripDetail.trip.routeDate)} | Window{' '}
                                            {formatTimeValue(selectedTripDetail.trip.startTime)} -{' '}
                                            {formatTimeValue(selectedTripDetail.trip.endTime)}
                                        </p>
                                        <p>
                                            Students: {selectedTripDetail.trip.totalStudents} total,{' '}
                                            {selectedTripDetail.trip.boardedStudents} boarded,{' '}
                                            {selectedTripDetail.trip.droppedOffStudents} dropped off
                                        </p>
                                        <p>
                                            Started {formatTimestampValue(selectedTripDetail.trip.startedAt)} | In
                                            Progress {formatTimestampValue(selectedTripDetail.trip.inProgressAt)} |
                                            Completed {formatTimestampValue(selectedTripDetail.trip.completedAt)}
                                        </p>
                                    </div>

                                    {NEXT_TRIP_STATUS[selectedTripDetail.trip.status] ? (
                                        <button
                                            type="button"
                                            onClick={() => handleAdvanceTripStatus(selectedTripDetail.trip)}
                                        >
                                            Move to {TRIP_STATUS_LABELS[NEXT_TRIP_STATUS[selectedTripDetail.trip.status] as UpdateTripStatusPayload['status']]}
                                        </button>
                                    ) : (
                                        <p>This trip has completed its lifecycle.</p>
                                    )}

                                    <div style={{ display: 'grid', gap: 12 }}>
                                        <h4 style={{ margin: 0 }}>Student Attendance</h4>
                                        {selectedTripDetail.attendance.length === 0 ? (
                                            <p>No students are assigned to this trip.</p>
                                        ) : (
                                            selectedTripDetail.attendance.map((student) => {
                                                const nextAttendanceStatus =
                                                    NEXT_ATTENDANCE_STATUS[student.boardingStatus]

                                                return (
                                                    <div
                                                        key={student.studentId}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            gap: 16,
                                                            padding: 12,
                                                            border: '1px solid rgba(0, 0, 0, 0.1)',
                                                            borderRadius: 12,
                                                        }}
                                                    >
                                                        <div>
                                                            <strong>
                                                                {student.firstName} {student.lastName}
                                                            </strong>
                                                            <p>
                                                                {student.admissionNumber} | {student.grade} {student.stream}
                                                            </p>
                                                            <p>{ATTENDANCE_STATUS_LABELS[student.boardingStatus]}</p>
                                                        </div>
                                                        <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                                                            <p>
                                                                Boarded {formatTimestampValue(student.boardedAt)}
                                                            </p>
                                                            <p>
                                                                Dropped Off {formatTimestampValue(student.droppedOffAt)}
                                                            </p>
                                                            {nextAttendanceStatus ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleAttendanceUpdate(
                                                                            selectedTripDetail.trip.id,
                                                                            student
                                                                        )
                                                                    }
                                                                >
                                                                    Mark as {ATTENDANCE_STATUS_LABELS[nextAttendanceStatus]}
                                                                </button>
                                                            ) : (
                                                                <span>Attendance complete</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gap: 12 }}>
                                        <h4 style={{ margin: 0 }}>Trip Timeline</h4>
                                        {selectedTripDetail.events.length === 0 ? (
                                            <p>No trip events recorded yet.</p>
                                        ) : (
                                            selectedTripDetail.events.map((event) => (
                                                <div
                                                    key={event.id}
                                                    style={{
                                                        padding: 12,
                                                        border: '1px solid rgba(0, 0, 0, 0.1)',
                                                        borderRadius: 12,
                                                    }}
                                                >
                                                    <strong>{event.description}</strong>
                                                    <p>
                                                        {event.actorName || 'System'} | {formatTimestampValue(event.createdAt)}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : selectedTripSummary ? (
                                <p>
                                    Trip {selectedTripSummary.routeCode} is selected. Details are loading or
                                    unavailable right now.
                                </p>
                            ) : (
                                <p>Select a trip to view lifecycle and attendance details.</p>
                            )}
                        </article>
                    </div>
                </div>
            ) : null}

            {resolvedSectionId === 'requests' ? (
                <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
                    <article className="schoolAdminForm">
                        <h3>Parent Workflow Queue</h3>
                        <p>
                            Parents can submit route change requests, complaints, and general support
                            items here. Direct data edits are blocked; managers review and record the
                            outcome through this workflow.
                        </p>
                    </article>

                    <div style={{ display: 'grid', gap: 16 }}>
                        <article className="schoolAdminForm">
                            <h3>Submitted Requests</h3>
                            {parentRequests.length === 0 ? (
                                <p>No parent transport requests submitted yet.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {parentRequests.map((request) => (
                                        <button
                                            key={request.id}
                                            type="button"
                                            className="schoolAdminForm"
                                            style={{
                                                textAlign: 'left',
                                                padding: 16,
                                                borderWidth: selectedParentRequestId === request.id ? 2 : 1,
                                                margin: 0,
                                            }}
                                            onClick={() => setSelectedParentRequestId(request.id)}
                                        >
                                            <strong>{request.requestTitle}</strong>
                                            <p>
                                                {REQUEST_TYPE_LABELS[request.requestType]} | {request.studentName}
                                            </p>
                                            <p>
                                                {request.status} | Submitted {formatTimestampValue(request.createdAt)}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </article>

                        <article className="schoolAdminForm">
                            <h3>Selected Request</h3>
                            {isRequestDetailLoading ? (
                                <Loader variant="section" label="Loading request details" />
                            ) : selectedParentRequestDetail?.request ? (
                                <div style={{ display: 'grid', gap: 16 }}>
                                    <div>
                                        <p>
                                            <strong>{selectedParentRequestDetail.request.requestTitle}</strong>
                                        </p>
                                        <p>
                                            {REQUEST_TYPE_LABELS[selectedParentRequestDetail.request.requestType]} for{' '}
                                            {selectedParentRequestDetail.request.studentName} (
                                            {selectedParentRequestDetail.request.admissionNumber})
                                        </p>
                                        <p>{selectedParentRequestDetail.request.requestDetails}</p>
                                        <p>
                                            Parent: {selectedParentRequestDetail.request.parentName || 'Unknown'} |{' '}
                                            {selectedParentRequestDetail.request.parentEmail || 'No email'}
                                        </p>
                                        <p>
                                            Current Route:{' '}
                                            {selectedParentRequestDetail.request.currentRouteCode
                                                ? `${selectedParentRequestDetail.request.currentRouteCode} - ${selectedParentRequestDetail.request.currentRouteName}`
                                                : 'No active route linked'}
                                        </p>
                                        <p>
                                            Requested Pickup:{' '}
                                            {selectedParentRequestDetail.request.requestedPickupLocation || 'Not provided'}
                                        </p>
                                        <p>
                                            Requested Drop-off:{' '}
                                            {selectedParentRequestDetail.request.requestedDropoffLocation || 'Not provided'}
                                        </p>
                                        <p>
                                            Preferred Date:{' '}
                                            {selectedParentRequestDetail.request.preferredEffectiveDate || 'Not provided'}
                                        </p>
                                        <p>
                                            Status: {selectedParentRequestDetail.request.status} | Reviewed By:{' '}
                                            {selectedParentRequestDetail.request.reviewedByName || 'Pending review'}
                                        </p>
                                    </div>

                                    <div style={{ display: 'grid', gap: 12 }}>
                                        <label>
                                            Review Notes
                                            <textarea
                                                value={managerReviewNotes}
                                                onChange={(event) => setManagerReviewNotes(event.target.value)}
                                                rows={5}
                                                style={{
                                                    width: '100%',
                                                    marginTop: 8,
                                                    borderRadius: 12,
                                                    border: '1px solid rgba(0, 0, 0, 0.15)',
                                                    padding: 12,
                                                    font: 'inherit',
                                                }}
                                            />
                                        </label>

                                        {selectedParentRequestDetail.request.status === 'PENDING' ? (
                                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleReviewParentRequest('APPROVED')}
                                                >
                                                    Approve Request
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleReviewParentRequest('REJECTED')}
                                                >
                                                    Reject Request
                                                </button>
                                            </div>
                                        ) : (
                                            <p>
                                                Final Notes:{' '}
                                                {selectedParentRequestDetail.request.managerReviewNotes ||
                                                    'No review notes recorded.'}
                                            </p>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gap: 12 }}>
                                        <h4 style={{ margin: 0 }}>Audit Trail</h4>
                                        {selectedParentRequestDetail.auditLogs.length === 0 ? (
                                            <p>No audit events recorded yet.</p>
                                        ) : (
                                            selectedParentRequestDetail.auditLogs.map((log) => (
                                                <div
                                                    key={log.id}
                                                    style={{
                                                        padding: 12,
                                                        border: '1px solid rgba(0, 0, 0, 0.1)',
                                                        borderRadius: 12,
                                                    }}
                                                >
                                                    <strong>{log.action}</strong>
                                                    <p>
                                                        {log.actorName || 'System'} | {formatTimestampValue(log.createdAt)}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : selectedParentRequestSummary ? (
                                <p>
                                    Request details are loading or unavailable right now.
                                </p>
                            ) : (
                                <p>Select a parent request to review it.</p>
                            )}
                        </article>
                    </div>
                </div>
            ) : null}

            {resolvedSectionId === 'staff' ? (
                <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
                    {/* Action Buttons */}
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            marginBottom: 8,
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                const newValue = !showComplianceDocumentsForm
                                setShowComplianceDocumentsForm(newValue)
                                setShowComplaintsForm(false)
                                if (newValue) {
                                    void loadComplianceDocuments()
                                }
                            }}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                background: showComplianceDocumentsForm ? '#7b1fa2' : '#9c27b0',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span style={{ fontSize: '14px' }}>📄</span>
                            {showComplianceDocumentsForm ? 'Hide Compliance Documents' : 'Compliance Documents'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const newValue = !showComplaintsForm
                                setShowComplaintsForm(newValue)
                                setShowComplianceDocumentsForm(false)
                                if (newValue) {
                                    void loadComplaints()
                                }
                            }}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                background: showComplaintsForm ? '#d32f2f' : '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span style={{ fontSize: '14px' }}>⚠️</span>
                            {showComplaintsForm ? 'Hide Complaints' : 'Complaints'}
                        </button>
                    </div>

                    {/* Compliance Documents Form */}
                    {showComplianceDocumentsForm && (
                    <div className="schoolAdminForm">
                        <h3>Compliance Documents ({complianceDocuments.length})</h3>
                        {isComplianceLoading ? (
                            <p>Loading...</p>
                        ) : complianceDocuments.length === 0 ? (
                            <p>No compliance documents found.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {complianceDocuments.map((doc) => (
                                    <div key={doc.id} style={{ padding: 12, border: '1px solid #ddd', borderRadius: 4 }}>
                                        <p><strong>{doc.documentType}</strong> - {doc.relatedTo}</p>
                                        <p>Valid: {doc.validFromDate} to {doc.validToDate}</p>
                                        <p>File: {doc.fileName}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    )}

                    {/* Complaints Form */}
                    {showComplaintsForm && (
                    <div className="schoolAdminForm">
                        <h3>Complaints ({complaints.length})</h3>
                        {isComplaintsLoading ? (
                            <p>Loading...</p>
                        ) : complaints.length === 0 ? (
                            <p>No complaints found.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {complaints.map((complaint) => (
                                    <div key={complaint.id} style={{ padding: 12, border: '1px solid #ddd', borderRadius: 4 }}>
                                        <p><strong>{complaint.complaintType}</strong> - {complaint.timing}</p>
                                        <p>Plate: {complaint.numberPlate} | Trip: {complaint.tripNumber}</p>
                                        <p>Requested by: {complaint.requestedBy} ({complaint.contactPhoneNumber})</p>
                                        <p>Details: {complaint.details}</p>
                                        <p style={{ fontSize: '12px', color: '#666' }}>Reported: {new Date(complaint.createdAt).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    )}

                    <article className="schoolAdminForm">
                        <h3>Staff Coverage Snapshot</h3>
                        <p>
                            {drivers.length} drivers and {busAssistants.length} bus assistants are
                            currently available for route assignments.
                        </p>
                        <p>
                            Overlapping active route assignments are still blocked on the backend for
                            both drivers and bus assistants.
                        </p>
                    </article>
                </div>
            ) : null}

            {resolvedSectionId === 'reports' ? (
                <div style={{ marginTop: 16 }}>
                    <p>Reports are not implemented yet in this MVP.</p>
                </div>
            ) : null}
        </>
    )
}

export default TransportManagerDashboard
