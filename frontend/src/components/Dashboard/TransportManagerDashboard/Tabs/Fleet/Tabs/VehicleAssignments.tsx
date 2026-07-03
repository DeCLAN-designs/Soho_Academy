import React, { useState, useEffect } from 'react'
import axios from 'axios'
import type { RoleSection } from '../../../../dashboard.types'
import './VehicleAssignments.css'

interface VehicleRouteAssignment {
  id: number
  vehiclePlate: string
  routeId: number
  routeName: string
  routeCode: string
  timePeriod: 'Morning' | 'Evening' | 'Both'
  driverUserId: number | null
  driverName: string | null
  assistantUserId: number | null
  assistantName: string | null
  effectiveFrom: string
  effectiveTo: string | null
  status: 'Active' | 'Inactive' | 'Temporary'
  notes: string | null
}

interface Vehicle {
  plate_number: string
  model: string
  status: string
}

interface Route {
  id: number
  route_name: string
  route_id: string
  status: string
}

interface Driver {
  id: number
  firstName: string
  lastName: string
}

interface Assistant {
  id: number
  firstName: string
  lastName: string
}

interface Props {
  section: RoleSection
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`

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

const VehicleAssignments: React.FC<Props> = ({ section }) => {
  const [assignments, setAssignments] = useState<VehicleRouteAssignment[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedAssignment, setSelectedAssignment] = useState<VehicleRouteAssignment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    vehiclePlate: '',
    routeId: '',
    timePeriod: 'Both' as 'Morning' | 'Evening' | 'Both',
    driverUserId: '',
    assistantUserId: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [assignmentsRes, vehiclesRes, routesRes, driversRes, assistantsRes] = await Promise.all([
        axiosInstance.get('/transport-manager/vehicle-assignments', { params: { date: selectedDate } }),
        axiosInstance.get('/fleet'),
        axiosInstance.get('/routes'),
        axiosInstance.get('/users?role=Driver'),
        axiosInstance.get('/users?role=Bus Assistant')
      ])
      
      setAssignments(assignmentsRes.data?.data || [])
      setVehicles(vehiclesRes.data?.data?.vehicles || vehiclesRes.data?.vehicles || [])
      setRoutes(routesRes.data?.data?.routes || routesRes.data?.routes || [])
      setDrivers(driversRes.data?.data?.users || driversRes.data?.users || [])
      setAssistants(assistantsRes.data?.data?.users || assistantsRes.data?.users || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setModalMode('add')
    setFormData({
      vehiclePlate: '',
      routeId: '',
      timePeriod: 'Both',
      driverUserId: '',
      assistantUserId: '',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: '',
      notes: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (assignment: VehicleRouteAssignment) => {
    setModalMode('edit')
    setSelectedAssignment(assignment)
    setFormData({
      vehiclePlate: assignment.vehiclePlate,
      routeId: assignment.routeId.toString(),
      timePeriod: assignment.timePeriod,
      driverUserId: assignment.driverUserId?.toString() || '',
      assistantUserId: assignment.assistantUserId?.toString() || '',
      effectiveFrom: assignment.effectiveFrom,
      effectiveTo: assignment.effectiveTo || '',
      notes: assignment.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedAssignment(null)
    setError(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      const payload = {
        vehiclePlate: formData.vehiclePlate,
        routeId: Number(formData.routeId),
        timePeriod: formData.timePeriod,
        driverUserId: formData.driverUserId ? Number(formData.driverUserId) : null,
        assistantUserId: formData.assistantUserId ? Number(formData.assistantUserId) : null,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || null,
        notes: formData.notes || null
      }

      if (modalMode === 'add') {
        await axiosInstance.post('/transport-manager/vehicle-assignments', payload)
      } else if (modalMode === 'edit' && selectedAssignment) {
        await axiosInstance.patch(`/transport-manager/vehicle-assignments/${selectedAssignment.id}`, payload)
      }
      
      await fetchData()
      handleCloseModal()
    } catch (err: any) {
      console.error(`Error ${modalMode} assignment:`, err)
      setError(err.response?.data?.message || `Failed to ${modalMode} assignment.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (assignment: VehicleRouteAssignment) => {
    if (!confirm(`Are you sure you want to delete this assignment?`)) return
    
    try {
      await axiosInstance.delete(`/transport-manager/vehicle-assignments/${assignment.id}`)
      await fetchData()
    } catch (err: any) {
      console.error('Error deleting assignment:', err)
      setError(err.response?.data?.message || 'Failed to delete assignment.')
    }
  }

  const getDriverName = (userId: number | null) => {
    if (!userId) return '—'
    const driver = drivers.find(d => d.id === userId)
    return driver ? `${driver.firstName} ${driver.lastName}` : '—'
  }

  const getAssistantName = (userId: number | null) => {
    if (!userId) return '—'
    const assistant = assistants.find(a => a.id === userId)
    return assistant ? `${assistant.firstName} ${assistant.lastName}` : '—'
  }

  if (loading) {
    return <div className="va-loading">Loading vehicle assignments...</div>
  }

  return (
    <div className="va-container">
      <div className="va-header">
        <div className="va-header-text">
          <h1>{section?.heading || 'Vehicle Assignments'}</h1>
          <p>{section?.description || 'Assign vehicles to routes for morning and evening trips'}</p>
        </div>
        <button className="va-btn va-btn-primary" onClick={handleOpenAddModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Assignment
        </button>
      </div>

      <div className="va-controls">
        <div className="va-date-picker">
          <label>Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="va-date-input"
          />
        </div>
      </div>

      {error && <div className="va-error">{error}</div>}

      {assignments.length === 0 ? (
        <div className="va-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3>No assignments found</h3>
          <p>Create an assignment to get started</p>
        </div>
      ) : (
        <div className="va-grid">
          {assignments.map(assignment => (
            <div key={assignment.id} className="va-card">
              <div className="va-card-header">
                <div className="va-vehicle-info">
                  <span className="va-plate">{assignment.vehiclePlate}</span>
                  <span className="va-route">{assignment.routeName}</span>
                </div>
                <span className={`va-period va-period--${assignment.timePeriod.toLowerCase()}`}>
                  {assignment.timePeriod}
                </span>
              </div>
              
              <div className="va-card-body">
                <div className="va-staff-info">
                  <div className="va-staff-item">
                    <span className="va-staff-label">Driver:</span>
                    <span className="va-staff-value">{getDriverName(assignment.driverUserId)}</span>
                  </div>
                  <div className="va-staff-item">
                    <span className="va-staff-label">Assistant:</span>
                    <span className="va-staff-value">{getAssistantName(assignment.assistantUserId)}</span>
                  </div>
                </div>
                
                <div className="va-dates">
                  <span className="va-date-label">Effective:</span>
                  <span className="va-date-value">
                    {assignment.effectiveFrom} {assignment.effectiveTo ? `- ${assignment.effectiveTo}` : '– Present'}
                  </span>
                </div>
              </div>
              
              <div className="va-card-actions">
                <button className="va-btn va-btn-secondary" onClick={() => handleOpenEditModal(assignment)}>
                  Edit
                </button>
                <button className="va-btn va-btn-danger" onClick={() => handleDelete(assignment)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="va-modal-overlay" onClick={handleCloseModal}>
          <div className="va-modal" onClick={(e) => e.stopPropagation()}>
            <div className="va-modal-header">
              <h2>{modalMode === 'add' ? 'Add Assignment' : 'Edit Assignment'}</h2>
              <button className="va-modal-close" onClick={handleCloseModal}>×</button>
            </div>
            
            <form className="va-modal-body" onSubmit={handleSubmit}>
              {error && <div className="va-error">{error}</div>}
              
              <div className="va-form-group">
                <label>Vehicle *</label>
                <select
                  name="vehiclePlate"
                  value={formData.vehiclePlate}
                  onChange={handleInputChange}
                  required
                  className="va-form-input"
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.plate_number} value={v.plate_number}>
                      {v.plate_number} - {v.model}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="va-form-group">
                <label>Route *</label>
                <select
                  name="routeId"
                  value={formData.routeId}
                  onChange={handleInputChange}
                  required
                  className="va-form-input"
                >
                  <option value="">Select route</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.route_name} ({r.route_id})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="va-form-group">
                <label>Time Period *</label>
                <select
                  name="timePeriod"
                  value={formData.timePeriod}
                  onChange={handleInputChange}
                  required
                  className="va-form-input"
                >
                  <option value="Morning">Morning Only</option>
                  <option value="Evening">Evening Only</option>
                  <option value="Both">Both Morning & Evening</option>
                </select>
              </div>
              
              <div className="va-form-group">
                <label>Driver</label>
                <select
                  name="driverUserId"
                  value={formData.driverUserId}
                  onChange={handleInputChange}
                  className="va-form-input"
                >
                  <option value="">No driver assigned</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="va-form-group">
                <label>Bus Assistant</label>
                <select
                  name="assistantUserId"
                  value={formData.assistantUserId}
                  onChange={handleInputChange}
                  className="va-form-input"
                >
                  <option value="">No assistant assigned</option>
                  {assistants.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.firstName} {a.lastName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="va-form-group">
                <label>Effective From *</label>
                <input
                  type="date"
                  name="effectiveFrom"
                  value={formData.effectiveFrom}
                  onChange={handleInputChange}
                  required
                  className="va-form-input"
                />
              </div>
              
              <div className="va-form-group">
                <label>Effective To</label>
                <input
                  type="date"
                  name="effectiveTo"
                  value={formData.effectiveTo}
                  onChange={handleInputChange}
                  className="va-form-input"
                />
                <small className="va-form-hint">Leave empty for ongoing assignment</small>
              </div>
              
              <div className="va-form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="va-form-input va-form-textarea"
                  rows={3}
                  placeholder="Optional notes..."
                />
              </div>
              
              <div className="va-modal-footer">
                <button type="button" className="va-btn va-btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="va-btn va-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Create Assignment' : 'Update Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default VehicleAssignments
