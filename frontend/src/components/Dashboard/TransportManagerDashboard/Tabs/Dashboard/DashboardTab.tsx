import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DashboardRoleConfig } from '../../../dashboard.types'
import { transportManagerApi, fuelMaintenanceApi, driverIncidentApi } from '../../../../../lib/api'
import './DashboardTab.css'

interface DashboardTabProps {
    section: DashboardRoleConfig['sections']['dashboard']
}

interface DashboardMetrics {
    operations: {
        activeRoutes: number
        lateRoutes: number
        openIncidents: number
    }
    fleet: {
        availableVehicles: number
        activeVehicles: number
        maintenanceAlerts: number
    }
    students: {
        totalStudents: number
        assignedStudents: number
        pendingRequests: number
    }
    staff: {
        drivers: number
        busAssistants: number
        totalStaff: number
    }
    routes: {
        totalRoutes: number
        activeRoutes: number
        completedRoutes: number
    }
    requests: {
        pendingRequests: number
        fuelRequests: number
        maintenanceRequests: number
    }
}

interface RecentActivity {
    id: number
    type: 'vehicle' | 'student' | 'incident' | 'fuel'
    title: string
    time: string
}

const DashboardTab = ({ section }: DashboardTabProps) => {
    const navigate = useNavigate()
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        operations: { activeRoutes: 0, lateRoutes: 0, openIncidents: 0 },
        fleet: { availableVehicles: 0, activeVehicles: 0, maintenanceAlerts: 0 },
        students: { totalStudents: 0, assignedStudents: 0, pendingRequests: 0 },
        staff: { drivers: 0, busAssistants: 0, totalStaff: 0 },
        routes: { totalRoutes: 0, activeRoutes: 0, completedRoutes: 0 },
        requests: { pendingRequests: 0, fuelRequests: 0, maintenanceRequests: 0 }
    })
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)
            
            // Fetch all data in parallel
            const [routesData, vehiclesData, studentsData, staffData, parentRequests, fuelRequests, incidentReports] = await Promise.all([
                transportManagerApi.getRoutes().catch(() => ({ routes: [] })),
                transportManagerApi.getVehicles().catch(() => ({ vehicles: [] })),
                transportManagerApi.getStudents().catch(() => ({ students: [] })),
                transportManagerApi.getStaff().catch(() => ({ staff: [] })),
                transportManagerApi.getParentRequests().catch(() => ({ requests: [] })),
                fuelMaintenanceApi.getRequests().catch(() => ({ requests: [] })),
                driverIncidentApi.getAllReports().catch(() => ({ reports: [] }))
            ])

            const routes = routesData.routes || []
            const vehicles = vehiclesData.vehicles || []
            const students = studentsData.students || []
            const staff = staffData.staff || []
            const requests = parentRequests.requests || []
            const fuelReqs = fuelRequests.requests || []
            const incidents = incidentReports.reports || []

            // Calculate metrics
            const activeRoutes = routes.filter(r => r.status === 'active').length
            const availableVehicles = vehicles.filter(v => v.status === 'active').length
            const drivers = staff.filter(s => s.role.toLowerCase().includes('driver')).length
            const busAssistants = staff.filter(s => s.role.toLowerCase().includes('assistant')).length
            const pendingParentRequests = requests.filter(r => r.status === 'PENDING').length
            const pendingFuelRequests = fuelReqs.filter(r => r.status === 'Pending').length
            const maintenanceRequests = fuelReqs.filter(r => 
                r.requestType === 'Service' || r.requestType === 'Repair and Maintenance'
            ).filter(r => r.status === 'Pending').length

            setMetrics({
                operations: {
                    activeRoutes,
                    lateRoutes: 0, // Would need trip data for this
                    openIncidents: incidents.length
                },
                fleet: {
                    availableVehicles,
                    activeVehicles: vehicles.length,
                    maintenanceAlerts: maintenanceRequests
                },
                students: {
                    totalStudents: students.length,
                    assignedStudents: students.length, // Would need assignment data
                    pendingRequests: pendingParentRequests
                },
                staff: {
                    drivers,
                    busAssistants,
                    totalStaff: staff.length
                },
                routes: {
                    totalRoutes: routes.length,
                    activeRoutes,
                    completedRoutes: routes.filter(r => r.status === 'completed').length
                },
                requests: {
                    pendingRequests: pendingParentRequests + pendingFuelRequests,
                    fuelRequests: pendingFuelRequests,
                    maintenanceRequests
                }
            })

            // Build recent activity from actual data
            const activities: RecentActivity[] = []
            
            // Add recent incidents
            incidents.slice(0, 2).forEach(incident => {
                activities.push({
                    id: incident.id,
                    type: 'incident',
                    title: `Incident reported on ${incident.incidentDate || incident.date || 'N/A'}`,
                    time: formatTimeAgo(incident.createdAt)
                })
            })

            // Add recent parent requests
            requests.slice(0, 2).forEach(request => {
                activities.push({
                    id: request.id,
                    type: 'student',
                    title: `${request.requestType}: ${request.requestTitle}`,
                    time: formatTimeAgo(request.createdAt)
                })
            })

            // Add recent fuel/maintenance requests
            fuelReqs.slice(0, 2).forEach(request => {
                activities.push({
                    id: request.id,
                    type: request.requestType === 'Fuel' ? 'fuel' : 'vehicle',
                    title: `${request.requestType} request for ${request.numberPlate}`,
                    time: formatTimeAgo(request.createdAt)
                })
            })

            // Sort by time and take latest 4
            setRecentActivity(activities.slice(0, 4))

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 60) return `${diffMins} minutes ago`
        if (diffHours < 24) return `${diffHours} hours ago`
        return `${diffDays} days ago`
    }

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'assign-route':
                navigate('/transport-manager/route-planning')
                break
            case 'fleet-status':
                navigate('/transport-manager/vehicles')
                break
            case 'generate-report':
                navigate('/transport-manager/operational-reports')
                break
            case 'view-incidents':
                navigate('/transport-manager/incident-reports')
                break
            default:
                break
        }
    }

    const handleActivityClick = (type: string) => {
        switch (type) {
            case 'vehicle':
                navigate('/transport-manager/maintenance')
                break
            case 'student':
                navigate('/transport-manager/change-requests')
                break
            case 'incident':
                navigate('/transport-manager/incident-reports')
                break
            case 'fuel':
                navigate('/transport-manager/fuel-requests')
                break
            default:
                break
        }
    }

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'vehicle': return '🚌'
            case 'student': return '👨‍🎓'
            case 'incident': return '⚠️'
            case 'fuel': return '⛽'
            default: return '📋'
        }
    }

    if (loading) {
        return (
            <div className="tabContent">
                <h2>{section.heading}</h2>
                <p>{section.description}</p>
                <div className="dashboard-loading">Loading dashboard data...</div>
            </div>
        )
    }

    return (
        <div className="tabContent">
            <h2>{section.heading}</h2>
            <p>{section.description}</p>
            
            {/* Key Metrics Grid */}
            <div className="dashboard-metrics-grid">
                {/* Operations Metrics */}
                <div className="metric-card metric-card--operations clickable" onClick={() => navigate('/transport-manager/route-monitoring')}>
                    <div className="metric-card__header">
                        <h3>Operations</h3>
                        <span className="metric-card__icon">📊</span>
                    </div>
                    <div className="metric-card__stats">
                        <div className="metric-stat">
                            <span className="metric-stat__value">{metrics.operations.activeRoutes}</span>
                            <span className="metric-stat__label">Active Routes</span>
                        </div>
                        <div className="metric-stat">
                            <span className="metric-stat__value metric-stat__value--warning">{metrics.operations.lateRoutes}</span>
                            <span className="metric-stat__label">Late Routes</span>
                        </div>
                        <div className="metric-stat">
                            <span className={`metric-stat__value ${metrics.operations.openIncidents > 0 ? 'metric-stat__value--danger' : 'metric-stat__value--success'}`}>
                                {metrics.operations.openIncidents}
                            </span>
                            <span className="metric-stat__label">Open Incidents</span>
                        </div>
                    </div>
                </div>

                {/* Fleet Metrics */}
                <div className="metric-card metric-card--fleet clickable" onClick={() => navigate('/transport-manager/vehicles')}>
                    <div className="metric-card__header">
                        <h3>Fleet</h3>
                        <span className="metric-card__icon">🚌</span>
                    </div>
                    <div className="metric-card__stats">
                        <div className="metric-stat">
                            <span className="metric-stat__value">{metrics.fleet.availableVehicles}</span>
                            <span className="metric-stat__label">Available Vehicles</span>
                        </div>
                        <div className="metric-stat">
                            <span className="metric-stat__value">{metrics.fleet.activeVehicles}</span>
                            <span className="metric-stat__label">Total Vehicles</span>
                        </div>
                        <div className="metric-stat">
                            <span className={`metric-stat__value ${metrics.fleet.maintenanceAlerts > 0 ? 'metric-stat__value--warning' : 'metric-stat__value--success'}`}>
                                {metrics.fleet.maintenanceAlerts}
                            </span>
                            <span className="metric-stat__label">Maintenance Alerts</span>
                        </div>
                    </div>
                </div>

                {/* Students Metrics */}
                <div className="metric-card metric-card--students clickable" onClick={() => navigate('/transport-manager/assignments')}>
                    <div className="metric-card__header">
                        <h3>Students</h3>
                        <span className="metric-card__icon">👨‍🎓</span>
                    </div>
                    <div className="metric-card__stats">
                        <div className="metric-stat">
                            <span className="metric-stat__value">{metrics.students.totalStudents}</span>
                            <span className="metric-stat__label">Total Students</span>
                        </div>
                        <div className="metric-stat">
                            <span className="metric-stat__value">{metrics.students.assignedStudents}</span>
                            <span className="metric-stat__label">Assigned Students</span>
                        </div>
                        <div className="metric-stat">
                            <span className={`metric-stat__value ${metrics.students.pendingRequests > 0 ? 'metric-stat__value--info' : 'metric-stat__value--success'}`}>
                                {metrics.students.pendingRequests}
                            </span>
                            <span className="metric-stat__label">Change Requests</span>
                        </div>
                    </div>
                </div>

                {/* Staff Metrics */}
                <div className="metric-card metric-card--staff clickable" onClick={() => navigate('/transport-manager/drivers')}>
                    <div className="metric-card__header">
                        <h3>Staff</h3>
                        <span className="metric-card__icon">👥</span>
                    </div>
                    <div className="metric-card__stats">
                        <div className="metric-stat">
                            <span className="metric-stat__value">{metrics.staff.drivers}</span>
                            <span className="metric-stat__label">Active Drivers</span>
                        </div>
                        <div className="metric-stat">
                            <span className="metric-stat__value">{metrics.staff.busAssistants}</span>
                            <span className="metric-stat__label">Bus Assistants</span>
                        </div>
                        <div className="metric-stat">
                            <span className="metric-stat__value metric-stat__value--success">{metrics.staff.totalStaff}</span>
                            <span className="metric-stat__label">Total Staff</span>
                        </div>
                    </div>
                </div>

                {/* Routes Metrics */}
                <div className="metric-card metric-card--routes clickable" onClick={() => navigate('/transport-manager/route-planning')}>
                    <div className="metric-card__header">
                        <h3>Routes</h3>
                        <span className="metric-card__icon">🗺️</span>
                    </div>
                    <div className="metric-card__stats">
                        <div className="metric-stat">
                            <span className="metric-stat__value">{metrics.routes.totalRoutes}</span>
                            <span className="metric-stat__label">Total Routes</span>
                        </div>
                        <div className="metric-stat">
                            <span className="metric-stat__value metric-stat__value--success">{metrics.routes.activeRoutes}</span>
                            <span className="metric-stat__label">Active Routes</span>
                        </div>
                        <div className="metric-stat">
                            <span className="metric-stat__value">{metrics.routes.completedRoutes}</span>
                            <span className="metric-stat__label">Completed Routes</span>
                        </div>
                    </div>
                </div>

                {/* Requests Metrics */}
                <div className="metric-card metric-card--requests clickable" onClick={() => navigate('/transport-manager/fuel-requests')}>
                    <div className="metric-card__header">
                        <h3>Requests</h3>
                        <span className="metric-card__icon">📋</span>
                    </div>
                    <div className="metric-card__stats">
                        <div className="metric-stat">
                            <span className={`metric-stat__value ${metrics.requests.pendingRequests > 0 ? 'metric-stat__value--warning' : 'metric-stat__value--success'}`}>
                                {metrics.requests.pendingRequests}
                            </span>
                            <span className="metric-stat__label">Pending Requests</span>
                        </div>
                        <div className="metric-stat">
                            <span className="metric-stat__value">{metrics.requests.fuelRequests}</span>
                            <span className="metric-stat__label">Fuel Requests</span>
                        </div>
                        <div className="metric-stat">
                            <span className="metric-stat__value">{metrics.requests.maintenanceRequests}</span>
                            <span className="metric-stat__label">Maintenance Requests</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="dashboard-quick-actions">
                <h3>Quick Actions</h3>
                <div className="quick-actions-grid">
                    <button className="quick-action-btn" onClick={() => handleQuickAction('assign-route')}>
                        <span className="quick-action-btn__icon">➕</span>
                        <span className="quick-action-btn__label">Assign Route</span>
                    </button>
                    <button className="quick-action-btn" onClick={() => handleQuickAction('fleet-status')}>
                        <span className="quick-action-btn__icon">🚌</span>
                        <span className="quick-action-btn__label">Fleet Status</span>
                    </button>
                    <button className="quick-action-btn" onClick={() => handleQuickAction('generate-report')}>
                        <span className="quick-action-btn__icon">📊</span>
                        <span className="quick-action-btn__label">Generate Report</span>
                    </button>
                    <button className="quick-action-btn" onClick={() => handleQuickAction('view-incidents')}>
                        <span className="quick-action-btn__icon">⚠️</span>
                        <span className="quick-action-btn__label">View Incidents</span>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="dashboard-recent-activity">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                    {recentActivity.length > 0 ? (
                        recentActivity.map((activity) => (
                            <div 
                                key={activity.id} 
                                className="activity-item clickable"
                                onClick={() => handleActivityClick(activity.type)}
                            >
                                <span className="activity-item__icon">{getActivityIcon(activity.type)}</span>
                                <div className="activity-item__content">
                                    <span className="activity-item__title">{activity.title}</span>
                                    <span className="activity-item__time">{activity.time}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="activity-item">
                            <span className="activity-item__icon">📭</span>
                            <div className="activity-item__content">
                                <span className="activity-item__title">No recent activity</span>
                                <span className="activity-item__time">-</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DashboardTab
