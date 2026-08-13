import { useState, useEffect } from 'react';
import axios from 'axios';
import './FinancialReports.css';

interface FuelCosts {
  total_fuel_cost: number;
  avg_fuel_cost: number;
  total_requests: number;
}

interface MaintenanceCosts {
  total_maintenance_cost: number;
  avg_maintenance_cost: number;
  total_requests: number;
}

interface VehicleCost {
  plate_number: string;
  fuel_cost: number;
  maintenance_cost: number;
  total_cost: number;
}

const FinancialReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fuelCosts, setFuelCosts] = useState<FuelCosts | null>(null);
  const [maintenanceCosts, setMaintenanceCosts] = useState<MaintenanceCosts | null>(null);
  const [costsByVehicle, setCostsByVehicle] = useState<VehicleCost[]>([]);

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('soho_auth_token');
      const params: any = {};
      
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axios.get('/api/transport-manager/reports/financial', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      
      setFuelCosts(response.data.data.fuelCosts);
      setMaintenanceCosts(response.data.data.maintenanceCosts);
      setCostsByVehicle(response.data.data.costsByVehicle || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch financial reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Fuel Costs', '', '', ''],
      ['Total Fuel Cost', fuelCosts?.total_fuel_cost || 0],
      ['Average Fuel Cost', fuelCosts?.avg_fuel_cost || 0],
      ['Total Requests', fuelCosts?.total_requests || 0],
      ['', '', '', ''],
      ['Maintenance Costs', '', '', ''],
      ['Total Maintenance Cost', maintenanceCosts?.total_maintenance_cost || 0],
      ['Average Maintenance Cost', maintenanceCosts?.avg_maintenance_cost || 0],
      ['Total Requests', maintenanceCosts?.total_requests || 0],
      ['', '', '', ''],
      ['Costs by Vehicle', '', '', ''],
      ['Vehicle', 'Fuel Cost', 'Maintenance Cost', 'Total Cost'],
      ...costsByVehicle.map(v => [v.plate_number, v.fuel_cost, v.maintenance_cost, v.total_cost]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount || 0);
  };

  if (loading) return <div className="loading">Loading financial reports...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="financial-reports">
      <div className="header">
        <h2>Financial Reports</h2>
        <div className="date-filters">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="date-input"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="date-input"
          />
          <button className="btn-export" onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card fuel">
          <h3>Fuel Costs</h3>
          <div className="stat-row">
            <span>Total Fuel Cost</span>
            <strong>{formatCurrency(fuelCosts?.total_fuel_cost || 0)}</strong>
          </div>
          <div className="stat-row">
            <span>Average Fuel Cost</span>
            <strong>{formatCurrency(fuelCosts?.avg_fuel_cost || 0)}</strong>
          </div>
          <div className="stat-row">
            <span>Total Requests</span>
            <strong>{fuelCosts?.total_requests || 0}</strong>
          </div>
        </div>

        <div className="stat-card maintenance">
          <h3>Maintenance Costs</h3>
          <div className="stat-row">
            <span>Total Maintenance Cost</span>
            <strong>{formatCurrency(maintenanceCosts?.total_maintenance_cost || 0)}</strong>
          </div>
          <div className="stat-row">
            <span>Average Maintenance Cost</span>
            <strong>{formatCurrency(maintenanceCosts?.avg_maintenance_cost || 0)}</strong>
          </div>
          <div className="stat-row">
            <span>Total Requests</span>
            <strong>{maintenanceCosts?.total_requests || 0}</strong>
          </div>
        </div>

        <div className="stat-card total">
          <h3>Total Costs</h3>
          <div className="stat-row">
            <span>Total Expenses</span>
            <strong>{formatCurrency((fuelCosts?.total_fuel_cost || 0) + (maintenanceCosts?.total_maintenance_cost || 0))}</strong>
          </div>
          <div className="stat-row">
            <span>Total Requests</span>
            <strong>{(fuelCosts?.total_requests || 0) + (maintenanceCosts?.total_requests || 0)}</strong>
          </div>
        </div>
      </div>

      <div className="vehicle-costs">
        <h3>Costs by Vehicle</h3>
        {costsByVehicle.length === 0 ? (
          <div className="no-data">No vehicle cost data available</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Fuel Cost</th>
                <th>Maintenance Cost</th>
                <th>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {costsByVehicle.map((vehicle, idx) => (
                <tr key={idx}>
                  <td>{vehicle.plate_number}</td>
                  <td>{formatCurrency(vehicle.fuel_cost)}</td>
                  <td>{formatCurrency(vehicle.maintenance_cost)}</td>
                  <td><strong>{formatCurrency(vehicle.total_cost)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FinancialReports;
