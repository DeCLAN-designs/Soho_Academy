import React, { useState, useMemo } from 'react'
import axios from 'axios'
import type { RoleSection } from '../../../../dashboard.types'
import { makeTripPayload } from '../../../../../../utils/tripSimulator'

interface TripSimulationProps {
  section: RoleSection
}

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('soho_auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const statuses = ['Ready', 'In Progress', 'Delayed', 'Returned', 'Cancelled', 'Archived']

const TripSimulation: React.FC<TripSimulationProps> = ({ section }) => {
  const [payload, setPayload] = useState(() => makeTripPayload({}))
  const [trip, setTrip] = useState<any>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const appendLog = (message: string) => {
    setLog((current) => [message, ...current].slice(0, 20))
  }

  const tripSummary = useMemo(() => {
    if (!trip) return 'No trip created yet.'
    return `Trip ${trip.id} for route ${trip.routeName} is currently ${trip.status}`
  }, [trip])

  const createTrip = async () => {
    setErrorMessage(null)
    setStatusMessage(null)
    setLoading(true)

    try {
      const res = await axiosInstance.post('/trips', payload)
      const createdTrip = res.data?.data || res.data
      setTrip(createdTrip)
      setStatusMessage('Trip created successfully.')
      appendLog(`Created trip ${createdTrip.id} with status ${createdTrip.status}`)
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to create trip.'
      setErrorMessage(message)
      appendLog(`Create trip failed: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: string) => {
    if (!trip) return

    setErrorMessage(null)
    setStatusMessage(null)
    setLoading(true)

    try {
      const res = await axiosInstance.post(`/trips/${trip.id}/status`, { status })
      const updatedTrip = res.data?.data || res.data
      setTrip(updatedTrip)
      setStatusMessage(`Trip status updated to ${status}.`)
      appendLog(`Updated trip ${trip.id} -> ${status}`)
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to update trip status.'
      setErrorMessage(message)
      appendLog(`Status update failed: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (field: string, value: string) => {
    setPayload((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="tabContent">
      <div className="tabHeader">
        <h1>{section.heading}</h1>
        <p>{section.description}</p>
      </div>

      <div className="tripSimulatorPage">
        <section className="tripSimulatorForm">
          <h2>Trip creation</h2>
          <div className="formGrid">
            <label>
              Route ID
              <input
                value={payload.routeId}
                type="number"
                onChange={(event) => handleFieldChange('routeId', event.target.value)}
              />
            </label>
            <label>
              Vehicle plate
              <input
                value={payload.vehiclePlate}
                onChange={(event) => handleFieldChange('vehiclePlate', event.target.value)}
              />
            </label>
            <label>
              Driver name
              <input
                value={payload.driverName}
                onChange={(event) => handleFieldChange('driverName', event.target.value)}
              />
            </label>
            <label>
              Assistant name
              <input
                value={payload.assistantName || ''}
                onChange={(event) => handleFieldChange('assistantName', event.target.value)}
              />
            </label>
            <label>
              Departure time
              <input
                type="datetime-local"
                value={payload.departureTime.slice(0, 16)}
                onChange={(event) => handleFieldChange('departureTime', event.target.value)}
              />
            </label>
            <label>
              Expected return time
              <input
                type="datetime-local"
                value={payload.expectedReturnTime.slice(0, 16)}
                onChange={(event) => handleFieldChange('expectedReturnTime', event.target.value)}
              />
            </label>
            <label className="tripSimulatorNotes">
              Notes
              <textarea
                value={payload.notes || ''}
                onChange={(event) => handleFieldChange('notes', event.target.value)}
              />
            </label>
          </div>

          <button className="rm-btn rm-btn--primary" onClick={createTrip} disabled={loading}>
            {loading ? 'Working…' : 'Create demo trip'}
          </button>
        </section>

        <section className="tripSimulatorStatus">
          <h2>Trip progression</h2>
          <p>{tripSummary}</p>
          <div className="statusButtonGrid">
            {statuses.map((status) => (
              <button
                key={status}
                className="rm-btn rm-btn--secondary"
                onClick={() => updateStatus(status)}
                disabled={!trip || loading}
                type="button"
              >
                {status}
              </button>
            ))}
          </div>
          {statusMessage && <div className="tripSimulatorSuccess">{statusMessage}</div>}
          {errorMessage && <div className="tripSimulatorError">{errorMessage}</div>}
        </section>

        <section className="tripSimulatorLog">
          <h2>Action log</h2>
          {log.length === 0 ? (
            <p>No actions yet.</p>
          ) : (
            <ul>
              {log.map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default TripSimulation
