import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import type { RoleSection } from '../../../../dashboard.types'
import './BusAssistants.css'

interface BusAssistant {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  routeNumber: string | null;
  role: string;
}

interface BusAssistantsProps {
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

const BusAssistants: React.FC<BusAssistantsProps> = ({ section }) => {
  const [busAssistants, setBusAssistants] = useState<BusAssistant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedAssistant, setSelectedAssistant] = useState<BusAssistant | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    routeNumber: '',
    password: ''
  })

  useEffect(() => {
    fetchBusAssistants()
  }, [])

  const fetchBusAssistants = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get('/users?role=Bus Assistant')
      const data = response.data?.data?.users || response.data?.users || []
      setBusAssistants(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching bus assistants:', err)
      setError('Failed to load bus assistants. Please try again later.')
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
      routeNumber: '',
      password: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (assistant: BusAssistant) => {
    setModalMode('edit')
    setSelectedAssistant(assistant)
    setFormData({
      firstName: assistant.firstName,
      lastName: assistant.lastName,
      email: assistant.email,
      phoneNumber: assistant.phoneNumber,
      routeNumber: assistant.routeNumber || '',
      password: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenDeleteConfirm = (assistant: BusAssistant) => {
    setSelectedAssistant(assistant)
    setIsDeleteConfirmOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setIsDeleteConfirmOpen(false)
    setSelectedAssistant(null)
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
          role: 'Bus Assistant'
        }
        await axiosInstance.post('/auth/register', payload)
      } else if (modalMode === 'edit' && selectedAssistant) {
        const payload = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          routeNumber: formData.routeNumber,
          role: 'Bus Assistant'
        }
        await axiosInstance.put(`/users/${selectedAssistant.id}`, payload)
      }
      await fetchBusAssistants()
      handleCloseModal()
    } catch (err: any) {
      console.error(`Error ${modalMode === 'add' ? 'adding' : 'editing'} bus assistant:`, err)
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || `Failed to ${modalMode} bus assistant.`
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAssistant) return
    setIsSubmitting(true)
    setError(null)
    try {
      await axiosInstance.delete(`/users/${selectedAssistant.id}`)
      await fetchBusAssistants()
      handleCloseModal()
    } catch (err: any) {
      console.error('Error deleting bus assistant:', err)
      setError(err.response?.data?.message || 'Failed to delete bus assistant.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredAssistants = useMemo(() => {
    if (!searchTerm) return busAssistants
    const q = searchTerm.toLowerCase()
    return busAssistants.filter(a => 
      a.firstName.toLowerCase().includes(q) ||
      a.lastName.toLowerCase().includes(q) ||
      a.phoneNumber.includes(q) ||
      (a.routeNumber && a.routeNumber.toLowerCase().includes(q))
    )
  }, [busAssistants, searchTerm])

  return (
    <div className="bus-assistants-container">
      <div className="bus-assistants-header">
        <div className="bus-assistants-header-text">
          <h1>{section?.heading || 'Bus Assistants'}</h1>
          <p>{section?.description || 'Manage bus assistant information and assignments'}</p>
        </div>
        <button className="bus-assistant-btn bus-assistant-btn-primary" onClick={handleOpenAddModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Bus Assistant
        </button>
      </div>

      <div className="bus-assistants-controls">
        <div className="bus-assistants-search-wrapper">
          <svg className="bus-assistants-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="bus-assistants-search-input"
            placeholder="Search bus assistants by name, phone, or route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="bus-assistants-loading">Loading bus assistants...</div>
      ) : error && !isModalOpen && !isDeleteConfirmOpen ? (
        <div className="bus-assistants-error">{error}</div>
      ) : filteredAssistants.length === 0 ? (
        <div className="bus-assistants-empty">No bus assistants found matching your search.</div>
      ) : (
        <div className="bus-assistants-grid">
          {filteredAssistants.map(assistant => (
            <div key={assistant.id} className="bus-assistant-card">
              <div className="bus-assistant-card-header">
                <div className="bus-assistant-avatar">
                  {assistant.firstName.charAt(0)}{assistant.lastName.charAt(0)}
                </div>
                <div className="bus-assistant-info">
                  <h3>{assistant.firstName} {assistant.lastName}</h3>
                  <span className="bus-assistant-role">{assistant.role}</span>
                </div>
              </div>
              
              <div className="bus-assistant-details">
                <div className="bus-assistant-detail-item">
                  <div className="bus-assistant-detail-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </div>
                  <span>{assistant.phoneNumber || 'No phone number'}</span>
                </div>
                <div className="bus-assistant-detail-item">
                  <div className="bus-assistant-detail-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <span>{assistant.email || 'No email provided'}</span>
                </div>
                <div className="bus-assistant-detail-item">
                  <div className="bus-assistant-detail-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
                    </svg>
                  </div>
                  {assistant.routeNumber ? (
                    <span className="bus-assistant-route-tag">{assistant.routeNumber}</span>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>
                  )}
                </div>
              </div>

              <div className="bus-assistant-card-actions">
                <button className="bus-assistant-btn bus-assistant-btn-secondary" onClick={() => handleOpenEditModal(assistant)} style={{ flex: 1 }}>
                  Edit
                </button>
                <button className="bus-assistant-btn bus-assistant-btn-danger" onClick={() => handleOpenDeleteConfirm(assistant)} style={{ flex: 1 }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="bus-assistants-modal-overlay">
          <div className="bus-assistants-modal">
            <div className="bus-assistants-modal-header">
              <h2>{modalMode === 'add' ? 'Add New Bus Assistant' : 'Edit Bus Assistant'}</h2>
              <button className="bus-assistants-modal-close" onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="bus-assistants-modal-body">
                {error && <div className="bus-assistants-error" style={{ marginBottom: '1rem', padding: '0.5rem' }}>{error}</div>}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="bus-assistants-form-group">
                    <label>First Name</label>
                    <input type="text" name="firstName" className="bus-assistants-form-input" value={formData.firstName} onChange={handleInputChange} required />
                  </div>
                  <div className="bus-assistants-form-group">
                    <label>Last Name</label>
                    <input type="text" name="lastName" className="bus-assistants-form-input" value={formData.lastName} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="bus-assistants-form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" className="bus-assistants-form-input" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="bus-assistants-form-group">
                  <label>Phone Number</label>
                  <input type="text" name="phoneNumber" className="bus-assistants-form-input" value={formData.phoneNumber} onChange={handleInputChange} required />
                </div>
                <div className="bus-assistants-form-group">
                  <label>Route Number (Optional)</label>
                  <input type="text" name="routeNumber" className="bus-assistants-form-input" value={formData.routeNumber} onChange={handleInputChange} />
                </div>
                
                {modalMode === 'add' && (
                  <div className="bus-assistants-form-group">
                    <label>Temporary Password</label>
                    <input type="password" name="password" className="bus-assistants-form-input" value={formData.password} onChange={handleInputChange} required minLength={6} />
                  </div>
                )}
              </div>
              <div className="bus-assistants-modal-footer">
                <button type="button" className="bus-assistant-btn bus-assistant-btn-secondary" onClick={handleCloseModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="bus-assistant-btn bus-assistant-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Add Bus Assistant' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="bus-assistants-modal-overlay">
          <div className="bus-assistants-modal" style={{ maxWidth: '400px' }}>
            <div className="bus-assistants-modal-header">
              <h2>Confirm Deletion</h2>
              <button className="bus-assistants-modal-close" onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="bus-assistants-modal-body">
              {error && <div className="bus-assistants-error" style={{ marginBottom: '1rem', padding: '0.5rem' }}>{error}</div>}
              <p style={{ margin: 0 }}>Are you sure you want to delete the bus assistant <strong>{selectedAssistant?.firstName} {selectedAssistant?.lastName}</strong>? This action cannot be undone.</p>
            </div>
            <div className="bus-assistants-modal-footer">
              <button type="button" className="bus-assistant-btn bus-assistant-btn-secondary" onClick={handleCloseModal} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="button" className="bus-assistant-btn bus-assistant-btn-danger" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BusAssistants
