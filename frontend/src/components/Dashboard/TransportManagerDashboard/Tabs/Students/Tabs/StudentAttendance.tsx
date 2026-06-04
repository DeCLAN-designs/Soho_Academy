
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import './StudentAttendance.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name: string;
  admission_number: string;
  grade: string;
  stream: string;
  stop_name: string;
  stop_id: number;
  trip_id: number;
  trip_type: 'Morning' | 'Evening';
  boarding_status: 'Boarded' | 'Absent' | 'Missed Pickup' | 'Parent Pickup';
  dropoff_status: 'Dropped Off' | 'Not Dropped' | 'Parent Pickup' | 'Pending';
  boarded_at: string | null;
  dropped_off_at: string | null;
  confirmed_by: string | null;
  notes: string | null;
  attendance_date: string;
}

interface TripOption {
  id: number;
  trip_id: string;
  route_id: string;
  route_name: string;
  vehicle_plate: string;
  driver_name: string;
  assistant_name: string;
  departure_time: string;
  status: 'On Time' | 'Delayed' | 'Completed' | 'Not Started' | 'Overdue';
  trip_type: 'Morning' | 'Evening';
  stops_completed: number;
  total_stops: number;
}

interface AttendanceSummary {
  total: number;
  boarded: number;
  absent: number;
  missed_pickup: number;
  parent_pickup: number;
  dropped_off: number;
  pending_dropoff: number;
}

interface UpdatePayload {
  boarding_status?: AttendanceRecord['boarding_status'];
  dropoff_status?: AttendanceRecord['dropoff_status'];
  notes?: string;
}

interface RoleSection {
  heading: string;
  description: string;
  cards?: string[];
}

interface Props {
  section: RoleSection;
}

type ApiError = { response?: { status?: number; data?: { message?: string } } };
const isApiError = (err: unknown): err is ApiError =>
  typeof err === 'object' && err !== null;

// ─── API Setup ────────────────────────────────────────────────────────────────

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('soho_auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      ['soho_auth_token', 'soho_user_role', 'soho_user_number_plate',
        'soho_user_first_name', 'soho_user_last_name',
        'soho_user_profile_photo_url'].forEach(k => localStorage.removeItem(k));
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const normalizeListResponse = <T,>(payload: unknown, key?: string): T[] => {
  if (Array.isArray(payload)) return payload as T[];

  const response = payload as { data?: unknown; [key: string]: unknown } | undefined;
  if (Array.isArray(response?.data)) return response.data as T[];
  if (key && response?.data && typeof response.data === 'object' && Array.isArray((response.data as Record<string, unknown>)[key])) {
    return ((response.data as Record<string, unknown>)[key] as T[]);
  }

  return [];
};

const apiService = {
  getTrips: async (date: string, tripType: 'Morning' | 'Evening'): Promise<TripOption[]> => {
    const res = await axiosInstance.get('/trips', { params: { date, trip_type: tripType } });
    return normalizeListResponse<TripOption>(res.data, 'trips');
  },
  getAttendance: async (tripId: number): Promise<AttendanceRecord[]> => {
    const res = await axiosInstance.get(`/attendance/trip/${tripId}`);
    return normalizeListResponse<AttendanceRecord>(res.data, 'attendance');
  },
  updateAttendance: async (id: number, payload: UpdatePayload): Promise<AttendanceRecord> => {
    const res = await axiosInstance.patch(`/attendance/${id}`, payload);
    const data = (res.data?.data ?? res.data) as AttendanceRecord | AttendanceRecord[] | undefined;
    return Array.isArray(data) ? data.find(item => item.id === id) ?? data[0] : data as AttendanceRecord;
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeSummary(records: AttendanceRecord[]): AttendanceSummary {
  return {
    total: records.length,
    boarded: records.filter(r => r.boarding_status === 'Boarded').length,
    absent: records.filter(r => r.boarding_status === 'Absent').length,
    missed_pickup: records.filter(r => r.boarding_status === 'Missed Pickup').length,
    parent_pickup: records.filter(r => r.boarding_status === 'Parent Pickup').length,
    dropped_off: records.filter(r => r.dropoff_status === 'Dropped Off').length,
    pending_dropoff: records.filter(r => r.dropoff_status === 'Pending').length,
  };
}

function formatTime(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const BoardingBadge: React.FC<{ status: AttendanceRecord['boarding_status'] }> = ({ status }) => {
  const map: Record<string, string> = {
    'Boarded': 'sa-badge sa-badge--boarded',
    'Absent': 'sa-badge sa-badge--absent',
    'Missed Pickup': 'sa-badge sa-badge--missed',
    'Parent Pickup': 'sa-badge sa-badge--parent',
  };
  return <span className={map[status] || 'sa-badge'}>{status}</span>;
};

const DropoffBadge: React.FC<{ status: AttendanceRecord['dropoff_status'] }> = ({ status }) => {
  const map: Record<string, string> = {
    'Dropped Off': 'sa-badge sa-badge--boarded',
    'Not Dropped': 'sa-badge sa-badge--absent',
    'Parent Pickup': 'sa-badge sa-badge--parent',
    'Pending': 'sa-badge sa-badge--pending',
  };
  return <span className={map[status] || 'sa-badge'}>{status}</span>;
};

const TripStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    'On Time': 'sa-trip-badge sa-trip-badge--ontime',
    'Delayed': 'sa-trip-badge sa-trip-badge--delayed',
    'Completed': 'sa-trip-badge sa-trip-badge--completed',
    'Not Started': 'sa-trip-badge sa-trip-badge--notstarted',
    'Overdue': 'sa-trip-badge sa-trip-badge--overdue',
  };
  return <span className={map[status] || 'sa-trip-badge'}>{status}</span>;
};

const EmptyState: React.FC<{ message: string; sub?: string }> = ({ message, sub }) => (
  <div className="sa-empty">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
    <p className="sa-empty__title">{message}</p>
    {sub && <p className="sa-empty__sub">{sub}</p>}
  </div>
);

// ─── Update Modal ─────────────────────────────────────────────────────────────

interface UpdateModalProps {
  record: AttendanceRecord;
  onClose: () => void;
  onSave: (id: number, payload: UpdatePayload) => Promise<void>;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ record, onClose, onSave }) => {
  const [boarding, setBoarding] = useState<AttendanceRecord['boarding_status']>(record.boarding_status);
  const [dropoff, setDropoff] = useState<AttendanceRecord['dropoff_status']>(record.dropoff_status);
  const [notes, setNotes] = useState(record.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(record.id, { boarding_status: boarding, dropoff_status: dropoff, notes: notes.trim() || undefined });
      onClose();
    } catch (err) {
      setError('Failed to update attendance. Please try again.');
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="sa-modal-overlay" onClick={onClose}>
      <div className="sa-modal" onClick={e => e.stopPropagation()}>
        <div className="sa-modal__header">
          <div>
            <h3 className="sa-modal__title">Update Student Attendance</h3>
            <p className="sa-modal__sub">{record.student_name} · {record.admission_number}</p>
          </div>
          <button className="sa-modal__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="sa-modal__body">
          <div className="sa-modal__info-row">
            <span><strong>Stop:</strong> {record.stop_name}</span>
            <span><strong>Grade:</strong> {record.grade} {record.stream}</span>
            <span><strong>Trip:</strong> {record.trip_type}</span>
          </div>
          {error && <div className="sa-modal__error">{error}</div>}

          <div className="sa-modal__field">
            <label className="sa-modal__label">Boarding Status</label>
            <select className="sa-modal__select" value={boarding} onChange={e => setBoarding(e.target.value as AttendanceRecord['boarding_status'])}>
              <option value="Boarded">Boarded</option>
              <option value="Absent">Absent</option>
              <option value="Missed Pickup">Missed Pickup</option>
              <option value="Parent Pickup">Parent Pickup</option>
            </select>
          </div>

          <div className="sa-modal__field">
            <label className="sa-modal__label">Drop-off Status</label>
            <select className="sa-modal__select" value={dropoff} onChange={e => setDropoff(e.target.value as AttendanceRecord['dropoff_status'])}>
              <option value="Pending">Pending</option>
              <option value="Dropped Off">Dropped Off</option>
              <option value="Not Dropped">Not Dropped</option>
              <option value="Parent Pickup">Parent Pickup</option>
            </select>
          </div>

          <div className="sa-modal__field">
            <label className="sa-modal__label">Notes <span className="sa-modal__optional">(optional)</span></label>
            <textarea
              className="sa-modal__textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any relevant notes..."
              rows={3}
            />
          </div>
        </div>

        <div className="sa-modal__footer">
          <button className="sa-btn sa-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="sa-btn sa-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const StudentAttendance: React.FC<Props> = ({ section }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedTripType, setSelectedTripType] = useState<'Morning' | 'Evening'>('Morning');
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripOption | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBoarding, setFilterBoarding] = useState<string>('All');
  const [filterStop, setFilterStop] = useState<string>('All');
  const [groupByStop, setGroupByStop] = useState(true);
  const isMounted = useRef(true);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'attendance' | 'log'>('attendance');

  // ── Fetch trips for date + type ──────────────────────────────────────────────
  const fetchTrips = useCallback(async (date: string, tripType: 'Morning' | 'Evening') => {
    setTripsLoading(true);
    setApiError(null);
    try {
      const data = await apiService.getTrips(date, tripType);
      setTrips(data);
      if (data.length > 0 && (!selectedTrip || selectedTrip.trip_type !== tripType)) {
        if (!isMounted.current) return;
        setSelectedTrip(data[0]);
      } else if (data.length === 0) {
        setSelectedTrip(null);
        setAttendance([]);
      }
    } catch (err) {
      if (isApiError(err)) {
        if (!isMounted.current) return;
        setApiError(err.response?.data?.message || 'Failed to load trips');
      } else {
        if (!isMounted.current) return;
        setApiError('Network error. Please check your connection.');
      }
      console.error('Fetch trips error:', err);
      setTrips([]);
      setSelectedTrip(null);
    } finally {
      setTripsLoading(false);
    }
  }, [selectedTrip]);

  // ── Fetch attendance for selected trip ───────────────────────────────────────
  const fetchAttendance = useCallback(async (tripId: number) => {
    setLoading(true);
    setApiError(null);
    try {
      const data = await apiService.getAttendance(tripId);
      setAttendance(data);
    } catch (err) {
      if (isApiError(err)) {
        if (!isMounted.current) return;
        setApiError(err.response?.data?.message || 'Failed to load attendance');
      } else {
        if (!isMounted.current) return;
        setApiError('Failed to load attendance records');
      }
      console.error('Fetch attendance error:', err);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchTrips(selectedDate, selectedTripType);
    return () => {
      isMounted.current = false;
    };
  }, [selectedDate, selectedTripType, fetchTrips]);

  useEffect(() => {
    if (selectedTrip) {
      fetchAttendance(selectedTrip.id);
    } else {
      setAttendance([]);
    }
  }, [selectedTrip, fetchAttendance]);

  // ── Update handler ───────────────────────────────────────────────────────────
  const handleUpdate = async (id: number, payload: UpdatePayload) => {
    try {
      const updated = await apiService.updateAttendance(id, payload);
      setAttendance(prev => prev.map(r => r.id === id ? updated : r));
    } catch (err) {
      console.error('Update error:', err);
      throw err;
    }
  };

  // ── Filtered records ─────────────────────────────────────────────────────────
  const stops = Array.from(new Set(attendance.map(r => r.stop_name)));

  const filtered = attendance.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || r.student_name.toLowerCase().includes(q) || r.admission_number.toLowerCase().includes(q);
    const matchBoarding = filterBoarding === 'All' || r.boarding_status === filterBoarding;
    const matchStop = filterStop === 'All' || r.stop_name === filterStop;
    return matchSearch && matchBoarding && matchStop;
  });

  // ── Group by stop ────────────────────────────────────────────────────────────
  const grouped: Record<string, AttendanceRecord[]> = {};
  if (groupByStop) {
    filtered.forEach(r => {
      if (!grouped[r.stop_name]) grouped[r.stop_name] = [];
      grouped[r.stop_name].push(r);
    });
  }

  const summary = computeSummary(attendance);
  const boardingPct = summary.total ? Math.round((summary.boarded / summary.total) * 100) : 0;

  return (
    <div className="sa-root">
      {/* ── Page Header ── */}
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title">{section.heading}</h1>
          <p className="sa-page-desc">{section.description}</p>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {apiError && (
        <div className="sa-error-banner">
          {apiError}
          <button className="sa-error-dismiss" onClick={() => setApiError(null)}>✕</button>
        </div>
      )}

      {/* ── Filters Bar ── */}
      <div className="sa-filters-bar">
        <div className="sa-filters-left">
          <div className="sa-field-group">
            <label className="sa-field-label">Date</label>
            <input
              type="date"
              className="sa-input"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="sa-field-group">
            <label className="sa-field-label">Trip</label>
            <div className="sa-toggle-group">
              {(['Morning', 'Evening'] as const).map(t => (
                <button
                  key={t}
                  className={`sa-toggle-btn${selectedTripType === t ? ' sa-toggle-btn--active' : ''}`}
                  onClick={() => setSelectedTripType(t)}
                >
                  {t === 'Morning' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="sa-filters-right">
          <span className="sa-date-display">{formatDate(selectedDate)}</span>
        </div>
      </div>

      {/* ── Trip Selector ── */}
      <div className="sa-section">
        <h2 className="sa-section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          Select Route / Trip
        </h2>
        {tripsLoading ? (
          <div className="sa-loading">Loading trips...</div>
        ) : trips.length === 0 ? (
          <EmptyState message="No trips found" sub={`No ${selectedTripType.toLowerCase()} trips scheduled for ${formatDate(selectedDate)}`} />
        ) : (
          <div className="sa-trip-grid">
            {trips.map(trip => (
              <button
                key={trip.id}
                className={`sa-trip-card${selectedTrip?.id === trip.id ? ' sa-trip-card--active' : ''}`}
                onClick={() => setSelectedTrip(trip)}
              >
                <div className="sa-trip-card__top">
                  <span className="sa-trip-card__id">{trip.trip_id}</span>
                  <TripStatusBadge status={trip.status} />
                </div>
                <div className="sa-trip-card__name">{trip.route_name}</div>
                <div className="sa-trip-card__meta">
                  <span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                    {trip.vehicle_plate}
                  </span>
                  <span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                    {trip.driver_name}
                  </span>
                  <span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    {formatTime(trip.departure_time)}
                  </span>
                </div>
                <div className="sa-trip-card__progress">
                  <div className="sa-progress-bar">
                    <div
                      className="sa-progress-bar__fill"
                      style={{ width: `${trip.total_stops ? (trip.stops_completed / trip.total_stops) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="sa-trip-card__progress-text">{trip.stops_completed}/{trip.total_stops} stops</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Attendance Section ── */}
      {selectedTrip && (
        <>
          {/* Summary Cards */}
          <div className="sa-summary-row">
            <div className="sa-stat-card">
              <span className="sa-stat-card__value">{summary.total}</span>
              <span className="sa-stat-card__label">Total Students</span>
            </div>
            <div className="sa-stat-card sa-stat-card--green">
              <span className="sa-stat-card__value">{summary.boarded}</span>
              <span className="sa-stat-card__label">Boarded</span>
            </div>
            <div className="sa-stat-card sa-stat-card--red">
              <span className="sa-stat-card__value">{summary.absent}</span>
              <span className="sa-stat-card__label">Absent</span>
            </div>
            <div className="sa-stat-card sa-stat-card--orange">
              <span className="sa-stat-card__value">{summary.missed_pickup}</span>
              <span className="sa-stat-card__label">Missed Pickup</span>
            </div>
            <div className="sa-stat-card sa-stat-card--purple">
              <span className="sa-stat-card__value">{summary.parent_pickup}</span>
              <span className="sa-stat-card__label">Parent Pickup</span>
            </div>
            <div className="sa-stat-card sa-stat-card--blue">
              <span className="sa-stat-card__value">{boardingPct}%</span>
              <span className="sa-stat-card__label">Boarding Rate</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="sa-tabs">
            <button
              className={`sa-tab${activeTab === 'attendance' ? ' sa-tab--active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              Attendance Register
            </button>
            <button
              className={`sa-tab${activeTab === 'log' ? ' sa-tab--active' : ''}`}
              onClick={() => setActiveTab('log')}
            >
              Missed / Absent Log
            </button>
          </div>

          {activeTab === 'attendance' && (
            <div className="sa-section">
              {/* Table controls */}
              <div className="sa-table-controls">
                <div className="sa-search-wrap">
                  <svg className="sa-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="sa-search-input"
                    placeholder="Search student name or admission no..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <select className="sa-select" value={filterBoarding} onChange={e => setFilterBoarding(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Boarded">Boarded</option>
                  <option value="Absent">Absent</option>
                  <option value="Missed Pickup">Missed Pickup</option>
                  <option value="Parent Pickup">Parent Pickup</option>
                </select>
                <select className="sa-select" value={filterStop} onChange={e => setFilterStop(e.target.value)}>
                  <option value="All">All Stops</option>
                  {stops.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  className={`sa-btn sa-btn--ghost sa-btn--sm${groupByStop ? ' sa-btn--active' : ''}`}
                  onClick={() => setGroupByStop(v => !v)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  Group by Stop
                </button>
              </div>

              {loading ? (
                <div className="sa-loading">Loading attendance records...</div>
              ) : filtered.length === 0 ? (
                <EmptyState message="No records found" sub="Try adjusting your filters" />
              ) : groupByStop ? (
                Object.entries(grouped).map(([stopName, records]) => (
                  <div key={stopName} className="sa-stop-group">
                    <div className="sa-stop-group__header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{stopName}</span>
                      <span className="sa-stop-group__count">{records.length} student{records.length !== 1 ? 's' : ''}</span>
                    </div>
                    <AttendanceTable records={records} onEdit={setEditingRecord} />
                  </div>
                ))
              ) : (
                <AttendanceTable records={filtered} onEdit={setEditingRecord} />
              )}
            </div>
          )}

          {activeTab === 'log' && (
            <div className="sa-section">
              <MissedLog records={attendance.filter(r => r.boarding_status === 'Absent' || r.boarding_status === 'Missed Pickup')} />
            </div>
          )}
        </>
      )}

      {/* ── Edit Modal ── */}
      {editingRecord && (
        <UpdateModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
};

// ─── Attendance Table ─────────────────────────────────────────────────────────

interface TableProps {
  records: AttendanceRecord[];
  onEdit: (r: AttendanceRecord) => void;
}

const AttendanceTable: React.FC<TableProps> = ({ records, onEdit }) => (
  <div className="sa-table-wrap">
    <table className="sa-table">
      <thead>
        <tr>
          <th>Student</th>
          <th>Grade</th>
          <th>Boarding</th>
          <th>Boarded At</th>
          <th>Drop-off</th>
          <th>Dropped At</th>
          <th>Confirmed By</th>
          <th>Notes</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {records.map(r => (
          <tr key={r.id} className={r.boarding_status === 'Absent' || r.boarding_status === 'Missed Pickup' ? 'sa-table__row--alert' : ''}>
            <td>
              <div className="sa-student-cell">
                <div className="sa-student-cell__avatar">{r.student_name.charAt(0)}</div>
                <div>
                  <div className="sa-student-cell__name">{r.student_name}</div>
                  <div className="sa-student-cell__adm">{r.admission_number}</div>
                </div>
              </div>
            </td>
            <td><span className="sa-grade-tag">{r.grade} {r.stream}</span></td>
            <td><BoardingBadge status={r.boarding_status} /></td>
            <td className="sa-time-cell">{formatTime(r.boarded_at)}</td>
            <td><DropoffBadge status={r.dropoff_status} /></td>
            <td className="sa-time-cell">{formatTime(r.dropped_off_at)}</td>
            <td className="sa-confirmed-cell">{r.confirmed_by || '—'}</td>
            <td className="sa-notes-cell" title={r.notes || ''}>{r.notes ? r.notes.slice(0, 30) + (r.notes.length > 30 ? '...' : '') : '—'}</td>
            <td>
              <button className="sa-btn-icon" onClick={() => onEdit(r)} title="Update attendance">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Missed / Absent Log ──────────────────────────────────────────────────────

const MissedLog: React.FC<{ records: AttendanceRecord[] }> = ({ records }) => {
  if (records.length === 0) {
    return <EmptyState message="No missed or absent students" sub="All students have been accounted for on this trip." />;
  }
  return (
    <div className="sa-log">
      <div className="sa-log__header">
        <span className="sa-log__count">{records.length} student{records.length !== 1 ? 's' : ''} require attention</span>
      </div>
      {records.map(r => (
        <div key={r.id} className={`sa-log-card sa-log-card--${r.boarding_status === 'Absent' ? 'absent' : 'missed'}`}>
          <div className="sa-log-card__left">
            <div className="sa-student-cell__avatar sa-student-cell__avatar--lg">{r.student_name.charAt(0)}</div>
            <div>
              <div className="sa-log-card__name">{r.student_name}</div>
              <div className="sa-log-card__meta">{r.admission_number} · {r.grade} {r.stream}</div>
              <div className="sa-log-card__stop">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                {r.stop_name}
              </div>
            </div>
          </div>
          <div className="sa-log-card__right">
            <BoardingBadge status={r.boarding_status} />
            {r.notes && <p className="sa-log-card__notes">{r.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StudentAttendance;