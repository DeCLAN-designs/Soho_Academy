import { useMemo } from 'react';
import { useFuelManagement } from '../FuelManagement/FuelManagementContext';
import './AnalyticsTab.css';

const AnalyticsTab = () => {
  const { requests, loading } = useFuelManagement();

  const fmt = (n: number): string => {
    if (!n && n !== 0) return '0';
    return n.toLocaleString('en-KE');
  };

  const fmtCost = (n: number): string => {
    if (!n && n !== 0) return 'KES 0';
    return `KES ${n.toLocaleString('en-KE')}`;
  };

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

  const pendingRequests = requests.filter(r => r.status === 'Pending');

  if (loading) {
    return <div className="fuel-loading">Loading analytics...</div>;
  }

  return (
    <div className="fuel-analytics-container">
      <div className="fuel-stats-grid">
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Total Spend — This Month</small>
          <div className="fuel-stat-value">{fmtCost(analytics.totalCostMonth)}</div>
          <small className="fuel-stat-sub">{fmt(Math.round(analytics.totalLitresMonth))} litres consumed</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Total Spend — All Time</small>
          <div className="fuel-stat-value">{fmtCost(analytics.totalCostAll)}</div>
          <small className="fuel-stat-sub">{fmt(Math.round(analytics.totalLitresAll))} litres total</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Top Consuming Vehicle</small>
          <div className="fuel-stat-value">{analytics.topVehicle}</div>
          <small className="fuel-stat-sub">{fmtCost(analytics.topVehicleCost)} spent</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Total Requests</small>
          <div className="fuel-stat-value">{requests.length}</div>
          <small className="fuel-stat-sub">{pendingRequests.length} pending approval</small>
        </div>
      </div>

      <div className="fuel-analytics-section">
        <h3>Fuel Cost by Vehicle</h3>
        <p>Breakdown of total fuel expenditure per vehicle</p>
        <div className="fuel-progress-list">
          {analytics.perVehicle.slice(0, 5).map(v => (
            <div key={v.plate} className="fuel-progress-item">
              <span className="fuel-progress-label">{v.plate}</span>
              <div className="fuel-progress-bar-container">
                <div className="fuel-progress-bar" style={{ width: `${v.pct}%` }} />
              </div>
              <span className="fuel-progress-cost">{fmtCost(v.cost)}</span>
              <span className="fuel-progress-percent">{v.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fuel-analytics-section">
        <h3>Monthly Fuel Cost Trend</h3>
        <p>Last 6 months fuel expenditure</p>
        <div className="fuel-chart-container">
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
    </div>
  );
};

export default AnalyticsTab;
