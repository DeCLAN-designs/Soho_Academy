import { useEffect, useState } from 'react'
import { staffApi, type StaffTodayOverview } from '../../../lib/api'
import Loader from '../../Loader/Loader'
import './StaffTripOverview.css'

type StaffTripOverviewProps = {
    roleLabel: 'Driver' | 'Bus Assistant'
}

const StaffTripOverview = ({ roleLabel }: StaffTripOverviewProps) => {
    const [overview, setOverview] = useState<StaffTodayOverview | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const loadOverview = async () => {
            setIsLoading(true)
            setErrorMessage('')

            try {
                const response = await staffApi.getTodayOverview()
                setOverview(response.data || null)
            } catch (error) {
                setErrorMessage(
                    error instanceof Error ? error.message : 'Failed to load today\'s trips.'
                )
            } finally {
                setIsLoading(false)
            }
        }

        void loadOverview()
    }, [])

    if (isLoading) {
        return <Loader variant="inline" label={`Loading ${roleLabel.toLowerCase()} trips`} />
    }

    if (errorMessage) {
        return <p className="staffTripOverview__error">{errorMessage}</p>
    }

    if (!overview || overview.trips.length === 0) {
        return (
            <div className="staffTripOverview staffTripOverview--empty">
                <h4>Today&apos;s Trips</h4>
                <p>No trips assigned to your account today.</p>
            </div>
        )
    }

    return (
        <div className="staffTripOverview">
            <div className="staffTripOverview__header">
                <h4>Today&apos;s Trips</h4>
                <span>{overview.summary.tripCount} scheduled</span>
            </div>

            <div className="staffTripOverview__stats">
                <article>
                    <span>Students</span>
                    <strong>{overview.summary.totalStudents}</strong>
                </article>
                <article>
                    <span>Boarded</span>
                    <strong>{overview.summary.boarded}</strong>
                </article>
                <article>
                    <span>Dropped Off</span>
                    <strong>{overview.summary.droppedOff}</strong>
                </article>
                <article>
                    <span>Pending</span>
                    <strong>{overview.summary.pendingDropoff}</strong>
                </article>
            </div>

            <ul className="staffTripOverview__list">
                {overview.trips.map((trip) => (
                    <li key={trip.id}>
                        <strong>
                            {trip.tripType} · {trip.routeCode} - {trip.routeName}
                        </strong>
                        <span>
                            {trip.vehiclePlate} · {trip.status}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default StaffTripOverview
