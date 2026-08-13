import { useState } from 'react';
import { useFuelManagement, type FuelRequest } from '../FuelManagement/FuelManagementContext';
import './FuelApprovalsTab.css';

const FuelApprovalsTab = () => {
  const { requests, vehicleDetails, loading, approveRequest, rejectRequest } = useFuelManagement();
  const [selectedRequest, setSelectedRequest] = useState<FuelRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const pendingRequests = requests.filter(r => r.status === 'Pending');

  const fmt = (n: number): string => {
    if (!n && n !== 0) return '0';
    return n.toLocaleString('en-KE');
  };

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
    <div className="fuel-approvals-container">
      <div className="fuel-approvals-header">
        <div>
          <h3>Pending Fuel Requests</h3>
          <p>Review and approve or reject outstanding fuel requests</p>
        </div>
        <span className="fuel-pending-badge">
          {pendingRequests.length} Pending
        </span>
      </div>

      {loading ? (
        <div className="fuel-loading">Loading pending requests...</div>
      ) : pendingRequests.length === 0 ? (
        <div className="fuel-empty-state">
          <p className="fuel-empty-icon">✓</p>
          <p className="fuel-empty-title">All caught up</p>
          <p className="fuel-empty-description">No pending fuel requests at the moment.</p>
        </div>
      ) : (
        <div className="fuel-approvals-list">
          {pendingRequests.map(r => {
            const vehicleModel = vehicleDetails.find(v => v.plate_number === r.numberPlate)?.model || 'Unknown';
            return (
              <div key={r.id} className="fuel-approval-card">
                <div className="fuel-approval-header">
                  <div>
                    <div className="fuel-approval-title">
                      <span>#{r.id}</span>
                      <span className="fuel-approval-date">{fmtDate(r.requestDate)}</span>
                    </div>
                    <div className="fuel-approval-vehicle">
                      <span>{r.numberPlate}</span>
                      <span className="fuel-approval-vehicle-model">{vehicleModel}</span>
                    </div>
                  </div>
                  <div className="fuel-approval-amount">
                    <div>{r.amount ? fmtCost(r.amount) : 'Variable'}</div>
                    <div>{r.requestType}</div>
                  </div>
                </div>

                <div className="fuel-approval-details">
                  <div><small>Requested By</small><div>{r.requestedBy}</div></div>
                  <div><small>Current Mileage</small><div>{fmt(r.currentMileage)} km</div></div>
                  <div><small>Category</small><div>{r.category}</div></div>
                  <div><small>Description</small><div>{r.description}</div></div>
                </div>

                <div className="fuel-approval-actions">
                  <button 
                    className="fuel-danger-button"
                    onClick={() => openRejectModal(r)}
                  >
                    Reject
                  </button>
                  <button 
                    className="fuel-success-button"
                    onClick={() => handleApprove(r)}
                  >
                    Approve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

export default FuelApprovalsTab;
