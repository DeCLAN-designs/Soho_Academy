import React, { useState, useEffect } from 'react'
import axios from 'axios'
import type { RoleSection } from '../../../../dashboard.types'
import './Scheduling.css'

interface Route {
  id: number;
  routeCode: string;
  routeName: string;
  status: string;
}

interface Trip {
  id: number;
  routeId: number;
  departureTime: string;
  expectedReturnTime: string;
  status: string;
  driverUserId: number;
  assistantUserId: number | null;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

interface SchedulingProps {
  section: RoleSection;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('soho_auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const Scheduling: React.FC<SchedulingProps> = ({ section }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [trips, setTrips] = useState<Trip[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [assistants, setAssistants] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    routeId: '',
    departureTime: '',
    expectedReturnTime: '',
    driverUserId: '',
    assistantUserId: '',
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [tripsRes, routesRes, driversRes, assistantsRes] = await Promise.all([
        axiosInstance.get(`/trips/date/${selectedDate}`),
        axiosInstance.get('/routes'),
        axiosInstance.get('/users?role=Driver'),
        axiosInstance.get('/users?role=Bus Assistant')
      ])

      setTrips(tripsRes.data?.data?.trips || tripsRes.data?.trips || [])
      setRoutes(routesRes.data?.data?.routes || routesRes.data?.routes || [])
      setDrivers(driversRes.data?.data?.users || driversRes.data?.users || [])
      setAssistants(assistantsRes.data?.data?.users || assistantsRes.data?.users || [])
    } catch (err) {
      console.error('Error fetching scheduling data:', err)
      setError('Failed to load scheduling data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = () => {
    setFormData({
      routeId: '',
      departureTime: '',
      expectedReturnTime: '',
      driverUserId: '',
      assistantUserId: '',
      notes: ''
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setError(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        routeId: parseInt(formData.routeId),
        departureTime: formData.departureTime,
        expectedReturnTime: formData.expectedReturnTime,
        driverUserId: parseInt(formData.driverUserId),
        assistantUserId: formData.assistantUserId ? parseInt(formData.assistantUserId) : null,
        notes: formData.notes
      }
      await axiosInstance.post('/trips', payload)
      await fetchData()
      handleCloseModal()
    } catch (err: any) {
      console.error('Error creating trip:', err)
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to create trip.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRouteById = (routeId: number) => routes.find(r => r.id === routeId)
  const getDriverById = (driverId: number) => drivers.find(d => d.id === driverId)
  const getAssistantById = (assistantId: number | null) => assistants.find(a => a.id === assistantId)

  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="scheduling-container">
      <div className="scheduling-header">
        <div className="scheduling-header-text">
          <h1>{section?.heading || 'Scheduling'}</h1>
          <p>{section?.description || 'Manage staff scheduling and shifts'}</p>
        </div>
        <button className="scheduling-btn scheduling-btn-primary" onClick={handleOpenModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Trip
        </button>
      </div>

      <div className="scheduling-controls">
        <div className="scheduling-date-picker">
          <label>Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="scheduling-loading">Loading schedule...</div>
      ) : error && !isModalOpen ? (
        <div className="scheduling-error">{error}</div>
      ) : trips.length === 0 ? (
        <div className="scheduling-empty">No trips scheduled for {formatDate(selectedDate)}.</div>
      ) : (
        <div className="scheduling-grid">
          {trips.map(trip => {
            const route = getRouteById(trip.routeId)
            const driver = getDriverById(trip.driverUserId)
            const assistant = getAssistantById(trip.assistantUserId)

            return (
              <div key={trip.id} className="schedule-card">
                <div className="schedule-card-header">
                  <div className="schedule-route-info">
                    <h3>{route?.routeName || 'Unknown Route'}</h3>
                    <span className="schedule-route-code">{route?.routeCode || 'N/A'}</span>
                  </div>
                  <span className={`schedule-status ${trip.status.toLowerCase().replace(' ', '-')}`}>
                    {trip.status}
                  </span>
                </div>

                <div className="schedule-time">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  {formatTime(trip.departureTime)} - {formatTime(trip.expectedReturnTime)}
                </div>

                <div className="schedule-staff">
                  <div className="schedule-staff-item">
                    <span className="schedule-staff-label">Driver:</span>
                    <span className="schedule-staff-value">
                      {driver ? `${driver.firstName} ${driver.lastName}` : 'Unassigned'}
                    </span>
                  </div>
                  <div className="schedule-staff-item">
                    <span className="schedule-staff-label">Assistant:</span>
                    <span className="schedule-staff-value">
                      {assistant ? `${assistant.firstName} ${assistant.lastName}` : 'Unassigned'}
                    </span>
                  </div>
                </div>

                <div className="schedule-card-actions">
                  <button className="scheduling-btn scheduling-btn-secondary" style={{ flex: 1 }}>
                    View Details
                  </button>
                  <button className="scheduling-btn scheduling-btn-danger" style={{ flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Trip Modal */}
      {isModalOpen && (
        <div className="scheduling-modal-overlay">
          <div className="scheduling-modal">
            <div className="scheduling-modal-header">
              <h2>Create New Trip</h2>
              <button className="scheduling-modal-close" onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="scheduling-modal-body">
                {error && <div className="scheduling-error" style={{ marginBottom: '1rem', padding: '0.5rem' }}>{error}</div>}

                <div className="scheduling-form-group">
                  <label>Route</label>
                  <select
                    name="routeId"
                    className="scheduling-form-select"
                    value={formData.routeId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a route</option>
                    {routes.filter(r => r.status === 'Active').map(route => (
                      <option key={route.id} value={route.id}>
                        {route.routeCode} - {route.routeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="scheduling-form-group">
                    <label>Departure Time</label>
                    <input
                      type="datetime-local"
                      name="departureTime"
                      className="scheduling-form-input"
                      value={formData.departureTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="scheduling-form-group">
                    <label>Expected Return Time</label>
                    <input
                      type="datetime-local"
                      name="expectedReturnTime"
                      className="scheduling-form-input"
                      value={formData.expectedReturnTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="scheduling-form-group">
                    <label>Driver</label>
                    <select
                      name="driverUserId"
                      className="scheduling-form-select"
                      value={formData.driverUserId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select a driver</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.firstName} {driver.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="scheduling-form-group">
                    <label>Bus Assistant (Optional)</label>
                    <select
                      name="assistantUserId"
                      className="scheduling-form-select"
                      value={formData.assistantUserId}
                      onChange={handleInputChange}
                    >
                      <option value="">No assistant</option>
                      {assistants.map(assistant => (
                        <option key={assistant.id} value={assistant.id}>
                          {assistant.firstName} {assistant.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="scheduling-form-group">
                  <label>Notes (Optional)</label>
                  <input
                    type="text"
                    name="notes"
                    className="scheduling-form-input"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
              <div className="scheduling-modal-footer">
                <button type="button" className="scheduling-btn scheduling-btn-secondary" onClick={handleCloseModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="scheduling-btn scheduling-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Scheduling
