import { useState, useMemo } from 'react';
import { useFuelManagement } from '../FuelManagement/FuelManagementContext';
import './FuelLogsTab.css';

const FuelLogsTab = () => {
  const { logs, vehicleDetails, loading, createLog, numberPlates } = useFuelManagement();
  const [logSearch, setLogSearch] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    numberPlate: '',
    date: new Date().toISOString().split('T')[0],
    litresFilled: '',
    costPerLitre: '180',
    odometerBefore: '',
    odometerAfter: '',
    description: '',
  });
  const [logErrors, setLogErrors] = useState<Record<string, string>>({});

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

  const filteredLogs = useMemo(() => {
    const q = logSearch.toLowerCase();
    let filtered = logs.filter(l => {
      const matchQ =
        !q ||
        l.numberPlate.toLowerCase().includes(q) ||
        l.requestedBy.toLowerCase().includes(q);
      return matchQ;
    });
    
    filtered = filtered.map(l => ({
      ...l,
      vehicleModel: vehicleDetails.find(v => v.plate_number === l.numberPlate)?.model || 'Unknown',
    }));
    
    return filtered;
  }, [logs, logSearch, vehicleDetails]);

  const validateLogForm = () => {
    const e: Record<string, string> = {};
    if (!logForm.numberPlate) e.numberPlate = 'Required';
    if (!logForm.date) e.date = 'Required';
    if (!logForm.litresFilled || Number(logForm.litresFilled) <= 0) e.litresFilled = 'Enter valid litres';
    if (!logForm.costPerLitre || Number(logForm.costPerLitre) <= 0) e.costPerLitre = 'Enter valid rate';
    setLogErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitLog = async () => {
    if (!validateLogForm()) return;
    
    try {
      await createLog({
        requestDate: logForm.date,
        numberPlate: logForm.numberPlate,
        currentMileage: Number(logForm.odometerAfter),
        requestType: 'Fuel',
        category: 'Fuels & Oils',
        amount: Number(logForm.litresFilled) * Number(logForm.costPerLitre),
        litresFilled: Number(logForm.litresFilled),
        costPerLitre: Number(logForm.costPerLitre),
        odometerBefore: Number(logForm.odometerBefore),
        odometerAfter: Number(logForm.odometerAfter),
        status: 'Completed',
        requestedBy: 'Fuel Manager',
      });
      setLogForm({
        numberPlate: '',
        date: new Date().toISOString().split('T')[0],
        litresFilled: '',
        costPerLitre: '180',
        odometerBefore: '',
        odometerAfter: '',
        description: '',
      });
      setShowLogModal(false);
    } catch (err) {
      console.error('Error creating log:', err);
      setLogErrors({ description: 'Failed to create log entry. Please try again.' });
    }
  };

  const patchLog = (field: keyof typeof logForm) => (val: string) => {
    setLogForm(p => ({ ...p, [field]: val }));
    if (logErrors[field]) setLogErrors(p => {
      const newErrors = { ...p };
      delete newErrors[field];
      return newErrors;
    });
  };

  return (
    <div className="fuel-logs-container">
      <div className="fuel-search-bar">
        <div className="fuel-search-input-wrapper">
          <input 
            className="fuel-search-input"
            placeholder="Search plate, requested by…" 
            value={logSearch} 
            onChange={e => setLogSearch(e.target.value)} 
          />
        </div>
        <button 
          className="fuel-primary-button"
          onClick={() => setShowLogModal(true)}
        >
          + Log Fuel Fill
        </button>
      </div>

      <div className="fuel-table-container">
        <table className="fuel-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Driver/Requester</th>
              <th>Litres</th>
              <th>Rate (KES/L)</th>
              <th>Total Cost</th>
              <th>Odometer</th>
              <th>Consumption</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="fuel-loading">Loading...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={9} className="fuel-empty-state">No records found.</td>
              </tr>
            ) : (
              filteredLogs.map(l => {
                const distance = l.odometerAfter - l.odometerBefore;
                const consumption = distance > 0 ? ((l.litresFilled / distance) * 100).toFixed(1) : null;
                return (
                  <tr key={l.id}>
                    <td>{fmtDate(l.requestDate)}</td>
                    <td>
                      <div>{l.numberPlate}</div>
                      {l.vehicleModel && <small>{l.vehicleModel}</small>}
                    </td>
                    <td>{l.requestedBy}</td>
                    <td>{fmt(l.litresFilled)} L</td>
                    <td>KES {fmt(l.costPerLitre)}</td>
                    <td>{fmtCost(l.amount)}</td>
                    <td>{distance > 0 ? `${fmt(l.odometerBefore)} → ${fmt(l.odometerAfter)} km` : '—'}</td>
                    <td>{consumption ? `${consumption} L/100km` : '—'}</td>
                    <td>
                      <span className="fuel-status-badge fuel-status-completed">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showLogModal && (
        <div className="fuel-modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="fuel-modal" onClick={e => e.stopPropagation()}>
            <div className="fuel-modal-header">
              <div>
                <h2 className="fuel-modal-title">Log Fuel Fill</h2>
                <p className="fuel-modal-subtitle">Record a completed fuel fill-up</p>
              </div>
              <button className="fuel-modal-close" onClick={() => setShowLogModal(false)}>&times;</button>
            </div>
            <div className="fuel-modal-body">
              <div className="fuel-form-grid">
                <div className="fuel-form-group">
                  <label className="fuel-form-label">Vehicle *</label>
                  <select 
                    className="fuel-form-select"
                    value={logForm.numberPlate} 
                    onChange={e => patchLog('numberPlate')(e.target.value)}
                  >
                    <option value="">Select Vehicle</option>
                    {numberPlates.filter(p => p.status === 'active').map(p => (
                      <option key={p.id} value={p.plate_number}>{p.plate_number}</option>
                    ))}
                  </select>
                  {logErrors.numberPlate && <small className="fuel-form-error">{logErrors.numberPlate}</small>}
                </div>
                <div className="fuel-form-group">
                  <label className="fuel-form-label">Date *</label>
                  <input 
                    type="date"
                    className="fuel-form-input"
                    value={logForm.date} 
                    onChange={e => patchLog('date')(e.target.value)}
                  />
                  {logErrors.date && <small className="fuel-form-error">{logErrors.date}</small>}
                </div>
                <div className="fuel-form-group">
                  <label className="fuel-form-label">Litres Filled *</label>
                  <input 
                    type="number"
                    className="fuel-form-input"
                    value={logForm.litresFilled} 
                    onChange={e => patchLog('litresFilled')(e.target.value)}
                    placeholder="e.g. 80"
                  />
                  {logErrors.litresFilled && <small className="fuel-form-error">{logErrors.litresFilled}</small>}
                </div>
                <div className="fuel-form-group">
                  <label className="fuel-form-label">Cost per Litre (KES) *</label>
                  <input 
                    type="number"
                    className="fuel-form-input"
                    value={logForm.costPerLitre} 
                    onChange={e => patchLog('costPerLitre')(e.target.value)}
                    placeholder="180"
                  />
                  {logErrors.costPerLitre && <small className="fuel-form-error">{logErrors.costPerLitre}</small>}
                </div>
                <div className="fuel-form-group">
                  <label className="fuel-form-label">Odometer Before (km)</label>
                  <input 
                    type="number"
                    className="fuel-form-input"
                    value={logForm.odometerBefore} 
                    onChange={e => patchLog('odometerBefore')(e.target.value)}
                    placeholder="e.g. 44890"
                  />
                </div>
                <div className="fuel-form-group">
                  <label className="fuel-form-label">Odometer After (km)</label>
                  <input 
                    type="number"
                    className="fuel-form-input"
                    value={logForm.odometerAfter} 
                    onChange={e => patchLog('odometerAfter')(e.target.value)}
                    placeholder="e.g. 45230"
                  />
                </div>
              </div>
              <div className="fuel-form-group">
                <label className="fuel-form-label">Additional Notes (Optional)</label>
                <textarea 
                  className="fuel-form-textarea"
                  placeholder="Any additional notes about this fill-up..." 
                  value={logForm.description} 
                  onChange={e => patchLog('description')(e.target.value)}
                />
              </div>
              {logForm.litresFilled && logForm.costPerLitre && (
                <div className="fuel-form-hint">
                  Total cost: <strong>{fmtCost(Number(logForm.litresFilled) * Number(logForm.costPerLitre))}</strong>
                  {logForm.odometerBefore && logForm.odometerAfter && Number(logForm.odometerAfter) > Number(logForm.odometerBefore) && (
                    <>
                      <br />
                      Consumption: <strong>
                        {((Number(logForm.litresFilled) / (Number(logForm.odometerAfter) - Number(logForm.odometerBefore))) * 100).toFixed(1)} L/100km
                      </strong>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="fuel-modal-footer">
              <button className="fuel-secondary-button" onClick={() => setShowLogModal(false)}>Cancel</button>
              <button className="fuel-primary-button" onClick={submitLog}>Save Log Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelLogsTab;
