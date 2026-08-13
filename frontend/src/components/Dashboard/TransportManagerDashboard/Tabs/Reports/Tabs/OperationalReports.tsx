import { useState, useEffect } from 'react';
import axios from 'axios';
import './OperationalReports.css';

interface TripStats {
  total_trips: number;
  completed_trips: number;
  cancelled_trips: number;
  in_progress_trips: number;
}

interface AttendanceStats {
  total_records: number;
  boarded: number;
  alighted: number;
  not_boarded: number;
}

interface RoutePerformance {
  route_name: string;
  trip_count: number;
  avg_trip_duration_minutes: number | null;
}

const OperationalReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tripStats, setTripStats] = useState<TripStats | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [routePerformance, setRoutePerformance] = useState<RoutePerformance[]>([]);

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

      const response = await axios.get('/api/transport-manager/reports/operational', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      
      setTripStats(response.data.data.tripStats);
      setAttendanceStats(response.data.data.attendanceStats);
      setRoutePerformance(response.data.data.routePerformance || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch operational reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Trip Statistics', '', '', ''],
      ['Total Trips', tripStats?.total_trips || 0],
      ['Completed', tripStats?.completed_trips || 0],
      ['Cancelled', tripStats?.cancelled_trips || 0],
      ['In Progress', tripStats?.in_progress_trips || 0],
      ['', '', '', ''],
      ['Attendance Statistics', '', '', ''],
      ['Total Records', attendanceStats?.total_records || 0],
      ['Boarded', attendanceStats?.boarded || 0],
      ['Alighted', attendanceStats?.alighted || 0],
      ['Not Boarded', attendanceStats?.not_boarded || 0],
      ['', '', '', ''],
      ['Route Performance', '', '', ''],
      ['Route', 'Trips', 'Avg Duration (min)'],
      ...routePerformance.map(r => [r.route_name, r.trip_count, r.avg_trip_duration_minutes || 'N/A']),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operational-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="loading">Loading operational reports...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="operational-reports">
      <div className="header">
        <h2>Operational Reports</h2>
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
        <div className="stat-card">
          <h3>Trip Statistics</h3>
          <div className="stat-row">
            <span>Total Trips</span>
            <strong>{tripStats?.total_trips || 0}</strong>
          </div>
          <div className="stat-row">
            <span>Completed</span>
            <strong className="success">{tripStats?.completed_trips || 0}</strong>
          </div>
          <div className="stat-row">
            <span>Cancelled</span>
            <strong className="warning">{tripStats?.cancelled_trips || 0}</strong>
          </div>
          <div className="stat-row">
            <span>In Progress</span>
            <strong className="info">{tripStats?.in_progress_trips || 0}</strong>
          </div>
        </div>

        <div className="stat-card">
          <h3>Attendance Statistics</h3>
          <div className="stat-row">
            <span>Total Records</span>
            <strong>{attendanceStats?.total_records || 0}</strong>
          </div>
          <div className="stat-row">
            <span>Boarded</span>
            <strong className="success">{attendanceStats?.boarded || 0}</strong>
          </div>
          <div className="stat-row">
            <span>Alighted</span>
            <strong className="success">{attendanceStats?.alighted || 0}</strong>
          </div>
          <div className="stat-row">
            <span>Not Boarded</span>
            <strong className="danger">{attendanceStats?.not_boarded || 0}</strong>
          </div>
        </div>
      </div>

      <div className="route-performance">
        <h3>Route Performance</h3>
        {routePerformance.length === 0 ? (
          <div className="no-data">No route performance data available</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Trips</th>
                <th>Avg Duration (min)</th>
              </tr>
            </thead>
            <tbody>
              {routePerformance.map((route, idx) => (
                <tr key={idx}>
                  <td>{route.route_name}</td>
                  <td>{route.trip_count}</td>
                  <td>{route.avg_trip_duration_minutes ? route.avg_trip_duration_minutes.toFixed(1) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default OperationalReports;
