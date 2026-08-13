import { useState, useEffect } from 'react';
import axios from 'axios';
import './Violations.css';

interface Violation {
  id: number;
  type: string;
  description: string;
  reported_by_user_id: number | null;
  reporter_first_name: string | null;
  reporter_last_name: string | null;
  reported_date: string;
  status: 'Pending' | 'Under Review' | 'Resolved' | 'Dismissed';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  action_taken: string | null;
  action_date: string | null;
  action_taker_first_name: string | null;
  action_taker_last_name: string | null;
  assigned_to_user_id: number | null;
  assigned_first_name: string | null;
  assigned_last_name: string | null;
  created_at: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

const Violations = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Under Review' | 'Resolved' | 'Dismissed'>('All');
  const [filterSeverity, setFilterSeverity] = useState<'All' | 'Low' | 'Medium' | 'High' | 'Critical'>('All');
  const [showModal, setShowModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const [actionViolation, setActionViolation] = useState<Violation | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    reportedDate: '',
    severity: 'Medium' as const,
    assignedToUserId: '',
  });
  const [actionFormData, setActionFormData] = useState({
    status: 'Resolved' as const,
    actionTaken: '',
    actionDate: '',
  });

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterSeverity]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('soho_auth_token');
      
      const params: any = {};
      if (filterStatus !== 'All') params.status = filterStatus;
      if (filterSeverity !== 'All') params.severity = filterSeverity;
      
      const [violationsRes, usersRes] = await Promise.all([
        axios.get('/api/transport-manager/violations', {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }),
        axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      setViolations(violationsRes.data.data.violations || []);
      setUsers(usersRes.data.data.users || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch violations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingViolation(null);
    setFormData({
      type: '',
      description: '',
      reportedDate: new Date().toISOString().split('T')[0],
      severity: 'Medium',
      assignedToUserId: '',
    });
    setShowModal(true);
  };

  const handleEdit = (violation: Violation) => {
    setEditingViolation(violation);
    setFormData({
      type: violation.type,
      description: violation.description,
      reportedDate: violation.reported_date,
      severity: violation.severity,
      assignedToUserId: violation.assigned_to_user_id?.toString() || '',
    });
    setShowModal(true);
  };

  const handleAction = (violation: Violation) => {
    setActionViolation(violation);
    setActionFormData({
      status: violation.status,
      actionTaken: violation.action_taken || '',
      actionDate: violation.action_date || new Date().toISOString().split('T')[0],
    });
    setShowActionModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this violation?')) return;
    
    try {
      const token = localStorage.getItem('soho_auth_token');
      await axios.delete(`/api/transport-manager/violations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete violation');
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('soho_auth_token');
      const payload = {
        type: formData.type,
        description: formData.description,
        reportedDate: formData.reportedDate,
        severity: formData.severity,
        assignedToUserId: formData.assignedToUserId ? parseInt(formData.assignedToUserId) : null,
      };

      if (editingViolation) {
        await axios.patch(`/api/transport-manager/violations/${editingViolation.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/api/transport-manager/violations', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save violation');
    }
  };

  const handleActionSubmit = async () => {
    if (!actionViolation) return;
    
    try {
      const token = localStorage.getItem('soho_auth_token');
      const payload = {
        status: actionFormData.status,
        actionTaken: actionFormData.actionTaken,
        actionDate: actionFormData.actionDate,
      };

      await axios.patch(`/api/transport-manager/violations/${actionViolation.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setShowActionModal(false);
      setActionViolation(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update violation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return '#f59e0b';
      case 'Under Review': return '#3b82f6';
      case 'Resolved': return '#10b981';
      case 'Dismissed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return '#dc2626';
      case 'High': return '#f97316';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (loading) return <div className="loading">Loading violations...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="violations">
      <div className="header">
        <h2>Violations</h2>
        <div className="actions">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="filter-select"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Dismissed">Dismissed</option>
          </select>
          <select 
            value={filterSeverity} 
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="filter-select"
          >
            <option value="All">All Severity</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <button className="btn-add" onClick={handleCreate}>
            Add Violation
          </button>
        </div>
      </div>

      <div className="violations-grid">
        {violations.length === 0 ? (
          <div className="no-data">No violations found</div>
        ) : (
          violations.map((violation) => (
            <div key={violation.id} className="violation-card">
              <div className="violation-header">
                <span className="violation-type">{violation.type}</span>
                <div className="badges">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(violation.status) }}
                  >
                    {violation.status}
                  </span>
                  <span 
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(violation.severity) }}
                  >
                    {violation.severity}
                  </span>
                </div>
              </div>
              <div className="violation-body">
                <p className="description">{violation.description}</p>
                <div className="violation-details">
                  <span><strong>Reported:</strong> {new Date(violation.reported_date).toLocaleDateString()}</span>
                  {violation.reporter_first_name && (
                    <span><strong>By:</strong> {violation.reporter_first_name} {violation.reporter_last_name}</span>
                  )}
                  {violation.assigned_first_name && (
                    <span><strong>Assigned to:</strong> {violation.assigned_first_name} {violation.assigned_last_name}</span>
                  )}
                </div>
                {violation.action_taken && (
                  <div className="action-taken">
                    <strong>Action Taken:</strong>
                    <p>{violation.action_taken}</p>
                    {violation.action_date && (
                      <span><strong>Date:</strong> {new Date(violation.action_date).toLocaleDateString()}</span>
                    )}
                    {violation.action_taker_first_name && (
                      <span><strong>By:</strong> {violation.action_taker_first_name} {violation.action_taker_last_name}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="violation-actions">
                <button className="btn-edit" onClick={() => handleEdit(violation)}>Edit</button>
                <button className="btn-action" onClick={() => handleAction(violation)}>Take Action</button>
                <button className="btn-delete" onClick={() => handleDelete(violation.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingViolation ? 'Edit Violation' : 'Add Violation'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Type *</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Reported Date *</label>
                  <input
                    type="date"
                    value={formData.reportedDate}
                    onChange={(e) => setFormData({ ...formData, reportedDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Assign To</label>
                <select
                  value={formData.assignedToUserId}
                  onChange={(e) => setFormData({ ...formData, assignedToUserId: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {users.filter(u => u.role === 'Transport Manager' || u.role === 'School Admin').map(user => (
                    <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-confirm" onClick={handleSubmit}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showActionModal && actionViolation && (
        <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Take Action on Violation</h3>
              <button className="close-btn" onClick={() => setShowActionModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="violation-summary">
                <p><strong>Type:</strong> {actionViolation.type}</p>
                <p><strong>Description:</strong> {actionViolation.description}</p>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={actionFormData.status}
                  onChange={(e) => setActionFormData({ ...actionFormData, status: e.target.value as any })}
                >
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Action Taken</label>
                <textarea
                  value={actionFormData.actionTaken}
                  onChange={(e) => setActionFormData({ ...actionFormData, actionTaken: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Action Date</label>
                <input
                  type="date"
                  value={actionFormData.actionDate}
                  onChange={(e) => setActionFormData({ ...actionFormData, actionDate: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowActionModal(false)}>Cancel</button>
                <button className="btn-confirm" onClick={handleActionSubmit}>Save Action</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Violations;
