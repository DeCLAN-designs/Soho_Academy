import { useState, useEffect } from 'react';
import axios from 'axios';
import './AuditLogsTab.css';

interface AuditLog {
  id: number;
  actorUserId: number | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  domain: string;
  entityType: string;
  entityId: number;
  action: string;
  actionDetails: string | null;
  previousStateJson: string | null;
  newStateJson: string | null;
  changesSummary: string | null;
  severity: string;
  complianceRelevant: boolean;
  createdAt: string;
}

const AuditLogsTab = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [filters, setFilters] = useState({
    userId: '',
    domain: '',
    entityType: '',
    action: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [page, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('soho_auth_token');
      const params: any = { page, pageSize: 50 };
      
      if (filters.userId) params.userId = filters.userId;
      if (filters.domain) params.domain = filters.domain;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.action) params.action = filters.action;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await axios.get('/api/transport-manager/logs', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      
      setLogs(response.data.data.logs || []);
      setTotalPages(response.data.data.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const formatJson = (jsonString: string | null) => {
    if (!jsonString) return 'N/A';
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  if (loading) return <div className="loading">Loading audit logs...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="audit-logs">
      <div className="header">
        <h2>Audit Logs</h2>
        <div className="filters">
          <input
            type="text"
            name="userId"
            placeholder="User ID"
            value={filters.userId}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <input
            type="text"
            name="domain"
            placeholder="Domain"
            value={filters.domain}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <input
            type="text"
            name="entityType"
            placeholder="Entity Type"
            value={filters.entityType}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <input
            type="text"
            name="action"
            placeholder="Action"
            value={filters.action}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="filter-input"
          />
          <button className="btn-clear" onClick={() => {
            setFilters({ userId: '', domain: '', entityType: '', action: '', startDate: '', endDate: '' });
            setPage(1);
          }}>
            Clear Filters
          </button>
        </div>
      </div>

      <div className="logs-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Actor</th>
              <th>Domain</th>
              <th>Entity</th>
              <th>Action</th>
              <th>Severity</th>
              <th>Compliance</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">No audit logs found</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>
                    {log.firstName && log.lastName 
                      ? `${log.firstName} ${log.lastName}`
                      : log.email || 'System'
                    }
                  </td>
                  <td>{log.domain}</td>
                  <td>{log.entityType} #{log.entityId}</td>
                  <td>{log.action}</td>
                  <td>
                    <span 
                      className="severity-badge"
                      style={{ backgroundColor: getSeverityColor(log.severity) }}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td>
                    {log.complianceRelevant ? (
                      <span className="compliance-badge">Yes</span>
                    ) : (
                      <span className="compliance-badge no">No</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {logs.length > 0 && (
        <div className="pagination">
          <button 
            className="btn-page"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button 
            className="btn-page"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      {logs.length > 0 && (
        <div className="logs-details">
          <h3>Log Details</h3>
          {logs.map((log) => (
            <div key={log.id} className="log-detail-card">
              <div className="detail-header">
                <h4>Log #{log.id}</h4>
                <span className="timestamp">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
              <div className="detail-body">
                <div className="detail-row">
                  <label>Actor:</label>
                  <span>{log.firstName && log.lastName ? `${log.firstName} ${log.lastName}` : log.email || 'System'}</span>
                </div>
                <div className="detail-row">
                  <label>Domain:</label>
                  <span>{log.domain}</span>
                </div>
                <div className="detail-row">
                  <label>Entity:</label>
                  <span>{log.entityType} #{log.entityId}</span>
                </div>
                <div className="detail-row">
                  <label>Action:</label>
                  <span>{log.action}</span>
                </div>
                {log.actionDetails && (
                  <div className="detail-row">
                    <label>Details:</label>
                    <span>{log.actionDetails}</span>
                  </div>
                )}
                {log.changesSummary && (
                  <div className="detail-row">
                    <label>Changes:</label>
                    <span>{log.changesSummary}</span>
                  </div>
                )}
                {log.previousStateJson && (
                  <div className="detail-row json-view">
                    <label>Previous State:</label>
                    <pre>{formatJson(log.previousStateJson)}</pre>
                  </div>
                )}
                {log.newStateJson && (
                  <div className="detail-row json-view">
                    <label>New State:</label>
                    <pre>{formatJson(log.newStateJson)}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogsTab;
