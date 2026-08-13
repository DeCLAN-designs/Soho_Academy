import { useMemo } from 'react';
import { useFuelManagement } from '../FuelManagement/FuelManagementContext';
import './DashboardTab.css';

const DashboardTab = () => {
  const { requests, logs, numberPlates, loading, anomalies } = useFuelManagement();

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

  const pendingRequests = requests.filter(r => r.status === 'Pending');

  const analytics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const approvedFuelRequests = requests.filter(r => 
      r.requestType === 'Fuel' && r.status === 'Approved'
    );
    
    const currentMonthRequests = approvedFuelRequests.filter(r => {
      const date = new Date(r.requestDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const totalCostMonth = currentMonthRequests.reduce((s, r) => s + (r.amount || 0), 0);
    const totalCostAll = approvedFuelRequests.reduce((s, r) => s + (r.amount || 0), 0);
    
    const totalLitresMonth = currentMonthRequests.reduce((s, r) => {
      if (r.litresFilled) return s + r.litresFilled;
      return s + ((r.amount || 0) / 180);
    }, 0);
    
    const totalLitresAll = approvedFuelRequests.reduce((s, r) => {
      if (r.litresFilled) return s + r.litresFilled;
      return s + ((r.amount || 0) / 180);
    }, 0);

    const vehicleCosts: Record<string, number> = {};
    approvedFuelRequests.forEach(r => {
      vehicleCosts[r.numberPlate] = (vehicleCosts[r.numberPlate] || 0) + (r.amount || 0);
    });
    
    const topVehicle = Object.entries(vehicleCosts).sort((a, b) => b[1] - a[1])[0];

    const perVehicle = Object.entries(vehicleCosts).map(([plate, cost]) => ({
      plate,
      cost,
      pct: totalCostAll > 0 ? Math.round((cost / totalCostAll) * 100) : 0,
    })).sort((a, b) => b.cost - a.cost);

    const monthlyData: { month: string; cost: number; litres: number }[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const monthName = months[d.getMonth()];
      const monthYear = d.getFullYear();
      
      const monthRequests = approvedFuelRequests.filter(r => {
        const date = new Date(r.requestDate);
        return date.getMonth() === d.getMonth() && date.getFullYear() === monthYear;
      });
      
      const monthCost = monthRequests.reduce((s, r) => s + (r.amount || 0), 0);
      const monthLitres = monthRequests.reduce((s, r) => {
        if (r.litresFilled) return s + r.litresFilled;
        return s + ((r.amount || 0) / 180);
      }, 0);
      
      monthlyData.push({ month: monthName, cost: monthCost, litres: monthLitres });
    }

    return {
      totalCostMonth,
      totalLitresMonth,
      totalCostAll,
      totalLitresAll,
      topVehicle: topVehicle ? topVehicle[0] : '—',
      topVehicleCost: topVehicle ? topVehicle[1] : 0,
      perVehicle,
      monthlyData,
    };
  }, [requests]);

  const recentLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()).slice(0, 5);
  }, [logs]);

  const recentAnomalies = useMemo(() => {
    const severityOrder = { High: 0, Medium: 1, Low: 2 };
    return [...anomalies].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 3);
  }, [anomalies]);

  return (
    <div className="fuel-dashboard">
      <div className="fuel-stats-grid">
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Total Fuel Spend</small>
          <div className="fuel-stat-value">{fmtCost(analytics.totalCostAll)}</div>
          <small className="fuel-stat-sub">All time</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">This Month</small>
          <div className="fuel-stat-value">{fmtCost(analytics.totalCostMonth)}</div>
          <small className="fuel-stat-sub">{fmt(Math.round(analytics.totalLitresMonth))} litres</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Pending Approvals</small>
          <div className="fuel-stat-value">{pendingRequests.length}</div>
          <small className="fuel-stat-sub">Requests waiting</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Active Vehicles</small>
          <div className="fuel-stat-value">{numberPlates.filter(p => p.status === 'active').length}</div>
          <small className="fuel-stat-sub">In fleet</small>
        </div>
      </div>

      <div className="fuel-dashboard-card">
        <div className="fuel-dashboard-card-header">
          <div>
            <h3>📊 Fuel Consumption Trends</h3>
            <p>Monthly fuel expenditure trend over the last 6 months</p>
          </div>
        </div>
        <div className="fuel-chart-container fuel-dashboard-chart">
          {analytics.monthlyData.map((m, idx) => {
            const maxCost = Math.max(...analytics.monthlyData.map(d => d.cost), 1);
            const barHeight = Math.max(30, Math.min(200, (m.cost / maxCost) * 150));
            return (
              <div key={idx} className="fuel-chart-bar-wrapper">
                <div className="fuel-chart-bar-value">{fmtCost(m.cost)}</div>
                <div className="fuel-chart-bar" style={{ height: `${barHeight}px` }} />
                <div className="fuel-chart-label">{m.month}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fuel-dashboard-two-column">
        <div className="fuel-dashboard-card">
          <div className="fuel-dashboard-card-header">
            <div>
              <h3>⛽ Recent Refueling Logs</h3>
              <p>Latest fuel fill-ups across the fleet</p>
            </div>
          </div>
          <div className="fuel-dashboard-logs">
            {loading ? (
              <div className="fuel-loading">Loading logs...</div>
            ) : recentLogs.length === 0 ? (
              <div className="fuel-empty-state-small">No refueling logs found</div>
            ) : (
              <table className="fuel-dashboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Litres</th>
                    <th>Cost</th>
                    <th>Consumption</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map(log => {
                    const distance = log.odometerAfter - log.odometerBefore;
                    const consumption = distance > 0 ? ((log.litresFilled / distance) * 100).toFixed(1) : '—';
                    return (
                      <tr key={log.id}>
                        <td>{fmtDate(log.requestDate)}</td>
                        <td>
                          <strong>{log.numberPlate}</strong>
                          {log.vehicleModel && <small>{log.vehicleModel}</small>}
                        </td>
                        <td>{fmt(log.litresFilled)} L</td>
                        <td>{fmtCost(log.amount)}</td>
                        <td>{consumption !== '—' ? `${consumption} L/100km` : '—'}</td>
                       </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="fuel-dashboard-card">
          <div className="fuel-dashboard-card-header">
            <div>
              <h3>⚠️ Fuel Variance Alerts</h3>
              <p>Vehicles with unusual consumption patterns</p>
            </div>
          </div>
          <div className="fuel-dashboard-alerts">
            {loading ? (
              <div className="fuel-loading">Analyzing data...</div>
            ) : recentAnomalies.length === 0 ? (
              <div className="fuel-empty-state-small">
                <span className="fuel-empty-icon-small">✓</span>
                <p>No anomalies detected</p>
              </div>
            ) : (
              recentAnomalies.map(anomaly => (
                <div key={anomaly.id} className={`fuel-alert-item fuel-alert-${anomaly.severity.toLowerCase()}`}>
                  <div className="fuel-alert-header">
                    <span className={`fuel-severity-badge fuel-severity-${anomaly.severity.toLowerCase()}`}>
                      {anomaly.severity}
                    </span>
                    <span className="fuel-alert-date">{fmtDate(anomaly.date)}</span>
                  </div>
                  <div className="fuel-alert-vehicle">
                    <strong>{anomaly.vehiclePlate}</strong>
                    <span>{anomaly.vehicleModel}</span>
                  </div>
                  <div className="fuel-alert-stats">
                    <span>Expected: {anomaly.expectedLitresPer100km} L/100km</span>
                    <span className="fuel-alert-actual">Actual: {anomaly.actualLitresPer100km} L/100km</span>
                    <span className="fuel-alert-variance">+{anomaly.variancePercent}% variance</span>
                  </div>
                  <div className="fuel-alert-flag">
                    <span>🚨</span> {anomaly.flag}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
