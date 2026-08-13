import { useFuelManagement } from '../FuelManagement/FuelManagementContext';
import './MileageAnomaliesTab.css';

const MileageAnomaliesTab = () => {
  const { anomalies, loading } = useFuelManagement();

  const fmtDate = (d: string): string => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return <div className="fuel-loading">Analyzing data...</div>;
  }

  return (
    <div className="fuel-anomalies-container">
      <div className="fuel-anomalies-header">
        <div>
          <h3>Mileage Anomalies</h3>
          <p>Vehicles where fuel consumption deviates significantly from expected fleet average</p>
        </div>
        <div className="fuel-anomaly-stats-badges">
          <span className="fuel-anomaly-badge-high">
            {anomalies.filter(a => a.severity === 'High').length} High
          </span>
          <span className="fuel-anomaly-badge-medium">
            {anomalies.filter(a => a.severity === 'Medium').length} Medium
          </span>
          <span className="fuel-anomaly-badge-low">
            {anomalies.filter(a => a.severity === 'Low').length} Low
          </span>
        </div>
      </div>

      {anomalies.length === 0 ? (
        <div className="fuel-empty-state">
          <p className="fuel-empty-icon">✓</p>
          <p className="fuel-empty-title">No anomalies detected</p>
          <p className="fuel-empty-description">All vehicles are operating within expected fuel consumption ranges.</p>
        </div>
      ) : (
        <div className="fuel-anomalies-list">
          {anomalies.map(a => (
            <div key={a.id} className={`fuel-anomaly-card fuel-anomaly-${a.severity.toLowerCase()}`}>
              <div className="fuel-anomaly-header">
                <div>
                  <div className="fuel-anomaly-vehicle">{a.vehiclePlate}</div>
                  <div className="fuel-anomaly-meta">{a.vehicleModel} · {a.driverName}</div>
                </div>
                <div className="fuel-anomaly-severity-wrapper">
                  <span className={`fuel-anomaly-severity fuel-severity-${a.severity.toLowerCase()}`}>
                    {a.severity} Risk
                  </span>
                  <div className="fuel-anomaly-date">{fmtDate(a.date)}</div>
                </div>
              </div>

              <div className="fuel-anomaly-stats">
                <div className="fuel-anomaly-stat">
                  <small>Expected</small>
                  <div>{a.expectedLitresPer100km} L/100km</div>
                </div>
                <div className="fuel-anomaly-stat">
                  <small>Actual</small>
                  <div className="fuel-anomaly-stat-value highlight">{a.actualLitresPer100km} L/100km</div>
                </div>
                <div className="fuel-anomaly-stat">
                  <small>Variance</small>
                  <div className="fuel-anomaly-stat-value highlight">+{a.variancePercent}%</div>
                </div>
              </div>

              <div className="fuel-anomaly-flag">
                <span>⚠️</span> {a.flag}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MileageAnomaliesTab;
