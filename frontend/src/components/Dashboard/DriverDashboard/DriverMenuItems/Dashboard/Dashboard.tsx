import { useEffect, useState } from 'react'
import {
    authApi,
    driverComplaintApi,
    driverIncidentApi,
    fuelMaintenanceApi,
    type AuthenticatedUserRecord,
    type DriverComplaintReportRecord,
    type DriverIncidentReportRecord,
    type FuelMaintenanceRequestRecord,
} from '../../../../../lib/api'
import { useAuth } from '../../../../../contexts/AuthContext'
import Loader from '../../../../Loader/Loader'
import './Dashboard.css'

type DashboardActivityItem = {
    id: string
    kind: 'Fuel' | 'Incident' | 'Complaint'
    title: string
    summary: string
    numberPlate: string
    dateLabel: string
    sortValue: number
}

type DriverDashboardStats = {
    fuelCount: number
    incidentCount: number
    complaintCount: number
    totalReports: number
    weeklyReports: number
}

const formatDate = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleDateString()
}

const formatDateTime = (dateValue: string, timeValue?: string) => {
    const trimmedTime = timeValue ? timeValue.slice(0, 5) : ''
    return [formatDate(dateValue), trimmedTime].filter(Boolean).join(' at ')
}

const formatTimestamp = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleString()
}

const createSortValue = (dateValue: string, timeValue?: string, fallback?: string) => {
    const normalizedTime = timeValue ? `${timeValue.slice(0, 5)}:00` : '00:00:00'
    const combinedValue = `${dateValue}T${normalizedTime}`
    const parsedValue = new Date(combinedValue)

    if (!Number.isNaN(parsedValue.getTime())) {
        return parsedValue.getTime()
    }

    const fallbackValue = fallback ? new Date(fallback) : null
    return fallbackValue && !Number.isNaN(fallbackValue.getTime()) ? fallbackValue.getTime() : 0
}

const trimText = (value: string, maxLength = 120) => {
    const normalized = String(value || '').trim()

    if (normalized.length <= maxLength) {
        return normalized
    }

    return `${normalized.slice(0, maxLength - 1).trimEnd()}...`
}

const mapFuelRequest = (request: FuelMaintenanceRequestRecord): DashboardActivityItem => ({
    id: `fuel-${request.id}`,
    kind: 'Fuel',
    title: `${request.requestType} request`,
    summary: trimText(request.description),
    numberPlate: request.numberPlate,
    dateLabel: formatDateTime(request.requestDate, request.requestTime),
    sortValue: createSortValue(request.requestDate, request.requestTime, request.createdAt),
})

const mapIncidentReport = (report: DriverIncidentReportRecord): DashboardActivityItem => ({
    id: `incident-${report.id}`,
    kind: 'Incident',
    title: report.pointOfIncident || 'Incident report',
    summary: trimText(report.description),
    numberPlate: report.numberPlate,
    dateLabel: formatDateTime(report.incidentDate, report.incidentTime),
    sortValue: createSortValue(report.incidentDate, report.incidentTime, report.createdAt),
})

const mapComplaintReport = (report: DriverComplaintReportRecord): DashboardActivityItem => ({
    id: `complaint-${report.id}`,
    kind: 'Complaint',
    title: `${report.complaintType} complaint`,
    summary: trimText(report.details),
    numberPlate: report.numberPlate,
    dateLabel: formatTimestamp(report.createdAt),
    sortValue: new Date(report.createdAt).getTime(),
})

const isWithinLastSevenDays = (sortValue: number) => {
    if (!sortValue) {
        return false
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return sortValue >= sevenDaysAgo
}

const DriverDashboardMenuItem = () => {
    const { user } = useAuth()
    const [profile, setProfile] = useState<AuthenticatedUserRecord | null>(null)
    const [stats, setStats] = useState<DriverDashboardStats>({
        fuelCount: 0,
        incidentCount: 0,
        complaintCount: 0,
        totalReports: 0,
        weeklyReports: 0,
    })
    const [recentActivity, setRecentActivity] = useState<DashboardActivityItem[]>([])
    const [lastUpdated, setLastUpdated] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const fallbackProfile: AuthenticatedUserRecord = {
        id: 0,
        email: '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phoneNumber: '',
        role: user?.role || '',
        numberPlate: user?.numberPlate || null,
    }

    const loadDashboard = async (withLoader = true) => {
        if (withLoader) {
            setIsLoading(true)
        } else {
            setIsRefreshing(true)
        }

        setErrorMessage('')

        const results = await Promise.allSettled([
            authApi.me(),
            fuelMaintenanceApi.getRequests(),
            driverIncidentApi.getReports(),
            driverComplaintApi.getReports(),
        ])

        const nextProfile =
            results[0].status === 'fulfilled' ? results[0].value.data || fallbackProfile : fallbackProfile
        const fuelRequests =
            results[1].status === 'fulfilled' ? results[1].value.data?.requests || [] : []
        const incidentReports =
            results[2].status === 'fulfilled' ? results[2].value.data?.reports || [] : []
        const complaintReports =
            results[3].status === 'fulfilled' ? results[3].value.data?.reports || [] : []

        const failedRequests = results.filter((result) => result.status === 'rejected')

        if (failedRequests.length === results.length) {
            setErrorMessage('Failed to load the driver dashboard.')
        } else if (failedRequests.length > 0) {
            setErrorMessage('Some dashboard data could not be loaded.')
        }

        const combinedActivity = [
            ...fuelRequests.map(mapFuelRequest),
            ...incidentReports.map(mapIncidentReport),
            ...complaintReports.map(mapComplaintReport),
        ].sort((left, right) => right.sortValue - left.sortValue)

        setProfile(nextProfile)
        setRecentActivity(combinedActivity.slice(0, 5))
        setStats({
            fuelCount: fuelRequests.length,
            incidentCount: incidentReports.length,
            complaintCount: complaintReports.length,
            totalReports: combinedActivity.length,
            weeklyReports: combinedActivity.filter((item) => isWithinLastSevenDays(item.sortValue)).length,
        })
        setLastUpdated(new Date().toLocaleString())

        if (withLoader) {
            setIsLoading(false)
        } else {
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        void loadDashboard(true)
    }, [])

    const activeProfile = profile || fallbackProfile
    const fullName = [activeProfile.firstName, activeProfile.lastName].filter(Boolean).join(' ').trim()
    const latestActivity = recentActivity[0] || null

    if (isLoading) {
        return <Loader variant="section" label="Loading driver dashboard" />
    }

    return (
        <section className="driverMenuDashboard">
            <div className="driverMenuDashboard__header">
                <div>
                    <h3 className="driverMenuDashboard__title">
                        {fullName ? `${fullName}'s Dashboard` : 'Driver Dashboard'}
                    </h3>
                    <p className="driverMenuDashboard__description">
                        Get a live overview of your assigned vehicle, reporting activity, and
                        latest submissions.
                    </p>
                </div>

                <button
                    type="button"
                    className="driverMenuDashboard__ghostButton"
                    onClick={() => void loadDashboard(false)}
                    disabled={isRefreshing}
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {errorMessage ? (
                <p className="driverMenuDashboard__status driverMenuDashboard__status--error">
                    {errorMessage}
                </p>
            ) : null}

            <div className="driverMenuDashboard__hero">
                <div className="driverMenuDashboard__identityCard">
                    <span>Driver</span>
                    <strong>{fullName || 'Not available'}</strong>
                    <p>{activeProfile.email || 'No email available'}</p>
                </div>

                <div className="driverMenuDashboard__plateCard">
                    <span>Assigned Bus</span>
                    <strong>{activeProfile.numberPlate || 'Not assigned'}</strong>
                </div>

                <div className="driverMenuDashboard__syncCard">
                    <span>Last Updated</span>
                    <strong>{lastUpdated || 'Not updated yet'}</strong>
                </div>
            </div>

            <div className="driverMenuDashboard__stats">
                <article className="driverMenuDashboard__statCard">
                    <span>Fuel Requests</span>
                    <strong>{stats.fuelCount}</strong>
                </article>

                <article className="driverMenuDashboard__statCard">
                    <span>Incident Reports</span>
                    <strong>{stats.incidentCount}</strong>
                </article>

                <article className="driverMenuDashboard__statCard">
                    <span>Complaint Reports</span>
                    <strong>{stats.complaintCount}</strong>
                </article>

                <article className="driverMenuDashboard__statCard">
                    <span>This Week</span>
                    <strong>{stats.weeklyReports}</strong>
                </article>
            </div>

            <div className="driverMenuDashboard__content">
                <section className="driverMenuDashboard__panel">
                    <div className="driverMenuDashboard__panelHeader">
                        <h4>Recent Activity</h4>
                        <span>{stats.totalReports} total records</span>
                    </div>

                    {recentActivity.length === 0 ? (
                        <p className="driverMenuDashboard__emptyText">
                            No driver activity has been recorded yet.
                        </p>
                    ) : (
                        <ul className="driverMenuDashboard__activityList">
                            {recentActivity.map((activity) => (
                                <li key={activity.id} className="driverMenuDashboard__activityItem">
                                    <div className="driverMenuDashboard__activityTop">
                                        <div>
                                            <strong>{activity.title}</strong>
                                            <span>{activity.dateLabel}</span>
                                        </div>

                                        <div className="driverMenuDashboard__badges">
                                            <span className="driverMenuDashboard__kindBadge">
                                                {activity.kind}
                                            </span>
                                            <span className="driverMenuDashboard__plateBadge">
                                                {activity.numberPlate}
                                            </span>
                                        </div>
                                    </div>

                                    <p>{activity.summary}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="driverMenuDashboard__panel">
                    <div className="driverMenuDashboard__panelHeader">
                        <h4>Driver Snapshot</h4>
                        <span>Live account summary</span>
                    </div>

                    <div className="driverMenuDashboard__snapshotGrid">
                        <article className="driverMenuDashboard__snapshotCard">
                            <h5>Phone Number</h5>
                            <p>{activeProfile.phoneNumber || 'Not available'}</p>
                        </article>

                        <article className="driverMenuDashboard__snapshotCard">
                            <h5>Role</h5>
                            <p>{activeProfile.role || 'Driver'}</p>
                        </article>

                        <article className="driverMenuDashboard__snapshotCard">
                            <h5>Latest Entry</h5>
                            <p>{latestActivity ? latestActivity.title : 'No entries yet'}</p>
                        </article>

                        <article className="driverMenuDashboard__snapshotCard">
                            <h5>Latest Timestamp</h5>
                            <p>{latestActivity ? latestActivity.dateLabel : 'No entries yet'}</p>
                        </article>
                    </div>
                </section>
            </div>
        </section>
    )
}

export default DriverDashboardMenuItem
