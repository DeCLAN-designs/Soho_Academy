import { useState, useEffect } from 'react';
import axios from 'axios';
import './ComplianceReports.css';

interface DocumentStatus {
  document_type: string;
  total: number;
  valid: number;
  expiring: number;
  expired: number;
}

interface ExpiringDocument {
  id: number;
  document_type: string;
  number_plate: string;
  expiry_date: string;
  firstName: string;
  lastName: string;
}

interface ComplianceAudit {
  domain: string;
  entityType: string;
  action: string;
  count: number;
  last_occurrence: string;
}

const ComplianceReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<ExpiringDocument[]>([]);
  const [complianceAudits, setComplianceAudits] = useState<ComplianceAudit[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('soho_auth_token');

      const response = await axios.get('/api/transport-manager/reports/compliance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setDocumentStatus(response.data.data.documentStatus || []);
      setExpiringSoon(response.data.data.expiringSoon || []);
      setComplianceAudits(response.data.data.complianceAudits || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch compliance reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Document Status', '', '', '', ''],
      ['Document Type', 'Total', 'Valid', 'Expiring', 'Expired'],
      ...documentStatus.map(d => [d.document_type, d.total, d.valid, d.expiring, d.expired]),
      ['', '', '', '', ''],
      ['Expiring Soon (Within 30 Days)', '', '', '', ''],
      ['Document Type', 'Vehicle', 'Expiry Date', 'Uploaded By'],
      ...expiringSoon.map(d => [
        d.document_type,
        d.number_plate,
        d.expiry_date,
        `${d.firstName} ${d.lastName}`
      ]),
      ['', '', '', '', ''],
      ['Compliance Audit Logs', '', '', '', ''],
      ['Domain', 'Entity Type', 'Action', 'Count', 'Last Occurrence'],
      ...complianceAudits.map(a => [a.domain, a.entityType, a.action, a.count, a.last_occurrence]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) return <div className="loading">Loading compliance reports...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="compliance-reports">
      <div className="header">
        <h2>Compliance Reports</h2>
        <button className="btn-export" onClick={handleExport}>
          Export CSV
        </button>
      </div>

      <div className="document-status">
        <h3>Document Status</h3>
        {documentStatus.length === 0 ? (
          <div className="no-data">No document status data available</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Total</th>
                <th>Valid</th>
                <th>Expiring</th>
                <th>Expired</th>
                <th>Compliance Rate</th>
              </tr>
            </thead>
            <tbody>
              {documentStatus.map((doc, idx) => {
                const complianceRate = doc.total > 0 ? ((doc.valid / doc.total) * 100).toFixed(1) : '0';
                return (
                  <tr key={idx}>
                    <td>{doc.document_type}</td>
                    <td><strong>{doc.total}</strong></td>
                    <td className="success">{doc.valid}</td>
                    <td className="warning">{doc.expiring}</td>
                    <td className="danger">{doc.expired}</td>
                    <td>
                      <span className={`compliance-rate ${parseFloat(complianceRate) >= 90 ? 'high' : parseFloat(complianceRate) >= 70 ? 'medium' : 'low'}`}>
                        {complianceRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="expiring-soon">
        <h3>Documents Expiring Soon (Within 30 Days)</h3>
        {expiringSoon.length === 0 ? (
          <div className="no-data">No documents expiring soon</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Vehicle</th>
                <th>Expiry Date</th>
                <th>Days Until Expiry</th>
                <th>Uploaded By</th>
              </tr>
            </thead>
            <tbody>
              {expiringSoon.map((doc, idx) => {
                const daysUntil = getDaysUntilExpiry(doc.expiry_date);
                return (
                  <tr key={idx}>
                    <td>{doc.document_type}</td>
                    <td>{doc.number_plate}</td>
                    <td>{new Date(doc.expiry_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`days-badge ${daysUntil <= 7 ? 'critical' : daysUntil <= 14 ? 'warning' : 'info'}`}>
                        {daysUntil} days
                      </span>
                    </td>
                    <td>{doc.firstName} {doc.lastName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="compliance-audits">
        <h3>Compliance Audit Logs</h3>
        {complianceAudits.length === 0 ? (
          <div className="no-data">No compliance audit data available</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Entity Type</th>
                <th>Action</th>
                <th>Count</th>
                <th>Last Occurrence</th>
              </tr>
            </thead>
            <tbody>
              {complianceAudits.map((audit, idx) => (
                <tr key={idx}>
                  <td>{audit.domain}</td>
                  <td>{audit.entityType}</td>
                  <td>{audit.action}</td>
                  <td><strong>{audit.count}</strong></td>
                  <td>{new Date(audit.last_occurrence).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ComplianceReports;
