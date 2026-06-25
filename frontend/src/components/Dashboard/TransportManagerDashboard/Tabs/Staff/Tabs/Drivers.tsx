import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import type { RoleSection } from '../../../../dashboard.types'
import './Drivers.css'

interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  numberPlate: string | null;
  role: string;
}

interface DriversProps {
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

const Drivers: React.FC<DriversProps> = ({ section }) => {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    numberPlate: '',
    password: ''
  })

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get('/users?role=Driver')
      const data = response.data?.data?.users || response.data?.users || []
      setDrivers(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching drivers:', err)
      setError('Failed to load drivers. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setModalMode('add')
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      numberPlate: '',
      password: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (driver: Driver) => {
    setModalMode('edit')
    setSelectedDriver(driver)
    setFormData({
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phoneNumber: driver.phoneNumber,
      numberPlate: driver.numberPlate || '',
      password: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenDeleteConfirm = (driver: Driver) => {
    setSelectedDriver(driver)
    setIsDeleteConfirmOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setIsDeleteConfirmOpen(false)
    setSelectedDriver(null)
    setError(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      if (modalMode === 'add') {
        const payload = {
          ...formData,
          role: 'Driver'
        }
        await axiosInstance.post('/auth/register', payload)
      } else if (modalMode === 'edit' && selectedDriver) {
        const payload = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          numberPlate: formData.numberPlate,
          role: 'Driver'
        }
        await axiosInstance.put(`/users/${selectedDriver.id}`, payload)
      }
      await fetchDrivers()
      handleCloseModal()
    } catch (err: any) {
      console.error(`Error ${modalMode === 'add' ? 'adding' : 'editing'} driver:`, err)
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || `Failed to ${modalMode} driver.`
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedDriver) return
    setIsSubmitting(true)
    setError(null)
    try {
      await axiosInstance.delete(`/users/${selectedDriver.id}`)
      await fetchDrivers()
      handleCloseModal()
    } catch (err: any) {
      console.error('Error deleting driver:', err)
      setError(err.response?.data?.message || 'Failed to delete driver.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredDrivers = useMemo(() => {
    if (!searchTerm) return drivers
    const q = searchTerm.toLowerCase()
    return drivers.filter(d => 
      d.firstName.toLowerCase().includes(q) ||
      d.lastName.toLowerCase().includes(q) ||
      d.phoneNumber.includes(q) ||
      (d.numberPlate && d.numberPlate.toLowerCase().includes(q))
    )
  }, [drivers, searchTerm])

  return (
    <div className="drivers-container">
      <div className="drivers-header">
        <div className="drivers-header-text">
          <h1>{section?.heading || 'Drivers'}</h1>
          <p>{section?.description || 'Manage driver information and assignments'}</p>
        </div>
        <button className="driver-btn driver-btn-primary" onClick={handleOpenAddModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Driver
        </button>
      </div>

      <div className="drivers-controls">
        <div className="drivers-search-wrapper">
          <svg className="drivers-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="drivers-search-input"
            placeholder="Search drivers by name, phone, or vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="drivers-loading">Loading drivers...</div>
      ) : error && !isModalOpen && !isDeleteConfirmOpen ? (
        <div className="drivers-error">{error}</div>
      ) : filteredDrivers.length === 0 ? (
        <div className="drivers-empty">No drivers found matching your search.</div>
      ) : (
        <div className="drivers-grid">
          {filteredDrivers.map(driver => (
            <div key={driver.id} className="driver-card">
              <div className="driver-card-header">
                <div className="driver-avatar">
                  {driver.firstName.charAt(0)}{driver.lastName.charAt(0)}
                </div>
                <div className="driver-info">
                  <h3>{driver.firstName} {driver.lastName}</h3>
                  <span className="driver-role">{driver.role}</span>
                </div>
              </div>
              
              <div className="driver-details">
                <div className="driver-detail-item">
                  <div className="driver-detail-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </div>
                  <span>{driver.phoneNumber || 'No phone number'}</span>
                </div>
                <div className="driver-detail-item">
                  <div className="driver-detail-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <span>{driver.email || 'No email provided'}</span>
                </div>
                <div className="driver-detail-item">
                  <div className="driver-detail-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" rx="1" />
                      <path d="M16 8h4l3 3v5h-7V8z" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                  </div>
                  {driver.numberPlate ? (
                    <span className="driver-vehicle-tag">{driver.numberPlate}</span>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>
                  )}
                </div>
              </div>

              <div className="driver-card-actions">
                <button className="driver-btn driver-btn-secondary" onClick={() => handleOpenEditModal(driver)} style={{ flex: 1 }}>
                  Edit
                </button>
                <button className="driver-btn driver-btn-danger" onClick={() => handleOpenDeleteConfirm(driver)} style={{ flex: 1 }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="drivers-modal-overlay">
          <div className="drivers-modal">
            <div className="drivers-modal-header">
              <h2>{modalMode === 'add' ? 'Add New Driver' : 'Edit Driver'}</h2>
              <button className="drivers-modal-close" onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="drivers-modal-body">
                {error && <div className="drivers-error" style={{ marginBottom: '1rem', padding: '0.5rem' }}>{error}</div>}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="drivers-form-group">
                    <label>First Name</label>
                    <input type="text" name="firstName" className="drivers-form-input" value={formData.firstName} onChange={handleInputChange} required />
                  </div>
                  <div className="drivers-form-group">
                    <label>Last Name</label>
                    <input type="text" name="lastName" className="drivers-form-input" value={formData.lastName} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="drivers-form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" className="drivers-form-input" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="drivers-form-group">
                  <label>Phone Number</label>
                  <input type="text" name="phoneNumber" className="drivers-form-input" value={formData.phoneNumber} onChange={handleInputChange} required />
                </div>
                <div className="drivers-form-group">
                  <label>Number Plate (Optional)</label>
                  <input type="text" name="numberPlate" className="drivers-form-input" value={formData.numberPlate} onChange={handleInputChange} />
                </div>
                
                {modalMode === 'add' && (
                  <div className="drivers-form-group">
                    <label>Temporary Password</label>
                    <input type="password" name="password" className="drivers-form-input" value={formData.password} onChange={handleInputChange} required minLength={6} />
                  </div>
                )}
              </div>
              <div className="drivers-modal-footer">
                <button type="button" className="driver-btn driver-btn-secondary" onClick={handleCloseModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="driver-btn driver-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Add Driver' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="drivers-modal-overlay">
          <div className="drivers-modal" style={{ maxWidth: '400px' }}>
            <div className="drivers-modal-header">
              <h2>Confirm Deletion</h2>
              <button className="drivers-modal-close" onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="drivers-modal-body">
              {error && <div className="drivers-error" style={{ marginBottom: '1rem', padding: '0.5rem' }}>{error}</div>}
              <p style={{ margin: 0 }}>Are you sure you want to delete the driver <strong>{selectedDriver?.firstName} {selectedDriver?.lastName}</strong>? This action cannot be undone.</p>
            </div>
            <div className="drivers-modal-footer">
              <button type="button" className="driver-btn driver-btn-secondary" onClick={handleCloseModal} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="button" className="driver-btn driver-btn-danger" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Drivers
