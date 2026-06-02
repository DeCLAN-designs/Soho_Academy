import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import type { RoleSection } from '../../../../dashboard.types';
import './StopsManagement.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type StopType = 'Pickup' | 'Dropoff' | 'Both';
type StopStatus = 'Active' | 'Inactive';
type ModalType = 'add' | 'edit' | 'delete' | null;

interface Stop {
  id: number;
  stop_id: string;
  stop_name: string;
  stop_type: StopType;
  route_id: string;
  address: string;
  landmark: string | null;
  sequence_order: number;
  students_assigned: number;
  status: StopStatus;
  created_at: string;
  updated_at: string;
  // Joined fields from routes table
  route_name?: string;
}

interface StopFormData {
  stop_name: string;
  stop_type: StopType | '';
  route_id: string;
  address: string;
  sequence_order: string;
  landmark: string;
  status: StopStatus | '';
}

type FormErrors = Partial<Record<keyof StopFormData, string>>;

interface StopsManagementProps {
  section: RoleSection;
}

interface RouteOption {
  route_id: string;
  route_name: string;
}

type RawStop = Partial<Stop> & {
  stopId?: string;
  stopName?: string;
  stopType?: StopType;
  routeId?: string;
  routeName?: string | null;
  sequenceOrder?: number;
  studentsAssigned?: number;
  createdAt?: string;
  updatedAt?: string;
};

type RawRouteOption = {
  route_id?: string;
  route_name?: string;
  routeId?: string;
  routeName?: string;
};

type ApiError = { response?: { status?: number; data?: { message?: string } } };
const isApiError = (err: unknown): err is ApiError =>
  typeof err === 'object' && err !== null;

const normalizeStop = (stop: RawStop): Stop => ({
  id: Number(stop.id),
  stop_id: stop.stop_id ?? stop.stopId ?? '',
  stop_name: stop.stop_name ?? stop.stopName ?? '',
  stop_type: (stop.stop_type ?? stop.stopType ?? 'Pickup') as StopType,
  route_id: stop.route_id ?? stop.routeId ?? '',
  address: stop.address ?? '',
  landmark: stop.landmark ?? null,
  sequence_order: Number(stop.sequence_order ?? stop.sequenceOrder ?? 0),
  students_assigned: Number(stop.students_assigned ?? stop.studentsAssigned ?? 0),
  status: (stop.status ?? 'Active') as StopStatus,
  created_at: stop.created_at ?? stop.createdAt ?? '',
  updated_at: stop.updated_at ?? stop.updatedAt ?? '',
  route_name: stop.route_name ?? stop.routeName ?? undefined,
});

const normalizeRouteOption = (route: RawRouteOption): RouteOption | null => {
  const routeId = route.route_id ?? route.routeId ?? '';
  const routeName = route.route_name ?? route.routeName ?? '';
  if (!routeId || !routeName) return null;
  return { route_id: routeId, route_name: routeName };
};

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
  getStops: async (): Promise<Stop[]> => {
    const res = await axiosInstance.get('/stops');
    // API should return stops with joined route_name
    const stops = res.data?.data?.stops || res.data || [];
    return Array.isArray(stops) ? stops.map(normalizeStop) : [];
  },
  createStop: async (data: Partial<Stop>): Promise<Stop> => {
    const res = await axiosInstance.post('/stops', data);
    return normalizeStop(res.data?.data?.stop || res.data);
  },
  updateStop: async (id: number, data: Partial<Stop>): Promise<Stop> => {
    const res = await axiosInstance.put(`/stops/${id}`, data);
    return normalizeStop(res.data?.data?.stop || res.data);
  },
  updateStopSequence: async (id: number, sequence_order: number): Promise<Stop> => {
    const res = await axiosInstance.patch(`/stops/${id}/sequence`, { sequence_order });
    return normalizeStop(res.data?.data?.stop || res.data);
  },
  deleteStop: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/stops/${id}`);
  },
  getRoutes: async (): Promise<RouteOption[]> => {
    const res = await axiosInstance.get('/routes');
    const routes = res.data?.data?.routes || res.data || [];
    return Array.isArray(routes)
      ? routes.map(normalizeRouteOption).filter((route): route is RouteOption => Boolean(route))
      : [];
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

const StopsManagement: React.FC<StopsManagementProps> = ({ section }) => {
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState<StopType | 'All'>('All');

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  const [form, setForm] = useState<StopFormData>({
    stop_name: '',
    stop_type: '',
    route_id: '',
    address: '',
    sequence_order: '',
    landmark: '',
    status: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const isMounted = useRef(true);
  const fetchDone = useRef(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [stopsData, routesData] = await Promise.all([
        apiService.getStops(),
        apiService.getRoutes(),
      ]);
      if (!isMounted.current) return;
      if (Array.isArray(stopsData)) setStops(stopsData);
      if (Array.isArray(routesData)) setRoutes(routesData);
    } catch (err) {
      if (!isMounted.current) return;
      if (isApiError(err)) {
        if (err.response?.status === 401) {
          setApiError('Session expired. Please log in again.');
        } else {
          setApiError(err.response?.data?.message || 'Failed to load data. Please refresh the page.');
        }
      } else {
        setApiError('Network error. Please check your connection.');
      }
      console.error('Fetch error:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (!fetchDone.current) {
      fetchDone.current = true;
      fetchData();
    }
    return () => { isMounted.current = false; };
  }, [fetchData]);

  // Close action menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.sm-actions')) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: stops.length,
    pickup: stops.filter(s => s.stop_type === 'Pickup').length,
    dropoff: stops.filter(s => s.stop_type === 'Dropoff').length,
    both: stops.filter(s => s.stop_type === 'Both').length,
  }), [stops]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return stops.filter(s => {
      const route = routes.find(r => r.route_id === s.route_id);
      const routeName = route?.route_name || s.route_id;
      const matchQ =
        !q ||
        s.stop_name.toLowerCase().includes(q) ||
        s.stop_id.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        (s.landmark && s.landmark.toLowerCase().includes(q));
      const matchRoute = routeFilter === 'All' || routeName === routeFilter;
      const matchType = typeFilter === 'All' || s.stop_type === typeFilter;
      return matchQ && matchRoute && matchType;
    });
  }, [stops, searchTerm, routeFilter, typeFilter, routes]);

  // ─── Modal Helpers ────────────────────────────────────────────────────────

  const openModal = (type: ModalType, stop?: Stop) => {
    setSelectedStop(stop ?? null);
    setModalType(type);
    setFormErrors({});
    setActiveMenu(null);
    document.body.style.overflow = 'hidden';

    if (type === 'add') {
      setForm({
        stop_name: '',
        stop_type: '',
        route_id: '',
        address: '',
        sequence_order: '',
        landmark: '',
        status: '',
      });
    } else if (type === 'edit' && stop) {
      setForm({
        stop_name: stop.stop_name,
        stop_type: stop.stop_type,
        route_id: stop.route_id,
        address: stop.address,
        sequence_order: String(stop.sequence_order),
        landmark: stop.landmark || '',
        status: stop.status,
      });
    }
  };

  const closeModal = useCallback(() => {
    setModalType(null);
    setSelectedStop(null);
    setFormErrors({});
    document.body.style.overflow = '';
  }, []);

  // ─── Form ─────────────────────────────────────────────────────────────────

  const patchForm = (field: keyof StopFormData) => (val: string) => {
    setForm(p => ({ ...p, [field]: val }));
    if (formErrors[field]) setFormErrors(p => ({ ...p, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const e: FormErrors = {};
    if (!form.stop_name.trim()) e.stop_name = 'Stop name is required';
    if (!form.stop_type) e.stop_type = 'Stop type is required';
    if (!form.route_id) e.route_id = 'Route is required';
    if (!form.address.trim()) e.address = 'Address is required';
    if (!form.sequence_order || Number(form.sequence_order) < 1)
      e.sequence_order = 'Enter a valid sequence number';
    if (!form.status) e.status = 'Status is required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit Handlers ──────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const payload = {
        stop_name: form.stop_name.trim(),
        stop_type: form.stop_type as StopType,
        route_id: form.route_id,
        address: form.address.trim(),
        sequence_order: Number(form.sequence_order),
        landmark: form.landmark.trim() || null,
        status: form.status as StopStatus,
        students_assigned: 0,
      };
      
      const created = await apiService.createStop(payload);
      // Get route name for display
      const route = routes.find(r => r.route_id === created.route_id);
      const stopWithRouteName = { ...created, route_name: route?.route_name };
      setStops(prev => [...prev, stopWithRouteName]);
      closeModal();
    } catch (err) {
      if (isApiError(err)) {
        setApiError(err.response?.data?.message || 'Failed to create stop');
      } else {
        setApiError('Failed to create stop. Please try again.');
      }
      console.error('Create error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!validateForm() || !selectedStop) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const payload = {
        stop_name: form.stop_name.trim(),
        stop_type: form.stop_type as StopType,
        route_id: form.route_id,
        address: form.address.trim(),
        sequence_order: Number(form.sequence_order),
        landmark: form.landmark.trim() || null,
        status: form.status as StopStatus,
      };
      
      const updated = await apiService.updateStop(selectedStop.id, payload);
      const route = routes.find(r => r.route_id === updated.route_id);
      const stopWithRouteName = { ...updated, route_name: route?.route_name };
      setStops(prev => prev.map(s => s.id === selectedStop.id ? stopWithRouteName : s));
      closeModal();
    } catch (err) {
      if (isApiError(err)) {
        setApiError(err.response?.data?.message || 'Failed to update stop');
      } else {
        setApiError('Failed to update stop. Please try again.');
      }
      console.error('Update error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStop) return;
    setSubmitting(true);
    setApiError(null);
    try {
      await apiService.deleteStop(selectedStop.id);
      setStops(prev => prev.filter(s => s.id !== selectedStop.id));
      closeModal();
    } catch (err) {
      if (isApiError(err)) {
        setApiError(err.response?.data?.message || 'Failed to delete stop');
      } else {
        setApiError('Failed to delete stop. Please try again.');
      }
      console.error('Delete error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Sequence Handlers ────────────────────────────────────────────────────

  const moveStop = async (stop: Stop, direction: 'up' | 'down') => {
    const routeStops = stops
      .filter(s => s.route_id === stop.route_id)
      .sort((a, b) => a.sequence_order - b.sequence_order);

    const idx = routeStops.findIndex(s => s.id === stop.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;

    if (swapIdx < 0 || swapIdx >= routeStops.length) return;

    const target = routeStops[swapIdx];
    const newOrderCurrent = target.sequence_order;
    const newOrderTarget = stop.sequence_order;

    try {
      await Promise.all([
        apiService.updateStopSequence(stop.id, newOrderCurrent),
        apiService.updateStopSequence(target.id, newOrderTarget),
      ]);
      
      setStops(prev =>
        prev.map(s => {
          if (s.id === stop.id) return { ...s, sequence_order: newOrderCurrent };
          if (s.id === target.id) return { ...s, sequence_order: newOrderTarget };
          return s;
        })
      );
    } catch (err) {
      if (isApiError(err)) {
        setApiError(err.response?.data?.message || 'Failed to update sequence');
      }
      console.error('Sequence error:', err);
    }
    setActiveMenu(null);
  };

  // Helper to get route name from route_id
  const getRouteName = (routeId: string): string => {
    const route = routes.find(r => r.route_id === routeId);
    return route?.route_name || routeId;
  };

  // ─── Modals ───────────────────────────────────────────────────────────────

  const renderFormModal = (mode: 'add' | 'edit') => {
    const title = mode === 'add' ? 'Add Stop' : 'Edit Stop';
    const subtitle =
      mode === 'add'
        ? 'Add a new pickup or dropoff stop to a route'
        : `Editing — ${selectedStop?.stop_id} · ${selectedStop?.stop_name}`;

    return ReactDOM.createPortal(
      <div className="sm-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
        <div className="sm-modal sm-modal--lg" onClick={e => e.stopPropagation()}>
          <ModalHeader title={title} sub={subtitle} onClose={closeModal} />
          <div className="sm-modal-body">
            <div className="sm-form-grid">
              <SMInput
                label="Stop Name"
                value={form.stop_name}
                onChange={patchForm('stop_name')}
                placeholder="e.g. Westlands Roundabout"
                error={formErrors.stop_name}
                required
              />
              <SMSelect
                label="Stop Type"
                value={form.stop_type}
                onChange={patchForm('stop_type')}
                options={['Pickup', 'Dropoff', 'Both']}
                error={formErrors.stop_type}
                required
              />
              <SMSelect
                label="Route"
                value={form.route_id}
                onChange={patchForm('route_id')}
                options={routes.map(r => ({ value: r.route_id, label: r.route_name }))}
                error={formErrors.route_id}
                required
              />
              <SMInput
                label="Sequence Order"
                value={form.sequence_order}
                onChange={patchForm('sequence_order')}
                type="number"
                placeholder="e.g. 1"
                error={formErrors.sequence_order}
                required
              />
              <div className="sm-form-field sm-form-field--full">
                <label className="sm-form-label">
                  Address / Location <span className="sm-required">*</span>
                </label>
                <input
                  type="text"
                  className={`sm-form-input${formErrors.address ? ' sm-form-input--error' : ''}`}
                  value={form.address}
                  onChange={e => patchForm('address')(e.target.value)}
                  placeholder="e.g. Westlands Roundabout, Nairobi"
                />
                {formErrors.address && (
                  <span className="sm-form-error">{formErrors.address}</span>
                )}
              </div>
              <div className="sm-form-field sm-form-field--full">
                <label className="sm-form-label">Landmark / Notes</label>
                <input
                  type="text"
                  className="sm-form-input"
                  value={form.landmark}
                  onChange={e => patchForm('landmark')(e.target.value)}
                  placeholder="e.g. Opposite Sarit Centre main gate"
                />
              </div>
              <SMSelect
                label="Status"
                value={form.status}
                onChange={patchForm('status')}
                options={['Active', 'Inactive']}
                error={formErrors.status}
                required
              />
            </div>
          </div>
          <div className="sm-modal-footer">
            <button className="sm-btn sm-btn--ghost" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="sm-btn sm-btn--primary"
              onClick={mode === 'add' ? handleAdd : handleEdit}
              disabled={submitting}
            >
              {submitting
                ? 'Saving…'
                : mode === 'add'
                ? 'Add Stop'
                : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderDeleteModal = () => {
    if (!selectedStop) return null;
    const routeName = getRouteName(selectedStop.route_id);
    return ReactDOM.createPortal(
      <div className="sm-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
        <div className="sm-modal sm-modal--xs" onClick={e => e.stopPropagation()}>
          <ModalHeader
            title="Delete Stop"
            sub={`${selectedStop.stop_id} · ${selectedStop.stop_name}`}
            onClose={closeModal}
          />
          <div className="sm-modal-body">
            {selectedStop.students_assigned > 0 && (
              <div className="sm-delete-warning">
                <WarnIcon />
                <span>
                  This stop has <strong>{selectedStop.students_assigned} student(s)</strong> assigned.
                  Deleting it will remove their stop assignment.
                </span>
              </div>
            )}
            <p className="sm-confirm-text">
              Are you sure you want to permanently delete{' '}
              <strong>{selectedStop.stop_name}</strong> from{' '}
              <strong>{routeName}</strong>?
              This action cannot be undone.
            </p>
          </div>
          <div className="sm-modal-footer">
            <button className="sm-btn sm-btn--ghost" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="sm-btn sm-btn--danger"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? 'Deleting…' : 'Delete Stop'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="sm-page">

      {/* Page Header */}
      <div className="sm-page-header">
        <div>
          <h1 className="sm-page-title">{section.heading}</h1>
          <p className="sm-page-sub">{section.description}</p>
        </div>
        <button className="sm-btn sm-btn--primary" onClick={() => openModal('add')}>
          + Add Stop
        </button>
      </div>

      {/* Error Banner */}
      {apiError && (
        <div className="sm-error-banner">
          {apiError}
          <button className="sm-error-dismiss" onClick={() => setApiError(null)}>✕</button>
        </div>
      )}

      {/* Loading State */}
      {loading && stops.length === 0 ? (
        <div className="sm-loading">Loading stops...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="sm-stats-grid">
            <StatCard label="Total Stops" value={stats.total} />
            <StatCard label="Pickup Stops" value={stats.pickup} variant="pickup" />
            <StatCard label="Dropoff Stops" value={stats.dropoff} variant="dropoff" />
            <StatCard label="Dual-Purpose" value={stats.both} variant="both" />
          </div>

          {/* Toolbar */}
          <div className="sm-toolbar">
            <div className="sm-search-wrap">
              <SearchIcon />
              <input
                className="sm-search"
                placeholder="Search by stop name, address or landmark…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="sm-search-clear"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
            <select
              className="sm-filter-select"
              value={routeFilter}
              onChange={e => setRouteFilter(e.target.value)}
            >
              <option value="All">All Routes</option>
              {routes.map(r => (
                <option key={r.route_id} value={r.route_name}>
                  {r.route_name}
                </option>
              ))}
            </select>
            <select
              className="sm-filter-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as StopType | 'All')}
            >
              <option value="All">All Types</option>
              <option value="Pickup">Pickup</option>
              <option value="Dropoff">Dropoff</option>
              <option value="Both">Both</option>
            </select>
          </div>

          {/* Table */}
          <div className="sm-table-wrap">
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <table className="sm-table">
                <thead>
                  <tr>
                    <th>Stop ID</th>
                    <th>Stop Name</th>
                    <th>Type</th>
                    <th>Route</th>
                    <th>Address</th>
                    <th>Seq.</th>
                    <th>Students</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .slice()
                    .sort((a, b) => {
                      if (a.route_id !== b.route_id)
                        return getRouteName(a.route_id).localeCompare(getRouteName(b.route_id));
                      return a.sequence_order - b.sequence_order;
                    })
                    .map(stop => {
                      const routeStops = stops
                        .filter(s => s.route_id === stop.route_id)
                        .sort((a, b) => a.sequence_order - b.sequence_order);
                      const isFirst = routeStops[0]?.id === stop.id;
                      const isLast = routeStops[routeStops.length - 1]?.id === stop.id;
                      const routeName = getRouteName(stop.route_id);

                      return (
                        <tr key={stop.id}>
                          <td>
                            <span className="sm-id-badge">{stop.stop_id}</span>
                          </td>
                          <td>
                            <div className="sm-stop-cell">
                              <span className="sm-stop-name">{stop.stop_name}</span>
                              {stop.landmark && (
                                <span className="sm-stop-landmark">{stop.landmark}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <TypeBadge type={stop.stop_type} />
                          </td>
                          <td className="sm-td-route">{routeName}</td>
                          <td className="sm-td-address">{stop.address}</td>
                          <td>
                            <span className="sm-seq-badge">{stop.sequence_order}</span>
                          </td>
                          <td>
                            <span className="sm-students-count">
                              {stop.students_assigned}
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={stop.status} />
                          </td>
                          <td>
                            <div className="sm-actions">
                              <button
                                className="sm-action-trigger"
                                aria-label="Row actions"
                                onClick={() =>
                                  setActiveMenu(activeMenu === stop.id ? null : stop.id)
                                }
                              >
                                <DotsIcon />
                              </button>
                              {activeMenu === stop.id && (
                                <div className="sm-action-menu">
                                  <button onClick={() => openModal('edit', stop)}>
                                    Edit Stop
                                  </button>
                                  <button
                                    className={isFirst ? 'sm-menu-item--disabled' : ''}
                                    onClick={() => !isFirst && moveStop(stop, 'up')}
                                    disabled={isFirst}
                                  >
                                    <ArrowUpIcon /> Move Up
                                  </button>
                                  <button
                                    className={isLast ? 'sm-menu-item--disabled' : ''}
                                    onClick={() => !isLast && moveStop(stop, 'down')}
                                    disabled={isLast}
                                  >
                                    <ArrowDownIcon /> Move Down
                                  </button>
                                  <div className="sm-menu-divider" />
                                  <button
                                    className="sm-menu-item--danger"
                                    onClick={() => openModal('delete', stop)}
                                  >
                                    Delete Stop
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="sm-table-footer">
            Showing <strong>{filtered.length}</strong> of{' '}
            <strong>{stops.length}</strong> stops
          </div>
        </>
      )}

      {/* Portaled Modals */}
      {modalType === 'add' && renderFormModal('add')}
      {modalType === 'edit' && renderFormModal('edit')}
      {modalType === 'delete' && renderDeleteModal()}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  variant?: 'pickup' | 'dropoff' | 'both';
}> = ({ label, value, variant }) => (
  <div className={`sm-stat-card${variant ? ` sm-stat-card--${variant}` : ''}`}>
    <span className="sm-stat-label">{label}</span>
    <span className="sm-stat-value">{value}</span>
  </div>
);

const StatusBadge: React.FC<{ status: StopStatus }> = ({ status }) => (
  <span className={`sm-badge sm-badge--${status.toLowerCase()}`}>{status}</span>
);

const TypeBadge: React.FC<{ type: StopType }> = ({ type }) => (
  <span className={`sm-type-badge sm-type-badge--${type.toLowerCase()}`}>{type}</span>
);

const EmptyState: React.FC = () => (
  <div className="sm-empty">
    <p className="sm-empty-title">No stops found</p>
    <p className="sm-empty-sub">Try adjusting your search or filters.</p>
  </div>
);

const ModalHeader: React.FC<{
  title: string;
  sub: string;
  onClose: () => void;
  badge?: React.ReactNode;
}> = ({ title, sub, onClose, badge }) => (
  <div className="sm-modal-header">
    <div>
      <h2 className="sm-modal-title">{title}</h2>
      <p className="sm-modal-sub">{sub}</p>
    </div>
    <div className="sm-modal-header-actions">
      {badge}
      <button className="sm-modal-close" onClick={onClose} aria-label="Close modal">
        <CloseIcon />
      </button>
    </div>
  </div>
);

const SMInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder, error, required }) => (
  <div className="sm-form-field">
    <label className="sm-form-label">
      {label}
      {required && <span className="sm-required">*</span>}
    </label>
    <input
      type={type}
      className={`sm-form-input${error ? ' sm-form-input--error' : ''}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
    {error && <span className="sm-form-error">{error}</span>}
  </div>
);

const SMSelect: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[] | { value: string; label: string }[];
  error?: string;
  required?: boolean;
}> = ({ label, value, onChange, options, error, required }) => (
  <div className="sm-form-field">
    <label className="sm-form-label">
      {label}
      {required && <span className="sm-required">*</span>}
    </label>
    <select
      className={`sm-form-select${error ? ' sm-form-input--error' : ''}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">Select {label}</option>
      {options.map(opt => {
        if (typeof opt === 'string') {
          return <option key={opt} value={opt}>{opt}</option>;
        } else {
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        }
      })}
    </select>
    {error && <span className="sm-form-error">{error}</span>}
  </div>
);

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon: React.FC = () => (
  <svg className="sm-icon-search" width="15" height="15" viewBox="0 0 24 24"
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

const DotsIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const ArrowUpIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ArrowDownIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const WarnIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default StopsManagement;
