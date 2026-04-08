import { useEffect, useState } from 'react'
import {
    driverComplaintApi,
    driverIncidentApi,
    fuelMaintenanceApi,
    type DriverComplaintReportRecord,
    type DriverIncidentReportRecord,
    type FuelMaintenanceRequestRecord,
} from '../../../../../lib/api'
import Loader from '../../../../Loader/Loader'
import './MyActivity.css'

type ActivityEntry = {
    id: string
    kind: 'Fuel' | 'Incident' | 'Complaint'
    title: string
    subtitle: string
    description: string
    numberPlate: string
    dateLabel: string
    sortValue: number
    meta: string[]
}

const formatDate = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleDateString()
}

const formatDateTime = (dateValue: string, timeValue?: string) => {
    const formattedDate = formatDate(dateValue)
    const trimmedTime = timeValue ? timeValue.slice(0, 5) : ''

    return [formattedDate, trimmedTime].filter(Boolean).join(' at ')
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

const truncate = (value: string, maxLength = 180) => {
    const normalized = String(value || '').trim()

    if (normalized.length <= maxLength) {
        return normalized
    }

    return `${normalized.slice(0, maxLength - 1).trimEnd()}...`
}

const mapFuelRequest = (request: FuelMaintenanceRequestRecord): ActivityEntry => ({
    id: `fuel-${request.id}`,
    kind: 'Fuel',
    title: `${request.requestType} request`,
    subtitle: request.category,
    description: truncate(request.description),
    numberPlate: request.numberPlate,
    dateLabel: formatDateTime(request.requestDate, request.requestTime),
    sortValue: createSortValue(request.requestDate, request.requestTime, request.createdAt),
    meta: [
        `Mileage ${request.currentMileage}`,
        request.amount !== null ? `Amount ${request.amount}` : '',
        request.confirmedBy ? `Confirmed by ${request.confirmedBy}` : '',
    ].filter(Boolean),
})

const mapIncidentReport = (report: DriverIncidentReportRecord): ActivityEntry => ({
    id: `incident-${report.id}`,
    kind: 'Incident',
    title: 'Incident report',
    subtitle: report.pointOfIncident,
    description: truncate(report.description),
    numberPlate: report.numberPlate,
    dateLabel: formatDateTime(report.incidentDate, report.incidentTime),
    sortValue: createSortValue(report.incidentDate, report.incidentTime, report.createdAt),
    meta: [
        report.childrenInvolved ? `Children: ${truncate(report.childrenInvolved, 80)}` : '',
        report.actionTaken ? `Action: ${truncate(report.actionTaken, 80)}` : '',
        `${report.uploads.length} photo${report.uploads.length === 1 ? '' : 's'}`,
    ].filter(Boolean),
})

const mapComplaintReport = (report: DriverComplaintReportRecord): ActivityEntry => ({
    id: `complaint-${report.id}`,
    kind: 'Complaint',
    title: `${report.complaintType} complaint`,
    subtitle: `${report.timing} trip ${report.tripNumber}`,
    description: truncate(report.details),
    numberPlate: report.numberPlate,
    dateLabel: formatTimestamp(report.createdAt),
    sortValue: new Date(report.createdAt).getTime(),
    meta: [
        report.learnerName ? `Learner: ${report.learnerName}` : '',
        report.attachment ? 'Attachment included' : 'No attachment',
    ].filter(Boolean),
})

const DriverMyActivityMenuItem = () => {
    const [activities, setActivities] = useState<ActivityEntry[]>([])
    const [totals, setTotals] = useState({
        fuel: 0,
        incidents: 0,
        complaints: 0,
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const loadActivity = async (withLoader = true) => {
        if (withLoader) {
            setIsLoading(true)
        } else {
            setIsRefreshing(true)
        }

        setErrorMessage('')

        const results = await Promise.allSettled([
            fuelMaintenanceApi.getRequests(),
            driverIncidentApi.getReports(),
            driverComplaintApi.getReports(),
        ])

        const fuelRequests =
            results[0].status === 'fulfilled' ? results[0].value.data?.requests || [] : []
        const incidentReports =
            results[1].status === 'fulfilled' ? results[1].value.data?.reports || [] : []
        const complaintReports =
            results[2].status === 'fulfilled' ? results[2].value.data?.reports || [] : []

        const rejectedRequests = results.filter((result) => result.status === 'rejected')

        if (rejectedRequests.length === results.length) {
            setErrorMessage('Failed to load driver activity.')
        } else if (rejectedRequests.length > 0) {
            setErrorMessage('Some activity data could not be loaded.')
        }

        const nextActivities = [
            ...fuelRequests.map(mapFuelRequest),
            ...incidentReports.map(mapIncidentReport),
            ...complaintReports.map(mapComplaintReport),
        ]
            .sort((left, right) => right.sortValue - left.sortValue)
            .slice(0, 24)

        setTotals({
            fuel: fuelRequests.length,
            incidents: incidentReports.length,
            complaints: complaintReports.length,
        })
        setActivities(nextActivities)

        if (withLoader) {
            setIsLoading(false)
        } else {
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        void loadActivity(true)
    }, [])

    return (
        <section className="driverMyActivity">
            <div className="driverMyActivity__header">
                <div>
                    <h3 className="driverMyActivity__title">My Activity</h3>
                    <p className="driverMyActivity__description">
                        Review your latest fuel requests, incident reports, and complaint reports
                        in one place.
                    </p>
                </div>

                <button
                    type="button"
                    className="driverMyActivity__ghostButton"
                    onClick={() => void loadActivity(false)}
                    disabled={isLoading || isRefreshing}
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            <div className="driverMyActivity__stats">
                <article className="driverMyActivity__statCard">
                    <span>Fuel Requests</span>
                    <strong>{totals.fuel}</strong>
                </article>

                <article className="driverMyActivity__statCard">
                    <span>Incident Reports</span>
                    <strong>{totals.incidents}</strong>
                </article>

                <article className="driverMyActivity__statCard">
                    <span>Complaint Reports</span>
                    <strong>{totals.complaints}</strong>
                </article>

                <article className="driverMyActivity__statCard">
                    <span>Total Activity</span>
                    <strong>{totals.fuel + totals.incidents + totals.complaints}</strong>
                </article>
            </div>

            {errorMessage ? (
                <p className="driverMyActivity__status driverMyActivity__status--error">
                    {errorMessage}
                </p>
            ) : null}

            {isLoading ? <Loader variant="section" label="Loading activity" /> : null}

            {!isLoading && activities.length === 0 ? (
                <p className="driverMyActivity__emptyText">
                    No driver activity has been recorded yet.
                </p>
            ) : null}

            {!isLoading && activities.length > 0 ? (
                <ul className="driverMyActivity__timeline">
                    {activities.map((activity) => (
                        <li key={activity.id} className="driverMyActivity__timelineItem">
                            <div className="driverMyActivity__timelineTop">
                                <div>
                                    <strong>{activity.title}</strong>
                                    <span>{activity.dateLabel}</span>
                                </div>

                                <div className="driverMyActivity__badges">
                                    <span className="driverMyActivity__kindBadge">{activity.kind}</span>
                                    <span className="driverMyActivity__plateBadge">
                                        {activity.numberPlate}
                                    </span>
                                </div>
                            </div>

                            <div className="driverMyActivity__content">
                                <h4>{activity.subtitle}</h4>
                                <p>{activity.description}</p>

                                {activity.meta.length > 0 ? (
                                    <div className="driverMyActivity__meta">
                                        {activity.meta.map((item) => (
                                            <span key={`${activity.id}-${item}`}>{item}</span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}
        </section>
    )
}

export default DriverMyActivityMenuItem
