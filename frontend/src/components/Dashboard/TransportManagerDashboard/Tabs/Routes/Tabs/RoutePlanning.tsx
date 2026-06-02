import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import type { RoleSection } from '../../../../dashboard.types';
import { fleetApi, routeApi, usersApi, type RouteRecord } from '../../../../../../lib/api';
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
  response?: { status?: number; data?: { message?: string } };
};

const isApiError = (err: unknown): err is ApiError =>
  typeof err === 'object' && err !== null;

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
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [plates, setPlates] = useState<NumberPlate[]>([]);
  const [drivers, setDrivers] = useState<StaffMember[]>([]);
  const [assistants, setAssistants] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RouteStatus | 'All'>('All');

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  const [form, setForm] = useState<RouteFormData>({
    routeName: '',
    description: '',
    vehiclePlate: '',
    assignedDriver: '',
    assignedAssistant: '',
    status: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [assignForm, setAssignForm] = useState<AssignFormData>({
    assignedDriver: '',
    assignedAssistant: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isMounted = useRef(true);
  const fetchDone = useRef(false);

  // ─── Fetch Data from API ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [routesResponse, platesData, staffResponse] = await Promise.all([
        routeApi.getRoutes(),
        fleetApi.getNumberPlates(),
        usersApi.getUsers(),
      ]);
      if (!isMounted.current) return;
      
      const routesData = routesResponse.data?.routes || [];
      const staffData = staffResponse.data?.users || [];

      if (Array.isArray(routesData)) setRoutes(routesData);
      if (Array.isArray(platesData)) setPlates(platesData);
      
      // Separate drivers and assistants
      const driverList = staffData.filter((s: StaffMember) => s.role === 'Driver');
      const assistantList = staffData.filter((s: StaffMember) => s.role === 'Bus Assistant');
      if (driverList.length) setDrivers(driverList);
      if (assistantList.length) setAssistants(assistantList);
      
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
        (r.vehiclePlate ?? '').toLowerCase().includes(q) ||
        (r.assignedDriver ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [routes, searchTerm, statusFilter]);

  // ─── Modal Helpers ────────────────────────────────────────────────────────

  const openModal = (type: ModalType, route?: RouteRecord) => {
    setSelectedRoute(route ?? null);
    setModalType(type);
    setFormErrors({});
    setActiveMenu(null);
    document.body.style.overflow = 'hidden';

    if (type === 'create') {
      setForm({
        routeName: '',
        description: '',
        vehiclePlate: '',
        assignedDriver: '',
        assignedAssistant: '',
        status: '',
      });
    } else if (type === 'edit' && route) {
      setForm({
        routeName: route.routeName,
        description: route.description ?? '',
        vehiclePlate: route.vehiclePlate ?? '',
        assignedDriver: route.assignedDriver ?? '',
        assignedAssistant: route.assignedAssistant ?? '',
        status: route.status,
      });
    } else if (type === 'assign' && route) {
      setAssignForm({
        assignedDriver: route.assignedDriver ?? '',
        assignedAssistant: route.assignedAssistant ?? '',
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
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.status) e.status = 'Status is required';
    if (!form.vehiclePlate) e.vehiclePlate = 'Assigned vehicle is required';
    if (!form.assignedDriver) e.assignedDriver = 'Assigned driver is required';
    if (!form.assignedAssistant) e.assignedAssistant = 'Assigned bus assistant is required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit Handlers (Real API Calls) ─────────────────────────────────────

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const payload = {
        routeName: form.routeName.trim(),
        description: form.description.trim(),
        vehiclePlate: form.vehiclePlate,
        assignedDriver: form.assignedDriver,
        assignedAssistant: form.assignedAssistant,
        status: form.status as RouteStatus,
      };
      
      const createdResponse = await routeApi.createRoute(payload);
      const created = createdResponse.data?.route;
      if (created) {
        setRoutes(prev => [created, ...prev]);
      }
      closeModal();
    } catch (err) {
      if (isApiError(err)) {
        setApiError(err.response?.data?.message || 'Failed to create route');
      } else {
        setApiError('Failed to create route. Please try again.');
      }
      console.error('Create error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!validateForm() || !selectedRoute) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const payload = {
        routeName: form.routeName.trim(),
        description: form.description.trim(),
        vehiclePlate: form.vehiclePlate,
        assignedDriver: form.assignedDriver,
        assignedAssistant: form.assignedAssistant,
        status: form.status as RouteStatus,
      };
      
      const updatedResponse = await routeApi.updateRoute(selectedRoute.id, payload);
      const updated = updatedResponse.data?.route;
      if (updated) {
        setRoutes(prev => prev.map(r => r.id === selectedRoute.id ? updated : r));
      }
      closeModal();
    } catch (err) {
      if (isApiError(err)) {
        setApiError(err.response?.data?.message || 'Failed to update route');
      } else {
        setApiError('Failed to update route. Please try again.');
      }
      console.error('Update error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedRoute) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const payload = {
        assignedDriver: assignForm.assignedDriver,
        assignedAssistant: assignForm.assignedAssistant,
      };
      
      const updatedResponse = await routeApi.updateRoute(selectedRoute.id, payload);
      const updated = updatedResponse.data?.route;
      if (updated) {
        setRoutes(prev => prev.map(r => r.id === selectedRoute.id ? updated : r));
      }
      closeModal();
    } catch (err) {
      if (isApiError(err)) {
        setApiError(err.response?.data?.message || 'Failed to assign staff');
      } else {
        setApiError('Failed to assign staff. Please try again.');
      }
      console.error('Assign error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedRoute) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const updatedResponse = await routeApi.updateRouteStatus(selectedRoute.id, 'Inactive');
      const updated = updatedResponse.data?.route;
      if (updated) {
        setRoutes(prev => prev.map(r => r.id === selectedRoute.id ? updated : r));
      }
      closeModal();
    } catch (err) {
      if (isApiError(err)) {
        setApiError(err.response?.data?.message || 'Failed to deactivate route');
      } else {
        setApiError('Failed to deactivate route. Please try again.');
      }
      console.error('Deactivate error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRoute) return;
    setSubmitting(true);
    setApiError(null);
    try {
      await routeApi.deleteRoute(selectedRoute.id);
      setRoutes(prev => prev.filter(r => r.id !== selectedRoute.id));
      closeModal();
    } catch (err) {
      if (isApiError(err)) {
        setApiError(err.response?.data?.message || 'Failed to delete route');
      } else {
        setApiError('Failed to delete route. Please try again.');
      }
      console.error('Delete error:', err);
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
                <RPInput
                  label="Description"
                  value={form.description}
                  onChange={patchForm('description')}
                  placeholder="Brief description of this route's coverage area…"
                  error={formErrors.description}
                  required
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
                error={formErrors.vehiclePlate}
                required
              />
              <RPSelect
                label="Assigned Driver"
                value={form.assignedDriver}
                onChange={patchForm('assignedDriver')}
                options={drivers.map(fullName)}
                error={formErrors.assignedDriver}
                required
              />
              <RPSelect
                label="Bus Assistant"
                value={form.assignedAssistant}
                onChange={patchForm('assignedAssistant')}
                options={assistants.map(fullName)}
                error={formErrors.assignedAssistant}
                required
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
            <div className="rp-assign-spacer">
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

      {/* Loading State */}
      {loading && routes.length === 0 ? (
        <div className="rp-loading">Loading routes...</div>
      ) : (
        <>
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
            {filtered.length === 0 ? (
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
        </>
      )}

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
    <div className="rp-modal-header-actions">
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