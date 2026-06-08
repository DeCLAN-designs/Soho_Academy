import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import type { RoleSection } from '../../../../dashboard.types';
import './RoutePlanning.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteStatus = 'Active' | 'Inactive' | 'Draft';
type ModalType =
  | 'create'
  | 'view'
  | 'edit'
  | 'assign'
  | 'deactivate'
  | 'delete'
  | null;

interface Route {
  id: number;
  routeId: string;
  routeName: string;
  description: string;
  vehiclePlate: string;
  vehicleModel: string;
  assignedDriver: string;
  assignedAssistant: string;
  totalStops: number;
  status: RouteStatus;
  createdAt: string;
  updatedAt: string;
}

interface RouteFormData {
  routeName: string;
  description: string;
  vehiclePlate: string;
  assignedDriver: string;
  assignedAssistant: string;
  status: RouteStatus | '';
}

interface AssignFormData {
  assignedDriver: string;
  assignedAssistant: string;
}

type FormErrors = Partial<Record<keyof RouteFormData, string>>;

interface RoutePlanningProps {
  section: RoleSection;
}

interface NumberPlate {
  id: number;
  plate_number: string;
  model?: string;
  status: 'active' | 'inactive';
}

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

type ApiError = {
  response?: { status?: number };
};

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
    }
    return Promise.reject(error);
  }
);

const apiService = {
  getRoutes: async (): Promise<Route[]> => {
    const res = await axiosInstance.get('/routes');
    return res.data?.data?.routes || res.data || [];
  },
  createRoute: async (data: Partial<Route>): Promise<Route> => {
    const res = await axiosInstance.post('/routes', data);
    return res.data?.data?.route || res.data;
  },
  updateRoute: async (id: number, data: Partial<Route>): Promise<Route> => {
    const res = await axiosInstance.put(`/routes/${id}`, data);
    return res.data?.data?.route || res.data;
  },
  updateRouteStatus: async (id: number, status: RouteStatus): Promise<Route> => {
    const res = await axiosInstance.patch(`/routes/${id}/status`, { status });
    return res.data?.data?.route || res.data;
  },
  deleteRoute: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/routes/${id}`);
  },
  getNumberPlates: async (): Promise<NumberPlate[]> => {
    const res = await axiosInstance.get('/number-plates');
    return Array.isArray(res.data) ? res.data : [];
  },
  getStaff: async (): Promise<StaffMember[]> => {
    const res = await axiosInstance.get('/users');
    return res.data?.data?.users || res.data || [];
  },
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ROUTES: Route[] = [
  { id: 1, routeId: 'RT-001', routeName: 'Route 1 — Westlands', description: 'Morning and afternoon pickup covering Westlands, Parklands and Highridge areas.', vehiclePlate: 'KBZ 123A', vehicleModel: 'Toyota Coaster', assignedDriver: 'James Mwangi', assignedAssistant: 'Grace Otieno', totalStops: 8, status: 'Active', createdAt: '2024-09-01', updatedAt: '2025-03-10' },
  { id: 2, routeId: 'RT-002', routeName: 'Route 2 — Kileleshwa', description: 'Kileleshwa, Kilimani and Upper Hill route.', vehiclePlate: 'KDA 789C', vehicleModel: 'Isuzu FRR', assignedDriver: 'Samuel Odhiambo', assignedAssistant: 'Mary Wanjiku', totalStops: 10, status: 'Active', createdAt: '2024-09-01', updatedAt: '2025-03-15' },
  { id: 3, routeId: 'RT-003', routeName: 'Route 3 — Karen', description: 'Karen, Langata and Hardy route.', vehiclePlate: 'KCB 456B', vehicleModel: 'Toyota HiAce', assignedDriver: 'Peter Kamau', assignedAssistant: '', totalStops: 6, status: 'Active', createdAt: '2024-09-01', updatedAt: '2025-02-20' },
  { id: 4, routeId: 'RT-004', routeName: 'Route 4 — Langata', description: 'South Langata, Otiende and Mugumoini estates.', vehiclePlate: 'KCF 567E', vehicleModel: 'Toyota Coaster', assignedDriver: 'David Njoroge', assignedAssistant: 'Agnes Muthoni', totalStops: 9, status: 'Active', createdAt: '2024-09-01', updatedAt: '2025-04-05' },
  { id: 5, routeId: 'RT-005', routeName: 'Route 5 — Ruaka', description: 'Ruaka, Banana and Kiwanja areas north of Nairobi.', vehiclePlate: 'KCD 321G', vehicleModel: 'Rosa Bus', assignedDriver: 'John Otieno', assignedAssistant: 'Esther Achieng', totalStops: 7, status: 'Active', createdAt: '2024-09-01', updatedAt: '2025-04-10' },
  { id: 6, routeId: 'RT-006', routeName: 'Route 6 — Ngong Road', description: 'Ngong Road corridor — Prestige, Lavington and Valley Arcade.', vehiclePlate: '', vehicleModel: '', assignedDriver: '', assignedAssistant: '', totalStops: 0, status: 'Draft', createdAt: '2025-04-15', updatedAt: '2025-04-15' },
  { id: 7, routeId: 'RT-007', routeName: 'Route 7 — Kasarani', description: 'Kasarani, Mwiki and Roysambu corridor.', vehiclePlate: 'KBN 890F', vehicleModel: 'Isuzu FRR', assignedDriver: 'Robert Waweru', assignedAssistant: 'Catherine Njeri', totalStops: 11, status: 'Inactive', createdAt: '2024-06-01', updatedAt: '2025-01-20' },
];

const MOCK_PLATES: NumberPlate[] = [
  { id: 1, plate_number: 'KBZ 123A', model: 'Toyota Coaster', status: 'active' },
  { id: 2, plate_number: 'KCB 456B', model: 'Toyota HiAce', status: 'active' },
  { id: 3, plate_number: 'KDA 789C', model: 'Isuzu FRR', status: 'active' },
  { id: 4, plate_number: 'KBH 234D', model: 'Toyota HiAce', status: 'active' },
  { id: 5, plate_number: 'KCF 567E', model: 'Toyota Coaster', status: 'active' },
  { id: 6, plate_number: 'KBN 890F', model: 'Isuzu FRR', status: 'inactive' },
  { id: 7, plate_number: 'KCD 321G', model: 'Rosa Bus', status: 'active' },
];

const MOCK_DRIVERS: StaffMember[] = [
  { id: 1, firstName: 'James', lastName: 'Mwangi', role: 'driver' },
  { id: 2, firstName: 'Peter', lastName: 'Kamau', role: 'driver' },
  { id: 3, firstName: 'Samuel', lastName: 'Odhiambo', role: 'driver' },
  { id: 4, firstName: 'David', lastName: 'Njoroge', role: 'driver' },
  { id: 5, firstName: 'John', lastName: 'Otieno', role: 'driver' },
  { id: 6, firstName: 'Robert', lastName: 'Waweru', role: 'driver' },
  { id: 7, firstName: 'Michael', lastName: 'Kiprotich', role: 'driver' },
];

const MOCK_ASSISTANTS: StaffMember[] = [
  { id: 10, firstName: 'Grace', lastName: 'Otieno', role: 'bus_assistant' },
  { id: 11, firstName: 'Mary', lastName: 'Wanjiku', role: 'bus_assistant' },
  { id: 12, firstName: 'Agnes', lastName: 'Muthoni', role: 'bus_assistant' },
  { id: 13, firstName: 'Esther', lastName: 'Achieng', role: 'bus_assistant' },
  { id: 14, firstName: 'Catherine', lastName: 'Njeri', role: 'bus_assistant' },
  { id: 15, firstName: 'Diana', lastName: 'Chebet', role: 'bus_assistant' },
];

const EMPTY_FORM: RouteFormData = {
  routeName: '',
  description: '',
  vehiclePlate: '',
  assignedDriver: '',
  assignedAssistant: '',
  status: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  d && d !== '—'
    ? new Date(d).toLocaleDateString('en-KE', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    : '—';

const fullName = (m: StaffMember) => `${m.firstName} ${m.lastName}`;

// ─── Main Component ───────────────────────────────────────────────────────────

const RoutePlanning: React.FC<RoutePlanningProps> = ({ section }) => {
  const [routes, setRoutes] = useState<Route[]>(MOCK_ROUTES);
  const [plates, setPlates] = useState<NumberPlate[]>(MOCK_PLATES);
  const [drivers, setDrivers] = useState<StaffMember[]>(MOCK_DRIVERS);
  const [assistants, setAssistants] = useState<StaffMember[]>(MOCK_ASSISTANTS);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RouteStatus | 'All'>('All');

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  const [form, setForm] = useState<RouteFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [assignForm, setAssignForm] = useState<AssignFormData>({
    assignedDriver: '',
    assignedAssistant: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isMounted = useRef(true);
  const fetchDone = useRef(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [routesData, platesData, staffData] = await Promise.all([
        apiService.getRoutes(),
        apiService.getNumberPlates(),
        apiService.getStaff(),
      ]);
      if (!isMounted.current) return;
      if (routesData.length) setRoutes(routesData);
      if (platesData.length) setPlates(platesData);
      const driverList = staffData.filter(s => s.role === 'driver');
      const assistantList = staffData.filter(s => s.role === 'bus_assistant');
      if (driverList.length) setDrivers(driverList);
      if (assistantList.length) setAssistants(assistantList);
    } catch (err) {
      if (!isMounted.current) return;
      if (isApiError(err) && err.response?.status === 401) {
        setApiError('Session expired. Please log in again.');
      }
      // Fall through to mock data on error
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
      if (!(e.target as HTMLElement).closest('.rp-actions')) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: routes.length,
    active: routes.filter(r => r.status === 'Active').length,
    inactive: routes.filter(r => r.status === 'Inactive').length,
    draft: routes.filter(r => r.status === 'Draft').length,
  }), [routes]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return routes.filter(r => {
      const matchQ =
        !q ||
        r.routeName.toLowerCase().includes(q) ||
        r.routeId.toLowerCase().includes(q) ||
        r.vehiclePlate.toLowerCase().includes(q) ||
        r.assignedDriver.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [routes, searchTerm, statusFilter]);

  // ─── Modal Helpers ────────────────────────────────────────────────────────

  const openModal = (type: ModalType, route?: Route) => {
    setSelectedRoute(route ?? null);
    setModalType(type);
    setFormErrors({});
    setActiveMenu(null);
    document.body.style.overflow = 'hidden';

    if (type === 'create') {
      setForm(EMPTY_FORM);
    } else if (type === 'edit' && route) {
      setForm({
        routeName: route.routeName,
        description: route.description,
        vehiclePlate: route.vehiclePlate,
        assignedDriver: route.assignedDriver,
        assignedAssistant: route.assignedAssistant,
        status: route.status,
      });
    } else if (type === 'assign' && route) {
      setAssignForm({
        assignedDriver: route.assignedDriver,
        assignedAssistant: route.assignedAssistant,
      });
    }
  };

  const closeModal = useCallback(() => {
    setModalType(null);
    setSelectedRoute(null);
    setFormErrors({});
    document.body.style.overflow = '';
  }, []);

  // ─── Form ─────────────────────────────────────────────────────────────────

  const patchForm = (field: keyof RouteFormData) => (val: string) => {
    setForm(p => ({ ...p, [field]: val }));
    if (formErrors[field]) setFormErrors(p => ({ ...p, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const e: FormErrors = {};
    if (!form.routeName.trim()) e.routeName = 'Route name is required';
    if (!form.status) e.status = 'Status is required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit Handlers ──────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload: Partial<Route> = {
        routeName: form.routeName.trim(),
        description: form.description.trim(),
        vehiclePlate: form.vehiclePlate,
        vehicleModel: plates.find(p => p.plate_number === form.vehiclePlate)?.model || '',
        assignedDriver: form.assignedDriver,
        assignedAssistant: form.assignedAssistant,
        status: form.status as RouteStatus,
        totalStops: 0,
      };
      try {
        const created = await apiService.createRoute(payload);
        setRoutes(p => [created, ...p]);
      } catch {
        const newRoute: Route = {
  ...(payload as Route),
  id: Date.now(),
  routeId: `RT-${String(routes.length + 1).padStart(3, '0')}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
        setRoutes(p => [newRoute, ...p]);
      }
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!validateForm() || !selectedRoute) return;
    setSubmitting(true);
    try {
      const payload: Partial<Route> = {
        routeName: form.routeName.trim(),
        description: form.description.trim(),
        vehiclePlate: form.vehiclePlate,
        vehicleModel: plates.find(p => p.plate_number === form.vehiclePlate)?.model || selectedRoute.vehicleModel,
        assignedDriver: form.assignedDriver,
        assignedAssistant: form.assignedAssistant,
        status: form.status as RouteStatus,
      };
      try {
        const updated = await apiService.updateRoute(selectedRoute.id, payload);
        setRoutes(p => p.map(r => r.id === selectedRoute.id ? updated : r));
      } catch {
        setRoutes(p =>
          p.map(r =>
            r.id === selectedRoute.id
              ? { ...r, ...payload, updatedAt: new Date().toISOString() }
              : r
          )
        );
      }
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedRoute) return;
    setSubmitting(true);
    try {
      const payload = {
        assignedDriver: assignForm.assignedDriver,
        assignedAssistant: assignForm.assignedAssistant,
      };
      try {
        await apiService.updateRoute(selectedRoute.id, payload);
      } catch { /* fall through */ }
      setRoutes(p =>
        p.map(r =>
          r.id === selectedRoute.id
            ? { ...r, ...payload, updatedAt: new Date().toISOString() }
            : r
        )
      );
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedRoute) return;
    setSubmitting(true);
    try {
      try {
        await apiService.updateRouteStatus(selectedRoute.id, 'Inactive');
      } catch { /* fall through */ }
      setRoutes(p =>
        p.map(r =>
          r.id === selectedRoute.id
            ? { ...r, status: 'Inactive', updatedAt: new Date().toISOString() }
            : r
        )
      );
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRoute) return;
    setSubmitting(true);
    try {
      try {
        await apiService.deleteRoute(selectedRoute.id);
      } catch { /* fall through */ }
      setRoutes(p => p.filter(r => r.id !== selectedRoute.id));
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Modals ───────────────────────────────────────────────────────────────

  const renderCreateEditModal = (mode: 'create' | 'edit') => {
    const title = mode === 'create' ? 'Create Route' : 'Edit Route';
    const subtitle =
      mode === 'create'
        ? 'Add a new transport route to the system'
        : `Editing — ${selectedRoute?.routeId} · ${selectedRoute?.routeName}`;

    return ReactDOM.createPortal(
      <div className="rp-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
        <div className="rp-modal rp-modal--lg" onClick={e => e.stopPropagation()}>
          <ModalHeader title={title} sub={subtitle} onClose={closeModal} />
          <div className="rp-modal-body">
            <div className="rp-form-grid">
              <RPInput
                label="Route Name"
                value={form.routeName}
                onChange={patchForm('routeName')}
                placeholder="e.g. Route 1 — Westlands"
                error={formErrors.routeName}
                required
              />
              <RPSelect
                label="Status"
                value={form.status}
                onChange={patchForm('status')}
                options={['Active', 'Inactive', 'Draft']}
                error={formErrors.status}
                required
              />
              <div className="rp-form-field rp-form-field--full">
                <label className="rp-form-label">Description</label>
                <textarea
                  className="rp-form-textarea"
                  rows={3}
                  placeholder="Brief description of this route's coverage area…"
                  value={form.description}
                  onChange={e => patchForm('description')(e.target.value)}
                />
              </div>
              <RPSelect
                label="Assigned Vehicle"
                value={form.vehiclePlate}
                onChange={patchForm('vehiclePlate')}
                options={plates
                  .filter(p => p.status === 'active')
                  .map(p => p.plate_number + (p.model ? ` — ${p.model}` : ''))}
                valueMap={plates
                  .filter(p => p.status === 'active')
                  .reduce<Record<string, string>>((acc, p) => {
                    acc[p.plate_number + (p.model ? ` — ${p.model}` : '')] = p.plate_number;
                    return acc;
                  }, {})}
              />
              <RPSelect
                label="Assigned Driver"
                value={form.assignedDriver}
                onChange={patchForm('assignedDriver')}
                options={drivers.map(fullName)}
              />
              <RPSelect
                label="Bus Assistant"
                value={form.assignedAssistant}
                onChange={patchForm('assignedAssistant')}
                options={assistants.map(fullName)}
              />
            </div>
          </div>
          <div className="rp-modal-footer">
            <button className="rp-btn rp-btn--ghost" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="rp-btn rp-btn--primary"
              onClick={mode === 'create' ? handleCreate : handleEdit}
              disabled={submitting}
            >
              {submitting
                ? 'Saving…'
                : mode === 'create'
                  ? 'Create Route'
                  : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderViewModal = () => {
    if (!selectedRoute) return null;
    const r = selectedRoute;
    return ReactDOM.createPortal(
      <div className="rp-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
        <div className="rp-modal rp-modal--md" onClick={e => e.stopPropagation()}>
          <ModalHeader
            title={r.routeName}
            sub={`${r.routeId} · Last updated ${fmtDate(r.updatedAt)}`}
            onClose={closeModal}
            badge={<StatusBadge status={r.status} />}
          />
          <div className="rp-modal-body">
            <section className="rp-detail-section">
              <h3 className="rp-detail-section-title">Route Details</h3>
              <div className="rp-detail-grid">
                <DetailItem label="Route ID" value={r.routeId} />
                <DetailItem label="Status" value={r.status} />
                <DetailItem label="Total Stops" value={String(r.totalStops)} />
                <DetailItem label="Created" value={fmtDate(r.createdAt)} />
                <DetailItem label="Description" value={r.description || '—'} span />
              </div>
            </section>

            <section className="rp-detail-section">
              <h3 className="rp-detail-section-title">Vehicle</h3>
              <div className="rp-detail-grid">
                <DetailItem label="Plate Number" value={r.vehiclePlate || '—'} />
                <DetailItem label="Model" value={r.vehicleModel || '—'} />
              </div>
            </section>

            <section className="rp-detail-section">
              <h3 className="rp-detail-section-title">Staff Assignments</h3>
              <div className="rp-detail-grid">
                <DetailItem label="Driver" value={r.assignedDriver || '—'} />
                <DetailItem label="Bus Assistant" value={r.assignedAssistant || '—'} />
              </div>
            </section>
          </div>
          <div className="rp-modal-footer">
            <button className="rp-btn rp-btn--ghost" onClick={closeModal}>
              Close
            </button>
            <button
              className="rp-btn rp-btn--secondary"
              onClick={() => openModal('assign', r)}
            >
              Assign Staff
            </button>
            <button
              className="rp-btn rp-btn--primary"
              onClick={() => openModal('edit', r)}
            >
              Edit Route
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderAssignModal = () => {
    if (!selectedRoute) return null;
    const r = selectedRoute;
    return ReactDOM.createPortal(
      <div className="rp-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
        <div className="rp-modal rp-modal--sm" onClick={e => e.stopPropagation()}>
          <ModalHeader
            title="Assign Staff"
            sub={`${r.routeId} · ${r.routeName}`}
            onClose={closeModal}
          />
          <div className="rp-modal-body">
            {(r.assignedDriver || r.assignedAssistant) && (
              <div className="rp-assign-current">
                <p className="rp-assign-current-label">Currently Assigned</p>
                {r.assignedDriver && (
                  <div className="rp-assign-current-row">
                    <span className="rp-assign-current-role">Driver</span>
                    <span className="rp-assign-current-name">{r.assignedDriver}</span>
                  </div>
                )}
                {r.assignedAssistant && (
                  <div className="rp-assign-current-row">
                    <span className="rp-assign-current-role">Assistant</span>
                    <span className="rp-assign-current-name">{r.assignedAssistant}</span>
                  </div>
                )}
              </div>
            )}
            <RPSelect
              label="Driver"
              value={assignForm.assignedDriver}
              onChange={v => setAssignForm(p => ({ ...p, assignedDriver: v }))}
              options={['— Unassigned —', ...drivers.map(fullName)]}
            />
            <div style={{ marginTop: 16 }}>
              <RPSelect
                label="Bus Assistant"
                value={assignForm.assignedAssistant}
                onChange={v => setAssignForm(p => ({ ...p, assignedAssistant: v }))}
                options={['— Unassigned —', ...assistants.map(fullName)]}
              />
            </div>
          </div>
          <div className="rp-modal-footer">
            <button className="rp-btn rp-btn--ghost" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="rp-btn rp-btn--primary"
              onClick={handleAssign}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save Assignment'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderConfirmModal = (mode: 'deactivate' | 'delete') => {
    if (!selectedRoute) return null;
    const isDelete = mode === 'delete';
    return ReactDOM.createPortal(
      <div className="rp-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
        <div className="rp-modal rp-modal--xs" onClick={e => e.stopPropagation()}>
          <ModalHeader
            title={isDelete ? 'Delete Route' : 'Deactivate Route'}
            sub={`${selectedRoute.routeId} · ${selectedRoute.routeName}`}
            onClose={closeModal}
          />
          <div className="rp-modal-body">
            <p className="rp-confirm-text">
              {isDelete
                ? `Are you sure you want to permanently delete ${selectedRoute.routeName}? This action cannot be undone and will remove all associated stop assignments.`
                : `Are you sure you want to deactivate ${selectedRoute.routeName}? It will be removed from active scheduling until reactivated.`}
            </p>
          </div>
          <div className="rp-modal-footer">
            <button className="rp-btn rp-btn--ghost" onClick={closeModal}>
              Cancel
            </button>
            <button
              className={`rp-btn ${isDelete ? 'rp-btn--danger' : 'rp-btn--warning'}`}
              onClick={isDelete ? handleDelete : handleDeactivate}
              disabled={submitting}
            >
              {submitting
                ? 'Processing…'
                : isDelete
                  ? 'Delete Route'
                  : 'Deactivate'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="rp-page">

      {/* Page Header */}
      <div className="rp-page-header">
        <div>
          <h1 className="rp-page-title">{section.heading}</h1>
          <p className="rp-page-sub">{section.description}</p>
        </div>
        <button className="rp-btn rp-btn--primary" onClick={() => openModal('create')}>
          + Create Route
        </button>
      </div>

      {/* API Error Banner */}
      {apiError && (
        <div className="rp-error-banner">
          {apiError}
          <button onClick={() => setApiError(null)} className="rp-error-dismiss">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="rp-stats-grid">
        <StatCard label="Total Routes" value={stats.total} />
        <StatCard label="Active" value={stats.active} variant="active" />
        <StatCard label="Inactive" value={stats.inactive} variant="inactive" />
        <StatCard label="Draft" value={stats.draft} variant="draft" />
      </div>

      {/* Toolbar */}
      <div className="rp-toolbar">
        <div className="rp-search-wrap">
          <SearchIcon />
          <input
            className="rp-search"
            placeholder="Search by route name, vehicle or driver…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="rp-search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <select
          className="rp-filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as RouteStatus | 'All')}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {/* Table */}
      <div className="rp-table-wrap">
        {loading ? (
          <div className="rp-loading">Loading routes…</div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="rp-table">
            <thead>
              <tr>
                <th>Route ID</th>
                <th>Route Name</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Assistant</th>
                <th>Stops</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(route => (
                <tr key={route.id}>
                  <td>
                    <span className="rp-id-badge">{route.routeId}</span>
                  </td>
                  <td>
                    <div className="rp-route-cell">
                      <span className="rp-route-name">{route.routeName}</span>
                      {route.description && (
                        <span className="rp-route-desc">{route.description}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {route.vehiclePlate ? (
                      <div className="rp-vehicle-cell">
                        <span className="rp-plate">{route.vehiclePlate}</span>
                        {route.vehicleModel && (
                          <span className="rp-sub">{route.vehicleModel}</span>
                        )}
                      </div>
                    ) : (
                      <span className="rp-unassigned">—</span>
                    )}
                  </td>
                  <td>
                    {route.assignedDriver || (
                      <span className="rp-unassigned">Unassigned</span>
                    )}
                  </td>
                  <td>
                    {route.assignedAssistant || (
                      <span className="rp-unassigned">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className="rp-stops-count">{route.totalStops}</span>
                  </td>
                  <td>
                    <StatusBadge status={route.status} />
                  </td>
                  <td>
                    <div className="rp-actions">
                      <button
                        className="rp-action-trigger"
                        aria-label="Row actions"
                        onClick={() =>
                          setActiveMenu(activeMenu === route.id ? null : route.id)
                        }
                      >
                        <DotsIcon />
                      </button>
                      {activeMenu === route.id && (
                        <div className="rp-action-menu">
                          <button onClick={() => openModal('view', route)}>
                            View Details
                          </button>
                          <button onClick={() => openModal('edit', route)}>
                            Edit Route
                          </button>
                          <button onClick={() => openModal('assign', route)}>
                            Assign Staff
                          </button>
                          <div className="rp-menu-divider" />
                          {route.status !== 'Inactive' && (
                            <button
                              className="rp-menu-item--warning"
                              onClick={() => openModal('deactivate', route)}
                            >
                              Deactivate
                            </button>
                          )}
                          <button
                            className="rp-menu-item--danger"
                            onClick={() => openModal('delete', route)}
                          >
                            Delete Route
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Footer */}
      <div className="rp-table-footer">
        Showing <strong>{filtered.length}</strong> of{' '}
        <strong>{routes.length}</strong> routes
      </div>

      {/* Portaled Modals */}
      {modalType === 'create' && renderCreateEditModal('create')}
      {modalType === 'edit' && renderCreateEditModal('edit')}
      {modalType === 'view' && renderViewModal()}
      {modalType === 'assign' && renderAssignModal()}
      {modalType === 'deactivate' && renderConfirmModal('deactivate')}
      {modalType === 'delete' && renderConfirmModal('delete')}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  variant?: 'active' | 'inactive' | 'draft';
}> = ({ label, value, variant }) => (
  <div className={`rp-stat-card${variant ? ` rp-stat-card--${variant}` : ''}`}>
    <span className="rp-stat-label">{label}</span>
    <span className="rp-stat-value">{value}</span>
  </div>
);

const StatusBadge: React.FC<{ status: RouteStatus }> = ({ status }) => (
  <span className={`rp-badge rp-badge--${status.toLowerCase()}`}>{status}</span>
);

const EmptyState: React.FC = () => (
  <div className="rp-empty">
    <p className="rp-empty-title">No routes found</p>
    <p className="rp-empty-sub">Try adjusting your search or filter.</p>
  </div>
);

const ModalHeader: React.FC<{
  title: string;
  sub: string;
  onClose: () => void;
  badge?: React.ReactNode;
}> = ({ title, sub, onClose, badge }) => (
  <div className="rp-modal-header">
    <div>
      <h2 className="rp-modal-title">{title}</h2>
      <p className="rp-modal-sub">{sub}</p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {badge}
      <button className="rp-modal-close" onClick={onClose} aria-label="Close modal">
        <CloseIcon />
      </button>
    </div>
  </div>
);

const DetailItem: React.FC<{ label: string; value: string; span?: boolean }> = ({
  label, value, span,
}) => (
  <div className={`rp-detail-item${span ? ' rp-detail-item--span' : ''}`}>
    <dt className="rp-detail-label">{label}</dt>
    <dd className="rp-detail-value">{value}</dd>
  </div>
);

const RPInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder, error, required }) => (
  <div className="rp-form-field">
    <label className="rp-form-label">
      {label}
      {required && <span className="rp-required">*</span>}
    </label>
    <input
      type={type}
      className={`rp-form-input${error ? ' rp-form-input--error' : ''}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
    {error && <span className="rp-form-error">{error}</span>}
  </div>
);

const RPSelect: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  error?: string;
  required?: boolean;
  valueMap?: Record<string, string>;
}> = ({ label, value, onChange, options, error, required, valueMap }) => (
  <div className="rp-form-field">
    <label className="rp-form-label">
      {label}
      {required && <span className="rp-required">*</span>}
    </label>
    <select
      className={`rp-form-select${error ? ' rp-form-input--error' : ''}`}
      value={value}
      onChange={e => {
        const raw = e.target.value;
        onChange(valueMap ? (valueMap[raw] ?? raw) : raw);
      }}
    >
      <option value="">Select {label}</option>
      {options.map(o => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
    {error && <span className="rp-form-error">{error}</span>}
  </div>
);

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon: React.FC = () => (
  <svg
    className="rp-icon-search"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const DotsIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

export default RoutePlanning;