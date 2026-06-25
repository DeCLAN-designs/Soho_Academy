import { useEffect, useMemo, useState } from 'react'
import {
    staffApi,
    type StaffAttendanceRecord,
    type StaffAttendanceSummary,
    type StaffTripRecord,
    type UpdateStaffAttendancePayload,
} from '../../../lib/api'
import Loader from '../../Loader/Loader'
import './StaffAttendancePanel.css'

type StaffAttendancePanelProps = {
    roleLabel: 'Driver' | 'Bus Assistant'
}

const formatTime = (value: string | null) => {
    if (!value) return '—'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value

    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDeparture = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value

    return parsed.toLocaleString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const StaffAttendancePanel = ({ roleLabel }: StaffAttendancePanelProps) => {
    const [trips, setTrips] = useState<StaffTripRecord[]>([])
    const [selectedTripId, setSelectedTripId] = useState<number | null>(null)
    const [attendance, setAttendance] = useState<StaffAttendanceRecord[]>([])
    const [summary, setSummary] = useState<StaffAttendanceSummary | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isSavingId, setIsSavingId] = useState<number | null>(null)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const selectedTrip = useMemo(
        () => trips.find((trip) => trip.id === selectedTripId) || null,
        [trips, selectedTripId]
    )

    const loadTrips = async (withLoader = true) => {
        if (withLoader) {
            setIsLoading(true)
        } else {
            setIsRefreshing(true)
        }

        setErrorMessage('')

        try {
            const response = await staffApi.getTodayOverview()
            const nextTrips = response.data?.trips || []
            setTrips(nextTrips)

            if (nextTrips.length === 0) {
                setSelectedTripId(null)
                setAttendance([])
                setSummary(null)
                return
            }

            const stillSelected = nextTrips.some((trip) => trip.id === selectedTripId)
            const nextTripId = stillSelected ? selectedTripId : nextTrips[0].id
            setSelectedTripId(nextTripId)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to load today\'s trips.'
            )
        } finally {
            if (withLoader) {
                setIsLoading(false)
            } else {
                setIsRefreshing(false)
            }
        }
    }

    const loadAttendance = async (tripId: number) => {
        setErrorMessage('')

        try {
            const response = await staffApi.getTripAttendance(tripId)
            setAttendance(response.data?.attendance || [])
            setSummary(response.data?.summary || null)
        } catch (error) {
            setAttendance([])
            setSummary(null)
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to load attendance records.'
            )
        }
    }

    useEffect(() => {
        void loadTrips(true)
    }, [])

    useEffect(() => {
        if (!selectedTripId) {
            return
        }

        void loadAttendance(selectedTripId)
    }, [selectedTripId])

    const handleUpdate = async (
        record: StaffAttendanceRecord,
        payload: UpdateStaffAttendancePayload
    ) => {
        setIsSavingId(record.id)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            await staffApi.updateAttendance(record.id, payload)
            setSuccessMessage(`Attendance updated for ${record.student_name}.`)
            if (selectedTripId) {
                await loadAttendance(selectedTripId)
            }
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to update attendance.'
            )
        } finally {
            setIsSavingId(null)
        }
    }

    if (isLoading) {
        return <Loader variant="section" label={`Loading ${roleLabel.toLowerCase()} attendance`} />
    }

    return (
        <section className="staffAttendance">
            <div className="staffAttendance__header">
                <div>
                    <h3 className="staffAttendance__title">Today&apos;s Attendance</h3>
                    <p className="staffAttendance__description">
                        Mark student pickup and drop-off for your assigned trips. Times are
                        recorded automatically when status is updated.
                    </p>
                </div>
                <button
                    type="button"
                    className="staffAttendance__refresh"
                    onClick={() => void loadTrips(false)}
                    disabled={isRefreshing}
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {successMessage ? (
                <p className="staffAttendance__message staffAttendance__message--success">
                    {successMessage}
                </p>
            ) : null}

            {errorMessage ? (
                <p className="staffAttendance__message staffAttendance__message--error">
                    {errorMessage}
                </p>
            ) : null}

            {trips.length === 0 ? (
                <div className="staffAttendance__empty">
                    No trips are assigned to your account for today.
                </div>
            ) : (
                <>
                    <div className="staffAttendance__tripTabs">
                        {trips.map((trip) => (
                            <button
                                key={trip.id}
                                type="button"
                                className={
                                    selectedTripId === trip.id
                                        ? 'staffAttendance__tripTab staffAttendance__tripTab--active'
                                        : 'staffAttendance__tripTab'
                                }
                                onClick={() => setSelectedTripId(trip.id)}
                            >
                                <strong>{trip.tripType} Trip</strong>
                                <span>
                                    {trip.routeCode} · {formatDeparture(trip.departureTime)}
                                </span>
                            </button>
                        ))}
                    </div>

                    {selectedTrip ? (
                        <div className="staffAttendance__tripMeta">
                            <div>
                                <span className="staffAttendance__label">Route</span>
                                <strong>
                                    {selectedTrip.routeCode} - {selectedTrip.routeName}
                                </strong>
                            </div>
                            <div>
                                <span className="staffAttendance__label">Vehicle</span>
                                <strong>{selectedTrip.vehiclePlate}</strong>
                            </div>
                            <div>
                                <span className="staffAttendance__label">Driver / Assistant</span>
                                <strong>
                                    {selectedTrip.driverName} / {selectedTrip.assistantName}
                                </strong>
                            </div>
                            <div>
                                <span className="staffAttendance__label">Trip Status</span>
                                <strong>{selectedTrip.status}</strong>
                            </div>
                        </div>
                    ) : null}

                    {summary ? (
                        <div className="staffAttendance__stats">
                            <article>
                                <span>Students</span>
                                <strong>{summary.total}</strong>
                            </article>
                            <article>
                                <span>Boarded</span>
                                <strong>{summary.boarded}</strong>
                            </article>
                            <article>
                                <span>Dropped Off</span>
                                <strong>{summary.droppedOff}</strong>
                            </article>
                            <article>
                                <span>Pending</span>
                                <strong>{summary.pendingDropoff}</strong>
                            </article>
                        </div>
                    ) : null}

                    <div className="staffAttendance__tableWrap">
                        <table className="staffAttendance__table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Stop</th>
                                    <th>Pickup Status</th>
                                    <th>Pickup Time</th>
                                    <th>Drop-off Status</th>
                                    <th>Drop-off Time</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendance.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="staffAttendance__emptyCell">
                                            No students on this trip yet.
                                        </td>
                                    </tr>
                                ) : (
                                    attendance.map((record) => (
                                        <tr key={record.id}>
                                            <td>
                                                <strong>{record.student_name}</strong>
                                                <span>{record.admission_number}</span>
                                            </td>
                                            <td>{record.stop_name}</td>
                                            <td>{record.boarding_status}</td>
                                            <td>{formatTime(record.boarded_at)}</td>
                                            <td>{record.dropoff_status}</td>
                                            <td>{formatTime(record.dropped_off_at)}</td>
                                            <td>
                                                <div className="staffAttendance__actions">
                                                    <button
                                                        type="button"
                                                        disabled={isSavingId === record.id}
                                                        onClick={() =>
                                                            void handleUpdate(record, {
                                                                boarding_status: 'Boarded',
                                                            })
                                                        }
                                                    >
                                                        Mark Boarded
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isSavingId === record.id}
                                                        onClick={() =>
                                                            void handleUpdate(record, {
                                                                dropoff_status: 'Dropped Off',
                                                            })
                                                        }
                                                    >
                                                        Mark Dropped Off
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isSavingId === record.id}
                                                        onClick={() =>
                                                            void handleUpdate(record, {
                                                                boarding_status: 'Absent',
                                                                dropoff_status: 'Not Dropped',
                                                            })
                                                        }
                                                    >
                                                        Mark Absent
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    )
}

export default StaffAttendancePanel
