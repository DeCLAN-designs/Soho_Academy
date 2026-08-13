import { useState, useMemo } from 'react';
import { useFuelManagement, type FuelRequest } from '../FuelManagement/FuelManagementContext';
import './FuelRequestsTab.css';

const FuelRequestsTab = () => {
  const { requests, vehicleDetails, loading, approveRequest, rejectRequest } = useFuelManagement();
  const [reqSearch, setReqSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'Completed'>('All');
  const [selectedRequest, setSelectedRequest] = useState<FuelRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fmtCost = (n: number): string => {
    if (!n && n !== 0) return 'KES 0';
    return `KES ${n.toLocaleString('en-KE')}`;
  };

  const fmtDate = (d: string): string => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'Invalid date';
    }
  };

  const filteredRequests = useMemo(() => {
    const q = reqSearch.toLowerCase();
    let filtered = requests.filter(r => {
      const matchQ =
        !q ||
        r.numberPlate.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q) ||
        r.id.toString().includes(q);
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchQ && matchStatus;
    });
    
    filtered = filtered.map(r => ({
      ...r,
      vehicleModel: vehicleDetails.find(v => v.plate_number === r.numberPlate)?.model || 'Unknown',
    }));
    
    return filtered;
  }, [requests, reqSearch, statusFilter, vehicleDetails]);

  const handleApprove = async (req: FuelRequest) => {
    try {
      await approveRequest(req);
    } catch (err) {
      console.error('Error approving request:', err);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await rejectRequest(selectedRequest, rejectReason);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  const openRejectModal = (req: FuelRequest) => {
    setSelectedRequest(req);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedRequest(null);
    setRejectReason('');
  };

  return (
    <div className="fuel-requests-container">
      <div className="fuel-search-bar">
        <div className="fuel-search-input-wrapper">
          <input 
            className="fuel-search-input"
            placeholder="Search plate, requested by, ID…" 
            value={reqSearch} 
            onChange={e => setReqSearch(e.target.value)} 
          />
        </div>
        <select 
          className="fuel-filter-select"
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value as any)}
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <div className="fuel-table-container">
        <table className="fuel-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Vehicle</th>
              <th>Requested By</th>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="fuel-loading">Loading...</td>
              </tr>
            ) : filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={9} className="fuel-empty-state">No records found.</td>
              </tr>
            ) : (
              filteredRequests.map(r => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>
                    <div>{r.numberPlate}</div>
                    {r.vehicleModel && <small>{r.vehicleModel}</small>}
                  </td>
                  <td>{r.requestedBy}</td>
                  <td>{fmtDate(r.requestDate)}</td>
                  <td>{r.requestType}</td>
                  <td>{r.category}</td>
                  <td>{r.amount ? fmtCost(r.amount) : '—'}</td>
                  <td>
                    <span className={`fuel-status-badge fuel-status-${r.status.toLowerCase()}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.status === 'Pending' && (
                      <div className="fuel-action-buttons">
                        <button 
                          className="fuel-danger-button-small"
                          onClick={() => openRejectModal(r)}
                        >
                          Reject
                        </button>
                        <button 
                          className="fuel-success-button-small"
                          onClick={() => handleApprove(r)}
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showRejectModal && selectedRequest && (
        <div className="fuel-modal-overlay" onClick={closeRejectModal}>
          <div className="fuel-modal fuel-modal-small" onClick={e => e.stopPropagation()}>
            <div className="fuel-modal-header">
              <div>
                <h2 className="fuel-modal-title">Reject Request</h2>
                <p className="fuel-modal-subtitle">Request #{selectedRequest.id} — {selectedRequest.numberPlate}</p>
              </div>
              <button className="fuel-modal-close" onClick={closeRejectModal}>&times;</button>
            </div>
            <div className="fuel-modal-body">
              <label className="fuel-form-label">Reason for Rejection</label>
              <textarea 
                className="fuel-form-textarea"
                placeholder="Explain why this request is being rejected…" 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)} 
              />
            </div>
            <div className="fuel-modal-footer">
              <button className="fuel-secondary-button" onClick={closeRejectModal}>Cancel</button>
              <button className="fuel-danger-button" onClick={handleReject}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelRequestsTab;
