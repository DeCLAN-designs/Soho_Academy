import { useState, useEffect } from 'react';
import axios from 'axios';
import './SafetyAudits.css';

interface SafetyAudit {
  id: number;
  title: string;
  description: string | null;
  scheduled_date: string;
  conducted_date: string | null;
  auditor_id: number | null;
  auditor_first_name: string | null;
  auditor_last_name: string | null;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  findings: string | null;
  recommendations: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  created_at: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

const SafetyAudits = () => {
  const [audits, setAudits] = useState<SafetyAudit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'All' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled'>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingAudit, setEditingAudit] = useState<SafetyAudit | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    conductedDate: '',
    auditorId: '',
    status: 'Scheduled' as const,
    findings: '',
    recommendations: '',
    priority: 'Medium' as const,
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('soho_auth_token');
      
      const [auditsRes, usersRes] = await Promise.all([
        axios.get('/api/transport-manager/safety-audits', {
          headers: { Authorization: `Bearer ${token}` },
          params: filter !== 'All' ? { status: filter } : {},
        }),
        axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      setAudits(auditsRes.data.data.audits || []);
      setUsers(usersRes.data.data.users || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch safety audits');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAudit(null);
    setFormData({
      title: '',
      description: '',
      scheduledDate: '',
      conductedDate: '',
      auditorId: '',
      status: 'Scheduled',
      findings: '',
      recommendations: '',
      priority: 'Medium',
    });
    setShowModal(true);
  };

  const handleEdit = (audit: SafetyAudit) => {
    setEditingAudit(audit);
    setFormData({
      title: audit.title,
      description: audit.description || '',
      scheduledDate: audit.scheduled_date,
      conductedDate: audit.conducted_date || '',
      auditorId: audit.auditor_id?.toString() || '',
      status: audit.status,
      findings: audit.findings || '',
      recommendations: audit.recommendations || '',
      priority: audit.priority,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this safety audit?')) return;
    
    try {
      const token = localStorage.getItem('soho_auth_token');
      await axios.delete(`/api/transport-manager/safety-audits/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete safety audit');
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('soho_auth_token');
      const payload = {
        title: formData.title,
        description: formData.description,
        scheduledDate: formData.scheduledDate,
        conductedDate: formData.conductedDate || null,
        auditorId: formData.auditorId ? parseInt(formData.auditorId) : null,
        status: formData.status,
        findings: formData.findings,
        recommendations: formData.recommendations,
        priority: formData.priority,
      };

      if (editingAudit) {
        await axios.patch(`/api/transport-manager/safety-audits/${editingAudit.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/api/transport-manager/safety-audits', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save safety audit');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return '#3b82f6';
      case 'In Progress': return '#f59e0b';
      case 'Completed': return '#10b981';
      case 'Cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return '#dc2626';
      case 'High': return '#f97316';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (loading) return <div className="loading">Loading safety audits...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="safety-audits">
      <div className="header">
        <h2>Safety Audits</h2>
        <div className="actions">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="All">All Status</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button className="btn-add" onClick={handleCreate}>
            Add Audit
          </button>
        </div>
      </div>

      <div className="audits-grid">
        {audits.length === 0 ? (
          <div className="no-data">No safety audits found</div>
        ) : (
          audits.map((audit) => (
            <div key={audit.id} className="audit-card">
              <div className="audit-header">
                <span className="audit-title">{audit.title}</span>
                <div className="badges">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(audit.status) }}
                  >
                    {audit.status}
                  </span>
                  <span 
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(audit.priority) }}
                  >
                    {audit.priority}
                  </span>
                </div>
              </div>
              <div className="audit-body">
                {audit.description && <p className="description">{audit.description}</p>}
                <div className="audit-details">
                  <span><strong>Scheduled:</strong> {new Date(audit.scheduled_date).toLocaleDateString()}</span>
                  {audit.conducted_date && (
                    <span><strong>Conducted:</strong> {new Date(audit.conducted_date).toLocaleDateString()}</span>
                  )}
                  {audit.auditor_first_name && (
                    <span><strong>Auditor:</strong> {audit.auditor_first_name} {audit.auditor_last_name}</span>
                  )}
                </div>
                {audit.findings && (
                  <div className="findings">
                    <strong>Findings:</strong>
                    <p>{audit.findings}</p>
                  </div>
                )}
                {audit.recommendations && (
                  <div className="recommendations">
                    <strong>Recommendations:</strong>
                    <p>{audit.recommendations}</p>
                  </div>
                )}
              </div>
              <div className="audit-actions">
                <button className="btn-edit" onClick={() => handleEdit(audit)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(audit.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAudit ? 'Edit Safety Audit' : 'Add Safety Audit'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Scheduled Date *</label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Conducted Date</label>
                  <input
                    type="date"
                    value={formData.conductedDate}
                    onChange={(e) => setFormData({ ...formData, conductedDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Auditor</label>
                  <select
                    value={formData.auditorId}
                    onChange={(e) => setFormData({ ...formData, auditorId: e.target.value })}
                  >
                    <option value="">Select Auditor</option>
                    {users.filter(u => u.role === 'Transport Manager' || u.role === 'School Admin').map(user => (
                      <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Findings</label>
                <textarea
                  value={formData.findings}
                  onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Recommendations</label>
                <textarea
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-confirm" onClick={handleSubmit}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyAudits;
