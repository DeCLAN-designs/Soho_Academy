import { useEffect, useState } from 'react';
import axios from 'axios';
import "./Assignments.css";

type StudentOption = {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  grade: string;
  stream: string;
};

type RouteOption = {
  id: number;
  route_id: string;
  route_name: string;
};

type StopOption = {
  id: number;
  stop_id: string;
  stop_name: string;
  route_id: number; // This is the route's ID (foreign key to routes.id)
};

type AssignmentRecord = {
  id: number;
  studentId: number;
  studentName: string;
  admissionNumber: string;
  grade: string;
  stream: string;
  routeId: number;
  routeName: string;
  stopId: number;
  stopName: string;
  tripType: 'Morning' | 'Evening' | 'Both';
  status: 'Active' | 'Inactive' | 'Temporary';
  effectiveFrom: string;
  effectiveTo: string | null;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('soho_auth_token');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

const extractArray = <T,>(payload: unknown, key?: string): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  const response = payload as { data?: unknown; [key: string]: unknown } | undefined;
  if (Array.isArray(response?.data)) return response.data as T[];
  if (key && response?.data && typeof response.data === 'object') {
    const nested = response.data as Record<string, unknown>;
    if (Array.isArray(nested[key])) return nested[key] as T[];
  }
  return [];
};

const Assignments = () => {
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [stops, setStops] = useState<StopOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [form, setForm] = useState({
    studentId: '',
    routeId: '',
    stopId: '',
    tripType: 'Both' as 'Morning' | 'Evening' | 'Both',
    status: 'Active' as 'Active' | 'Inactive' | 'Temporary',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, studentsRes, routesRes, stopsRes] = await Promise.all([
        axiosInstance.get('/student-assignments'),
        axiosInstance.get('/students'),
        axiosInstance.get('/routes'),
        axiosInstance.get('/stops'),
      ]);

      const nextAssignments = extractArray<AssignmentRecord>(assignmentsRes.data, 'assignments');
      const nextStudents = extractArray<StudentOption>(studentsRes.data, 'students');
      const nextRoutes = extractArray<RouteOption>(routesRes.data, 'routes');
      const nextStops = extractArray<StopOption>(stopsRes.data, 'stops');

      setAssignments(nextAssignments);
      setStudents(nextStudents);
      setRoutes(nextRoutes);
      setStops(nextStops);
    } catch (error) {
      console.error(error);
      setMessageType('error');
      setMessage('Unable to load assignments right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await axiosInstance.post('/student-assignments', {
        studentId: Number(form.studentId),
        routeId: Number(form.routeId),
        stopId: Number(form.stopId),
        tripType: form.tripType,
        status: form.status,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
      });
      setMessageType('success');
      setMessage('Assignment created successfully.');
      setForm({
        studentId: '',
        routeId: '',
        stopId: '',
        tripType: 'Both',
        status: 'Active',
        effectiveFrom: new Date().toISOString().slice(0, 10),
        effectiveTo: '',
      });
      await loadData();
    } catch (error) {
      console.error(error);
      setMessageType('error');
      setMessage('Failed to create the assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (assignmentId: number) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    
    try {
      await axiosInstance.delete(`/student-assignments/${assignmentId}`);
      setMessageType('success');
      setMessage('Assignment removed successfully.');
      await loadData();
    } catch (error) {
      console.error(error);
      setMessageType('error');
      setMessage('Failed to remove the assignment.');
    }
  };

  // Get stops for selected route (using route.id for comparison)
  const getStopsForRoute = () => {
    if (!form.routeId) return [];
    return stops.filter(stop => stop.route_id === Number(form.routeId));
  };

  return (
    <div className="assignments-container">
      <div className="assignments-header">
        <h2 className="assignments-title">Student Assignments</h2>
        <p className="assignments-description">Create and manage student-to-route assignments.</p>
      </div>

      {message && (
        <div className={`assignments-message assignments-message--${messageType}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleCreate} className="assignments-form">
        <div className="assignments-form-grid">
          <div className="assignments-form-field">
            <label className="assignments-form-label">
              Student
              <select 
                className="assignments-form-select"
                value={form.studentId} 
                onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))} 
                required
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.admissionNumber} · {student.firstName} {student.lastName} ({student.grade} {student.stream})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="assignments-form-field">
            <label className="assignments-form-label">
              Route
              <select 
                className="assignments-form-select"
                value={form.routeId} 
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, routeId: event.target.value, stopId: '' }));
                }} 
                required
              >
                <option value="">Select route</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.route_id} · {route.route_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="assignments-form-field">
            <label className="assignments-form-label">
              Stop
              <select 
                className="assignments-form-select"
                value={form.stopId} 
                onChange={(event) => setForm((prev) => ({ ...prev, stopId: event.target.value }))} 
                required
                disabled={!form.routeId}
              >
                <option value="">Select stop</option>
                {getStopsForRoute().map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.stop_id} · {stop.stop_name}
                  </option>
                ))}
              </select>
            </label>
            {!form.routeId && (
              <span className="assignments-form-hint">Please select a route first</span>
            )}
          </div>

          <div className="assignments-form-field">
            <label className="assignments-form-label">
              Trip Type
              <select 
                className="assignments-form-select"
                value={form.tripType} 
                onChange={(event) => setForm((prev) => ({ ...prev, tripType: event.target.value as 'Morning' | 'Evening' | 'Both' }))}
              >
                <option value="Both">Both (Morning & Evening)</option>
                <option value="Morning">Morning Only</option>
                <option value="Evening">Evening Only</option>
              </select>
            </label>
          </div>

          <div className="assignments-form-field">
            <label className="assignments-form-label">
              Status
              <select 
                className="assignments-form-select"
                value={form.status} 
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as 'Active' | 'Inactive' | 'Temporary' }))}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Temporary">Temporary</option>
              </select>
            </label>
          </div>

          <div className="assignments-form-field">
            <label className="assignments-form-label">
              Effective From
              <input 
                type="date" 
                className="assignments-form-input"
                value={form.effectiveFrom} 
                onChange={(event) => setForm((prev) => ({ ...prev, effectiveFrom: event.target.value }))} 
                required 
              />
            </label>
          </div>

          <div className="assignments-form-field">
            <label className="assignments-form-label">
              Effective To (Optional)
              <input 
                type="date" 
                className="assignments-form-input"
                value={form.effectiveTo} 
                onChange={(event) => setForm((prev) => ({ ...prev, effectiveTo: event.target.value }))} 
              />
            </label>
          </div>
        </div>

        <button 
          type="submit" 
          className="assignments-submit-btn"
          disabled={submitting || loading}
        >
          {submitting ? 'Creating Assignment...' : 'Create Assignment'}
        </button>
      </form>

      <div className="assignments-table-container">
        {loading && assignments.length === 0 ? (
          <div className="assignments-loading">Loading assignments...</div>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Route / Stop</th>
                <th>Trip Type</th>
                <th>Status</th>
                <th>Effective Period</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="assignments-table-cell">
                    <div className="assignments-student-info">
                      <span className="assignments-student-name">{assignment.studentName}</span>
                      <span className="assignments-table-sub">
                        {assignment.admissionNumber} · {assignment.grade} {assignment.stream}
                      </span>
                    </div>
                  </td>
                  <td className="assignments-table-cell">
                    <div className="assignments-route-info">
                      <span className="assignments-route-name">{assignment.routeName}</span>
                      <span className="assignments-table-sub">{assignment.stopName}</span>
                    </div>
                  </td>
                  <td className="assignments-table-cell">
                    <span className={`assignments-trip-badge assignments-trip-badge--${assignment.tripType.toLowerCase()}`}>
                      {assignment.tripType}
                    </span>
                  </td>
                  <td className="assignments-table-cell">
                    <span className={`assignments-status-badge assignments-status-badge--${assignment.status.toLowerCase()}`}>
                      {assignment.status}
                    </span>
                  </td>
                  <td className="assignments-table-cell">
                    <div className="assignments-effective-dates">
                      <span>From: {new Date(assignment.effectiveFrom).toLocaleDateString('en-KE')}</span>
                      {assignment.effectiveTo && (
                        <span>To: {new Date(assignment.effectiveTo).toLocaleDateString('en-KE')}</span>
                      )}
                    </div>
                  </td>
                  <td className="assignments-table-cell">
                    <button 
                      type="button" 
                      className="assignments-delete-btn"
                      onClick={() => void handleDelete(assignment.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && assignments.length === 0 && (
          <div className="assignments-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>No assignments yet</p>
            <p className="assignments-empty-sub">Create your first assignment using the form above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assignments;