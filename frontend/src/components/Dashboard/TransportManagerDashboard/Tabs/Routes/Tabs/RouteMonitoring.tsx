import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import type { RoleSection } from '../../../../dashboard.types';
import './RouteMonitoring.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type TripStatus = 'On Time' | 'Delayed' | 'Completed' | 'Not Started' | 'Overdue';
type TripStopStatus = 'Pending' | 'Completed' | 'Missed' | 'Skipped';

interface TripStop {
  id: number;
  stop_name: string;
  scheduled_time: string;
  actual_time: string | null;
  status: TripStopStatus;
  sequence_order: number;
  students_picked?: number;
  students_dropped?: number;
  arrival_latitude?: number;
  arrival_longitude?: number;
}

interface TodayTrip {
  id: number;
  trip_id: string;
  route_id: string;
  route_name: string;
  vehicle_plate: string;
  vehicle_model?: string;
  driver_name: string;
  assistant_name?: string;
  departure_time: string;
  expected_return_time: string;
  actual_return_time: string | null;
  status: TripStatus;
  stops_completed: number;
  total_stops: number;
  last_updated: string;
  delay_reason?: string;
  delay_minutes?: number;
  notes?: string;
  stops?: TripStop[];
}

interface RouteOption {
  route_id: string;
  route_name: string;
}

interface RouteMonitoringProps {
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

const apiService = {
  getTodayTrips: async (date: string): Promise<TodayTrip[]> => {
    const res = await axiosInstance.get(`/trips/date/${date}`);
    return res.data?.data?.trips || res.data || [];
  },
  getTripDetails: async (tripId: number): Promise<TodayTrip> => {
    const res = await axiosInstance.get(`/trips/${tripId}`);
    return res.data?.data?.trip || res.data;
  },
  getRoutes: async (): Promise<RouteOption[]> => {
    const res = await axiosInstance.get('/routes');
    const routes = res.data?.data?.routes || res.data || [];
    return routes.map((r: { route_id: string; route_name: string }) => ({
      route_id: r.route_id,
      route_name: r.route_name,
    }));
  },
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

const formatTime = (datetime: string): string => {
  if (!datetime) return '—';
  const date = new Date(datetime);
  return date.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDate = (datetime: string): string => {
  if (!datetime) return '—';
  const date = new Date(datetime);
  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (datetime: string): string => {
  if (!datetime) return '—';
  const date = new Date(datetime);
  return date.toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// ─── Main Component ───────────────────────────────────────────────────────────

const RouteMonitoring: React.FC<RouteMonitoringProps> = ({ section }) => {
  const [trips, setTrips] = useState<TodayTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'All'>('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TodayTrip | null>(null);
  const [loadingTripDetails, setLoadingTripDetails] = useState(false);

  const isMounted = useRef(true);

  // ─── Fetch Data ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [tripsData, routesData] = await Promise.all([
        apiService.getTodayTrips(selectedDate),
        apiService.getRoutes(),
      ]);
      if (!isMounted.current) return;
      if (Array.isArray(tripsData)) setTrips(tripsData);
      void routesData;
    } catch (err) {
      if (!isMounted.current) return;
      if (isApiError(err)) {
        if (err.response?.status === 401) {
          setApiError('Session expired. Please log in again.');
        } else {
          setApiError(err.response?.data?.message || 'Failed to load trips. Please refresh the page.');
        }
      } else {
        setApiError('Network error. Please check your connection.');
      }
      console.error('Fetch error:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => { isMounted.current = false; };
  }, [fetchData, selectedDate]);

  // ─── Computed Values ───────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    active: trips.filter(t => t.status === 'On Time').length,
    delayed: trips.filter(t => t.status === 'Delayed').length,
    completed: trips.filter(t => t.status === 'Completed').length,
    notStarted: trips.filter(t => t.status === 'Not Started').length,
    overdue: trips.filter(t => t.status === 'Overdue').length,
  }), [trips]);

  const filteredTrips = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return trips.filter(trip => {
      const matchQ =
        !q ||
        trip.route_name.toLowerCase().includes(q) ||
        trip.vehicle_plate.toLowerCase().includes(q) ||
        trip.driver_name.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || trip.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [trips, searchTerm, statusFilter]);

  // ─── Modal Handlers ────────────────────────────────────────────────────────

  const openModal = async (trip: TodayTrip) => {
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
    setLoadingTripDetails(true);
    
    try {
      // Fetch detailed trip data including stops
      const detailedTrip = await apiService.getTripDetails(trip.id);
      if (isMounted.current) {
        setSelectedTrip(detailedTrip);
      }
    } catch (err) {
      console.error('Failed to load trip details:', err);
      // Fallback to the trip data we already have
      if (isMounted.current) {
        setSelectedTrip(trip);
      }
      setApiError('Failed to load trip details. Showing basic information.');
    } finally {
      if (isMounted.current) {
        setLoadingTripDetails(false);
      }
    }
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedTrip(null);
    document.body.style.overflow = '';
  }, []);

  // ─── Status Badge Component ────────────────────────────────────────────────

  const StatusBadge: React.FC<{ status: TripStatus }> = ({ status }) => {
    let className = 'rm-badge';
    switch (status) {
      case 'On Time':
      case 'Completed':
        className += ' rm-badge--green';
        break;
      case 'Delayed':
        className += ' rm-badge--amber';
        break;
      case 'Not Started':
        className += ' rm-badge--gray';
        break;
      case 'Overdue':
        className += ' rm-badge--red';
        break;
    }
    return <span className={className}>{status}</span>;
  };

  // ─── Render Modal ──────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!modalOpen) return null;

    return ReactDOM.createPortal(
      <div className="rm-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
        <div className="rm-modal rm-modal--lg" onClick={e => e.stopPropagation()}>
          {loadingTripDetails ? (
            <>
              <div className="rm-modal-header">
                <h2 className="rm-modal-title">Loading Trip Details...</h2>
                <button className="rm-modal-close" onClick={closeModal}>
                  <CloseIcon />
                </button>
              </div>
              <div className="rm-modal-body rm-loading-center">
                <div className="rm-spinner"></div>
                <p>Fetching trip data...</p>
              </div>
            </>
          ) : selectedTrip ? (
            <>
              <div className="rm-modal-header">
                <div>
                  <h2 className="rm-modal-title">{selectedTrip.route_name}</h2>
                  <p className="rm-modal-sub">
                    {selectedTrip.trip_id} · {formatDate(selectedTrip.departure_time)}
                  </p>
                </div>
                <div className="rm-modal-header-actions">
                  <StatusBadge status={selectedTrip.status} />
                  <button className="rm-modal-close" onClick={closeModal}>
                    <CloseIcon />
                  </button>
                </div>
              </div>

              <div className="rm-modal-body">
                {/* Trip Overview */}
                <section className="rm-detail-section">
                  <h3 className="rm-detail-section-title">Trip Overview</h3>
                  <div className="rm-detail-grid">
                    <DetailItem label="Route" value={selectedTrip.route_name} />
                    <DetailItem label="Vehicle" value={`${selectedTrip.vehicle_plate}${selectedTrip.vehicle_model ? ` · ${selectedTrip.vehicle_model}` : ''}`} />
                    <DetailItem label="Driver" value={selectedTrip.driver_name} />
                    <DetailItem label="Assistant" value={selectedTrip.assistant_name || '—'} />
                    <DetailItem label="Departure Time" value={formatDateTime(selectedTrip.departure_time)} />
                    <DetailItem label="Expected Return" value={formatDateTime(selectedTrip.expected_return_time)} />
                    <DetailItem label="Actual Return" value={selectedTrip.actual_return_time ? formatDateTime(selectedTrip.actual_return_time) : '—'} />
                    <DetailItem label="Stops Progress" value={`${selectedTrip.stops_completed} / ${selectedTrip.total_stops} completed`} />
                    {selectedTrip.delay_reason && (
                      <DetailItem label="Delay Reason" value={selectedTrip.delay_reason} span />
                    )}
                    {selectedTrip.notes && (
                      <DetailItem label="Notes" value={selectedTrip.notes} span />
                    )}
                  </div>
                </section>

                {/* Stop Timeline */}
                <section className="rm-detail-section">
                  <h3 className="rm-detail-section-title">Stop Timeline</h3>
                  <div className="rm-timeline">
                    {selectedTrip.stops && selectedTrip.stops.length > 0 ? (
                      selectedTrip.stops
                        .sort((a, b) => a.sequence_order - b.sequence_order)
                        .map((stop, index) => (
                          <div key={stop.id} className="rm-timeline-item">
                            <div className={`rm-timeline-dot rm-timeline-dot--${stop.status.toLowerCase()}`} />
                            <div className="rm-timeline-content">
                              <div className="rm-timeline-header">
                                <span className="rm-timeline-stop-name">{stop.stop_name}</span>
                                <span className={`rm-timeline-status rm-timeline-status--${stop.status.toLowerCase()}`}>
                                  {stop.status}
                                </span>
                              </div>
                              <div className="rm-timeline-time">
                                <span>Scheduled: {stop.scheduled_time}</span>
                                {stop.actual_time && (
                                  <span> · Actual: {formatTime(stop.actual_time)}</span>
                                )}
                              </div>
                              {stop.students_picked !== undefined && stop.students_picked > 0 && (
                                <div className="rm-timeline-students">
                                  🚌 {stop.students_picked} students picked
                                  {stop.students_dropped ? ` · ${stop.students_dropped} dropped` : ''}
                                </div>
                              )}
                            </div>
                            {index < (selectedTrip.stops?.length || 0) - 1 && (
                              <div className="rm-timeline-connector" />
                            )}
                          </div>
                        ))
                    ) : (
                      <div className="rm-empty-timeline">
                        <p>No stop details available for this trip.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="rm-modal-footer">
                <button className="rm-btn rm-btn--ghost" onClick={closeModal}>
                  Close
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>,
      document.body
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rm-page">

      {/* Page Header */}
      <div className="rm-page-header">
        <div>
          <h1 className="rm-page-title">{section.heading}</h1>
          <p className="rm-page-sub">{section.description}</p>
        </div>
      </div>

      {/* Error Banner */}
      {apiError && (
        <div className="rm-error-banner">
          {apiError}
          <button className="rm-error-dismiss" onClick={() => setApiError(null)}>✕</button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="rm-stats-grid">
        <StatCard 
          label="Active Routes Today" 
          value={stats.active} 
          variant="active"
          subtitle="On Time"
        />
        <StatCard 
          label="Delayed" 
          value={stats.delayed} 
          variant="delayed"
          subtitle="Running Late"
        />
        <StatCard 
          label="Completed" 
          value={stats.completed} 
          variant="completed"
          subtitle="Finished Trips"
        />
        <StatCard 
          label="Not Started" 
          value={stats.notStarted} 
          variant="pending"
          subtitle="Awaiting Departure"
        />
      </div>

      {/* Toolbar */}
      <div className="rm-toolbar">
        <div className="rm-date-picker">
          <CalendarIcon />
          <input
            type="date"
            className="rm-date-input"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="rm-search-wrap">
          <SearchIcon />
          <input
            className="rm-search"
            placeholder="Search by route, vehicle or driver…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="rm-search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <select
          className="rm-filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as TripStatus | 'All')}
        >
          <option value="All">All Status</option>
          <option value="On Time">On Time</option>
          <option value="Delayed">Delayed</option>
          <option value="Completed">Completed</option>
          <option value="Not Started">Not Started</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Table */}
      <div className="rm-table-wrap">
        {loading ? (
          <div className="rm-loading">Loading trips...</div>
        ) : filteredTrips.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="rm-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Departure Time</th>
                <th>Expected Return</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map(trip => (
                <tr key={trip.id}>
                  <td className="rm-td-route">
                    <div className="rm-route-cell">
                      <span className="rm-route-name">{trip.route_name}</span>
                      <span className="rm-progress-badge">
                        {trip.stops_completed}/{trip.total_stops} stops
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="rm-vehicle-cell">
                      <span className="rm-vehicle-plate">{trip.vehicle_plate}</span>
                      {trip.vehicle_model && (
                        <span className="rm-vehicle-model">{trip.vehicle_model}</span>
                      )}
                    </div>
                  </td>
                  <td className="rm-td-driver">{trip.driver_name}</td>
                  <td className="rm-td-time">{formatTime(trip.departure_time)}</td>
                  <td className="rm-td-time">{formatTime(trip.expected_return_time)}</td>
                  <td><StatusBadge status={trip.status} /></td>
                  <td className="rm-td-updated">{formatTime(trip.last_updated)}</td>
                  <td>
                    <button 
                      className="rm-view-btn"
                      onClick={() => openModal(trip)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="rm-table-footer">
        Showing <strong>{filteredTrips.length}</strong> of{' '}
        <strong>{trips.length}</strong> trips for {formatDate(selectedDate)}
      </div>

      {/* Portaled Modal */}
      {renderModal()}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  variant: 'active' | 'delayed' | 'completed' | 'pending';
  subtitle?: string;
}> = ({ label, value, variant, subtitle }) => (
  <div className={`rm-stat-card rm-stat-card--${variant}`}>
    <span className="rm-stat-value">{value}</span>
    <span className="rm-stat-label">{label}</span>
    {subtitle && <span className="rm-stat-subtitle">{subtitle}</span>}
  </div>
);

const DetailItem: React.FC<{ label: string; value: string; span?: boolean }> = ({
  label, value, span,
}) => (
  <div className={`rm-detail-item${span ? ' rm-detail-item--span' : ''}`}>
    <dt className="rm-detail-label">{label}</dt>
    <dd className="rm-detail-value">{value}</dd>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="rm-empty">
    <p className="rm-empty-title">No trips found</p>
    <p className="rm-empty-sub">
      {new Date().toISOString().split('T')[0] === new Date().toLocaleDateString('en-CA')
        ? 'No trips scheduled for today.'
        : 'Try selecting a different date or adjust your filters.'}
    </p>
  </div>
);

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon: React.FC = () => (
  <svg className="rm-icon-search" width="15" height="15" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CalendarIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export default RouteMonitoring;