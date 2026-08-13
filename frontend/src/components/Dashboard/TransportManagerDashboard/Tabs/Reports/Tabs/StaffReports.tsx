import { useState, useEffect } from 'react';
import axios from 'axios';
import './StaffReports.css';

interface StaffStat {
  role: string;
  total_staff: number;
  active_staff: number;
  inactive_staff: number;
}

interface StaffAttendance {
  firstName: string;
  lastName: string;
  role: string;
  total_days: number;
  days_present: number;
  attendance_rate: number;
}

interface StaffIncident {
  firstName: string;
  lastName: string;
  role: string;
  incident_count: number;
}

const StaffReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [staffStats, setStaffStats] = useState<StaffStat[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendance[]>([]);
  const [staffIncidents, setStaffIncidents] = useState<StaffIncident[]>([]);

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

      const response = await axios.get('/api/transport-manager/reports/staff', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      
      setStaffStats(response.data.data.staffStats || []);
      setStaffAttendance(response.data.data.staffAttendance || []);
      setStaffIncidents(response.data.data.staffIncidents || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch staff reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Staff Statistics', '', '', ''],
      ['Role', 'Total', 'Active', 'Inactive'],
      ...staffStats.map(s => [s.role, s.total_staff, s.active_staff, s.inactive_staff]),
      ['', '', '', ''],
      ['Staff Attendance', '', '', ''],
      ['Name', 'Role', 'Total Days', 'Days Present', 'Attendance Rate %'],
      ...staffAttendance.map(s => [
        `${s.firstName} ${s.lastName}`,
        s.role,
        s.total_days,
        s.days_present,
        s.attendance_rate
      ]),
      ['', '', '', ''],
      ['Staff Incidents', '', '', ''],
      ['Name', 'Role', 'Incident Count'],
      ...staffIncidents.map(s => [
        `${s.firstName} ${s.lastName}`,
        s.role,
        s.incident_count
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="loading">Loading staff reports...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="staff-reports">
      <div className="header">
        <h2>Staff Reports</h2>
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

      <div className="staff-stats">
        <h3>Staff Statistics</h3>
        {staffStats.length === 0 ? (
          <div className="no-data">No staff statistics available</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Total Staff</th>
                <th>Active</th>
                <th>Inactive</th>
              </tr>
            </thead>
            <tbody>
              {staffStats.map((stat, idx) => (
                <tr key={idx}>
                  <td>{stat.role}</td>
                  <td><strong>{stat.total_staff}</strong></td>
                  <td className="success">{stat.active_staff}</td>
                  <td className="warning">{stat.inactive_staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="staff-attendance">
        <h3>Staff Attendance</h3>
        {staffAttendance.length === 0 ? (
          <div className="no-data">No attendance data available</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Total Days</th>
                <th>Days Present</th>
                <th>Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              {staffAttendance.map((staff, idx) => (
                <tr key={idx}>
                  <td>{staff.firstName} {staff.lastName}</td>
                  <td>{staff.role}</td>
                  <td>{staff.total_days}</td>
                  <td>{staff.days_present}</td>
                  <td>
                    <span className={`rate-badge ${staff.attendance_rate >= 90 ? 'high' : staff.attendance_rate >= 70 ? 'medium' : 'low'}`}>
                      {staff.attendance_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="staff-incidents">
        <h3>Staff Incidents</h3>
        {staffIncidents.length === 0 ? (
          <div className="no-data">No incident data available</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Incident Count</th>
              </tr>
            </thead>
            <tbody>
              {staffIncidents.map((staff, idx) => (
                <tr key={idx}>
                  <td>{staff.firstName} {staff.lastName}</td>
                  <td>{staff.role}</td>
                  <td>
                    <span className={`incident-badge ${staff.incident_count > 5 ? 'high' : staff.incident_count > 2 ? 'medium' : 'low'}`}>
                      {staff.incident_count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StaffReports;
