import { useState, useEffect } from 'react';
import axios from 'axios';
import './IncidentReports.css';

interface IncidentReport {
  id: number;
  incidentType: string;
  description: string;
  location: string;
  date: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Closed';
  createdBy: string;
  photos: string[];
  vehiclePlate?: string;
}

const IncidentReports = () => {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Resolved' | 'Closed'>('All');
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('soho_auth_token');
      const response = await axios.get('/api/incidents/all/reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(response.data.data.reports || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch incident reports');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedReport || !newStatus) return;

    try {
      const token = localStorage.getItem('soho_auth_token');
      await axios.patch(
        `/api/incidents/reports/${selectedReport.id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowStatusModal(false);
      setSelectedReport(null);
      setNewStatus('');
      fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const filteredReports = filter === 'All' 
    ? reports 
    : reports.filter(r => r.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return '#f59e0b';
      case 'In Progress': return '#3b82f6';
      case 'Resolved': return '#10b981';
      case 'Closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) return <div className="loading">Loading incident reports...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="incident-reports">
      <div className="header">
        <h2>Incident Reports</h2>
        <div className="filters">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="reports-grid">
        {filteredReports.length === 0 ? (
          <div className="no-data">No incident reports found</div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="report-card">
              <div className="report-header">
                <span className="incident-type">{report.incidentType}</span>
                <span 
                  className="status-badge" 
                  style={{ backgroundColor: getStatusColor(report.status) }}
                >
                  {report.status}
                </span>
              </div>
              <div className="report-body">
                <p className="description">{report.description}</p>
                <div className="report-details">
                  <span className="detail">
                    <strong>Location:</strong> {report.location}
                  </span>
                  <span className="detail">
                    <strong>Date:</strong> {new Date(report.date).toLocaleDateString()}
                  </span>
                  {report.vehiclePlate && (
                    <span className="detail">
                      <strong>Vehicle:</strong> {report.vehiclePlate}
                    </span>
                  )}
                  <span className="detail">
                    <strong>Reported by:</strong> {report.createdBy}
                  </span>
                </div>
                {report.photos && report.photos.length > 0 && (
                  <div className="photos">
                    <strong>Photos:</strong> {report.photos.length} attached
                  </div>
                )}
              </div>
              <div className="report-actions">
                <button 
                  className="btn-view"
                  onClick={() => setSelectedReport(report)}
                >
                  View Details
                </button>
                <button 
                  className="btn-update"
                  onClick={() => {
                    setSelectedReport(report);
                    setNewStatus(report.status);
                    setShowStatusModal(true);
                  }}
                >
                  Update Status
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedReport && !showStatusModal && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Incident Report Details</h3>
              <button className="close-btn" onClick={() => setSelectedReport(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <label>Incident Type:</label>
                <span>{selectedReport.incidentType}</span>
              </div>
              <div className="detail-row">
                <label>Status:</label>
                <span style={{ color: getStatusColor(selectedReport.status) }}>
                  {selectedReport.status}
                </span>
              </div>
              <div className="detail-row">
                <label>Description:</label>
                <span>{selectedReport.description}</span>
              </div>
              <div className="detail-row">
                <label>Location:</label>
                <span>{selectedReport.location}</span>
              </div>
              <div className="detail-row">
                <label>Date:</label>
                <span>{new Date(selectedReport.date).toLocaleString()}</span>
              </div>
              {selectedReport.vehiclePlate && (
                <div className="detail-row">
                  <label>Vehicle:</label>
                  <span>{selectedReport.vehiclePlate}</span>
                </div>
              )}
              <div className="detail-row">
                <label>Reported by:</label>
                <span>{selectedReport.createdBy}</span>
              </div>
              {selectedReport.photos && selectedReport.photos.length > 0 && (
                <div className="photos-section">
                  <label>Attached Photos:</label>
                  <div className="photo-grid">
                    {selectedReport.photos.map((photo, idx) => (
                      <img key={idx} src={photo} alt={`Incident photo ${idx + 1}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showStatusModal && selectedReport && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Incident Status</h3>
              <button className="close-btn" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <label>Current Status:</label>
                <span>{selectedReport.status}</span>
              </div>
              <div className="form-group">
                <label>New Status:</label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowStatusModal(false)}>
                  Cancel
                </button>
                <button className="btn-confirm" onClick={handleStatusUpdate}>
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentReports;
