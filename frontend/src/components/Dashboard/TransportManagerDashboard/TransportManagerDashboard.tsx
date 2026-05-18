import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { studentApi } from '../../../lib/api'
import type { DashboardRoleConfig } from '../dashboard.types'
import Loader from '../../Loader/Loader'
import './TransportManagerDashboard.css'

type FuelMaintenanceRequest = {
    id: number
    requestDate: string
    requestTime: string
    numberPlate: string
    currentMileage: number
    requestType: 'Fuel' | 'Service' | 'Repair and Maintenance' | 'Compliance'
    requestedBy: string
    requestedByName: string
    category: string
    description: string
    amount: number | null
    confirmedBy: string | null
    confirmedByName: string | null
    confirmationStatus: 'PENDING' | 'CONFIRMED' | 'REJECTED'
    confirmedAt: string | null
    createdByUserId: number
    createdAt: string
    updatedAt: string
}

type TransportManagerDashboardData = {
    pendingRequests: FuelMaintenanceRequest[]
    confirmedRequests: FuelMaintenanceRequest[]
    rejectedRequests: FuelMaintenanceRequest[]
    totalRequests: number
    vehicleCount: number
    activeRoutesCount: number
}

type TransportManagerDashboardProps = {
    activeSection: string
}

export const transportManagerDashboardConfig: DashboardRoleConfig = {
    title: 'Transport Manager Dashboard',
    subtitle: 'Manage fleet, routes, staff, and fuel/maintenance confirmations.',
    quickActions: ['Review Requests', 'Confirm Fuel', 'Manage Routes', 'View Reports'],
    navigation: [
        { id: 'overview', label: 'Overview' },
        { id: 'fuelMaintenance', label: 'Fuel & Maintenance' },
        { id: 'routes', label: 'Routes' },
        { id: 'fleet', label: 'Fleet Management' },
        { id: 'staff', label: 'Staff Management' },
        { id: 'incidents', label: 'Incidents & Complaints' },
    ],
    sections: {
        overview: {
            heading: 'Dashboard Overview',
            description: 'Monitor key metrics and pending approvals.',
            cards: [
                'Pending fuel/maintenance requests',
                'Active routes and assignments',
                'Fleet operational status',
                'Staff assignments and availability',
            ],
        },
        fuelMaintenance: {
            heading: 'Fuel & Maintenance Management',
            description: 'Review and confirm fuel/maintenance requests from drivers.',
            cards: [
                'Pending confirmation requests',
                'Confirmed requests history',
                'Cost tracking and budgets',
                'Maintenance schedules',
            ],
        },
        routes: {
            heading: 'Route Management',
            description: 'Create, modify, and monitor transport routes.',
            cards: [
                'Active and scheduled routes',
                'Route optimization',
                'Stop management',
                'Student assignments per route',
            ],
        },
        fleet: {
            heading: 'Fleet Management',
            description: 'Manage vehicles, capacity, insurance, and compliance.',
            cards: [
                'Vehicle registration and status',
                'Insurance and inspection tracking',
                'Capacity management',
                'Vehicle assignments to routes',
            ],
        },
        staff: {
            heading: 'Staff Management',
            description: 'Manage drivers and bus assistants.',
            cards: [
                'Staff registration and profiles',
                'License validity tracking',
                'Route assignments',
                'Performance metrics',
            ],
        },
        incidents: {
            heading: 'Incidents & Complaints',
            description: 'Review and manage safety incidents and complaints.',
            cards: [
                'Incident reports',
                'Complaint tracking',
                'Escalation management',
                'Resolution SLA tracking',
            ],
        },
    },
}

const TransportManagerDashboard = ({ activeSection }: TransportManagerDashboardProps) => {
    const defaultSection = transportManagerDashboardConfig.navigation[0].id
    const section =
        transportManagerDashboardConfig.sections[activeSection] ||
        transportManagerDashboardConfig.sections[defaultSection]

    const [dashboardData, setDashboardData] = useState<TransportManagerDashboardData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedRequest, setSelectedRequest] = useState<FuelMaintenanceRequest | null>(null)
    const [isConfirming, setIsConfirming] = useState(false)
    const [confirmationStatus, setConfirmationStatus] = useState('CONFIRMED')
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true)
            setErrorMessage('')
            try {
                // Fetch all fuel maintenance requests
                const fuelResponse = await studentApi.get('/fuel-maintenance/all')
                const requests = fuelResponse.data?.data?.requests || []

                const dashboardInfo: TransportManagerDashboardData = {
                    pendingRequests: requests.filter(
                        (r: FuelMaintenanceRequest) => r.confirmationStatus === 'PENDING',
                    ),
                    confirmedRequests: requests.filter(
                        (r: FuelMaintenanceRequest) => r.confirmationStatus === 'CONFIRMED',
                    ),
                    rejectedRequests: requests.filter(
                        (r: FuelMaintenanceRequest) => r.confirmationStatus === 'REJECTED',
                    ),
                    totalRequests: requests.length,
                    vehicleCount: 0, // TODO: Fetch from fleet API
                    activeRoutesCount: 0, // TODO: Fetch from routes API
                }

                setDashboardData(dashboardInfo)
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error)
                setErrorMessage('Failed to load dashboard data')
            } finally {
                setIsLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    const handleConfirmRequest = async (e: FormEvent) => {
        e.preventDefault()

        if (!selectedRequest) {
            setErrorMessage('No request selected')
            return
        }

        setIsConfirming(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            await studentApi.post(`/fuel-maintenance/${selectedRequest.id}/confirm`, {
                confirmationStatus,
            })

            setSuccessMessage(
                `Request ${confirmationStatus === 'CONFIRMED' ? 'confirmed' : 'rejected'} successfully!`,
            )

            // Refresh the dashboard data
            setTimeout(() => {
                window.location.reload()
            }, 1500)
        } catch (error: any) {
            setErrorMessage(
                error.response?.data?.message || 'Failed to confirm request. Please try again.',
            )
        } finally {
            setIsConfirming(false)
        }
    }

    if (isLoading) return <Loader />

    if (!dashboardData) {
        return (
            <div className="transportManagerDashboard">
                <article className="dashboardCard error">
                    <p>Failed to load dashboard data. Please refresh the page.</p>
                </article>
            </div>
        )
    }

    return (
        <div className="transportManagerDashboard">
            {errorMessage && (
                <article className="dashboardCard error">
                    <p>{errorMessage}</p>
                </article>
            )}

            {successMessage && (
                <article className="dashboardCard success">
                    <p>{successMessage}</p>
                </article>
            )}

            {activeSection === 'overview' && (
                <div className="dashboardCards">
                    <article className="dashboardCard metric">
                        <h4>Pending Fuel/Maintenance Requests</h4>
                        <p className="metricValue">{dashboardData.pendingRequests.length}</p>
                        <p className="metricLabel">Awaiting confirmation</p>
                    </article>

                    <article className="dashboardCard metric">
                        <h4>Confirmed Requests</h4>
                        <p className="metricValue">{dashboardData.confirmedRequests.length}</p>
                        <p className="metricLabel">This period</p>
                    </article>

                    <article className="dashboardCard metric">
                        <h4>Total Requests</h4>
                        <p className="metricValue">{dashboardData.totalRequests}</p>
                        <p className="metricLabel">All time</p>
                    </article>

                    <article className="dashboardCard">
                        <h4>Quick Stats</h4>
                        <ul className="statsList">
                            <li>Active Routes: {dashboardData.activeRoutesCount}</li>
                            <li>Fleet Vehicles: {dashboardData.vehicleCount}</li>
                            <li>Pending Actions: {dashboardData.pendingRequests.length}</li>
                        </ul>
                    </article>
                </div>
            )}

            {activeSection === 'fuelMaintenance' && (
                <div className="fuelMaintenanceSection">
                    <div className="requestsList">
                        <h3>Pending Requests</h3>

                        {dashboardData.pendingRequests.length === 0 ? (
                            <p className="emptyState">No pending fuel/maintenance requests</p>
                        ) : (
                            <div className="requestsTable">
                                {dashboardData.pendingRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className={`requestCard ${
                                            selectedRequest?.id === request.id ? 'selected' : ''
                                        }`}
                                        onClick={() => setSelectedRequest(request)}
                                    >
                                        <div className="requestHeader">
                                            <strong>{request.numberPlate}</strong>
                                            <span className="requestType">{request.requestType}</span>
                                        </div>
                                        <div className="requestBody">
                                            <p>
                                                <strong>From:</strong> {request.requestedByName}
                                            </p>
                                            <p>
                                                <strong>Category:</strong> {request.category}
                                            </p>
                                            <p>
                                                <strong>Description:</strong> {request.description}
                                            </p>
                                            {request.amount && (
                                                <p>
                                                    <strong>Amount:</strong> ${request.amount.toFixed(2)}
                                                </p>
                                            )}
                                            <p className="date">
                                                {new Date(request.requestDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedRequest && (
                        <div className="confirmationPanel">
                            <h3>Confirm Request</h3>
                            <form onSubmit={handleConfirmRequest}>
                                <div className="formGroup">
                                    <label htmlFor="confirmationStatus">Confirmation Status</label>
                                    <select
                                        id="confirmationStatus"
                                        value={confirmationStatus}
                                        onChange={(e) => setConfirmationStatus(e.target.value)}
                                        disabled={isConfirming}
                                    >
                                        <option value="CONFIRMED">Confirm Request</option>
                                        <option value="REJECTED">Reject Request</option>
                                    </select>
                                </div>

                                <div className="requestDetails">
                                    <h4>Request Details</h4>
                                    <p>
                                        <strong>Vehicle:</strong> {selectedRequest.numberPlate}
                                    </p>
                                    <p>
                                        <strong>Type:</strong> {selectedRequest.requestType}
                                    </p>
                                    <p>
                                        <strong>Category:</strong> {selectedRequest.category}
                                    </p>
                                    <p>
                                        <strong>Description:</strong> {selectedRequest.description}
                                    </p>
                                    {selectedRequest.amount && (
                                        <p>
                                            <strong>Amount:</strong> ${selectedRequest.amount.toFixed(2)}
                                        </p>
                                    )}
                                    <p>
                                        <strong>Mileage:</strong> {selectedRequest.currentMileage} km
                                    </p>
                                    <p>
                                        <strong>Submitted by:</strong> {selectedRequest.requestedByName}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isConfirming}
                                    className="submitButton"
                                >
                                    {isConfirming
                                        ? 'Processing...'
                                        : `${confirmationStatus === 'CONFIRMED' ? 'Confirm' : 'Reject'} Request`}
                                </button>
                            </form>
                        </div>
                    )}

                    {dashboardData.confirmedRequests.length > 0 && (
                        <div className="confirmedRequestsList">
                            <h3>Recently Confirmed Requests</h3>
                            <div className="requestsTable">
                                {dashboardData.confirmedRequests.slice(0, 5).map((request) => (
                                    <div key={request.id} className="requestCard">
                                        <div className="requestHeader">
                                            <strong>{request.numberPlate}</strong>
                                            <span className="confirmed">Confirmed</span>
                                        </div>
                                        <div className="requestBody">
                                            <p>
                                                <strong>Confirmed by:</strong>{' '}
                                                {request.confirmedByName || 'Unknown'}
                                            </p>
                                            <p>
                                                <strong>Confirmed at:</strong>{' '}
                                                {request.confirmedAt
                                                    ? new Date(request.confirmedAt).toLocaleString()
                                                    : 'N/A'}
                                            </p>
                                            <p>
                                                <strong>Category:</strong> {request.category}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {['routes', 'fleet', 'staff', 'incidents'].includes(activeSection) && (
                <div className="comingSoonSection">
                    <article className="dashboardCard">
                        <h3>{section.heading}</h3>
                        <p>{section.description}</p>
                        <ul>
                            {section.cards.map((card) => (
                                <li key={card}>{card}</li>
                            ))}
                        </ul>
                        <p className="comingSoon">Coming soon...</p>
                    </article>
                </div>
            )}
        </div>
    )
}

export default TransportManagerDashboard
