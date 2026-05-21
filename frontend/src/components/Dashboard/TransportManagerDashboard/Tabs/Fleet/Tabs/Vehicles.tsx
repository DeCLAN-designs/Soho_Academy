import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import './Vehicles.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type VehicleType = 'School Bus' | 'Mini Van' | 'Coaster';
type VehicleStatus = 'Active' | 'Maintenance' | 'Inactive';
type FuelType = 'Diesel' | 'Petrol' | 'Electric';
type ModalType =
  | 'register'
  | 'view'
  | 'edit'
  | 'assign'
  | 'history'
  | 'deactivate'
  | 'delete'
  | null;

// API response types
interface NumberPlate {
  id: number;
  plate_number: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  numberPlate: string | null;
  role: string;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  type: VehicleType;
  year: number;
  capacity: number;
  color: string;
  fuelType: FuelType;
  status: VehicleStatus;
  assignedDriver: string;
  assignedAssistant: string;
  assignedRoute: string;
  lastService: string;
  mileage: number;
}

interface VehicleFormData {
  plateNumber: string;
  model: string;
  type: VehicleType | '';
  year: string;
  capacity: string;
  color: string;
  fuelType: FuelType | '';
  status: VehicleStatus | '';
}

type FormErrors = Partial<Record<keyof VehicleFormData, string>>;

interface HistoryEntry {
  id: string;
  date: string;
  type: 'Service' | 'Assignment' | 'Status Change' | 'Registration' | 'Document';
  description: string;
  performedBy: string;
}

type VehicleDetailsPayload = Partial<Omit<Vehicle, 'id' | 'plateNumber'>>;
type PersistableVehicleDetails = Omit<Vehicle, 'id' | 'plateNumber'>;

// ─── API Service ──────────────────────────────────────────────────────────────

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const toNumberPlateStatus = (status: VehicleStatus): NumberPlate['status'] =>
  status === 'Inactive' ? 'inactive' : 'active';

const createVehicleDetailsPayload = (vehicle: Vehicle): PersistableVehicleDetails => ({
  model: vehicle.model,
  type: vehicle.type,
  year: vehicle.year,
  capacity: vehicle.capacity,
  color: vehicle.color,
  fuelType: vehicle.fuelType,
  status: vehicle.status,
  assignedDriver: vehicle.assignedDriver,
  assignedAssistant: vehicle.assignedAssistant,
  assignedRoute: vehicle.assignedRoute,
  lastService: vehicle.lastService,
  mileage: vehicle.mileage,
});

const apiService = {
  // Number Plates
  getNumberPlates: async (): Promise<NumberPlate[]> => {
    const response = await axios.get(`${API_BASE_URL}/number-plates`);
    return response.data;
  },

  getActiveNumberPlates: async (): Promise<NumberPlate[]> => {
    const response = await axios.get(`${API_BASE_URL}/number-plates/active`);
    return response.data;
  },

  createNumberPlate: async (plateNumber: string): Promise<NumberPlate> => {
    const response = await axios.post(`${API_BASE_URL}/number-plates`, { plate_number: plateNumber });
    return response.data;
  },

  updateNumberPlateStatus: async (id: number, status: 'active' | 'inactive'): Promise<NumberPlate> => {
    const response = await axios.patch(`${API_BASE_URL}/number-plates/${id}`, { status });
    return response.data;
  },

  deleteNumberPlate: async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/number-plates/${id}`);
  },

  // Users (for drivers and assistants)
  getDrivers: async (): Promise<User[]> => {
    const response = await axios.get(`${API_BASE_URL}/users/role/Driver`);
    return response.data;
  },

  getBusAssistants: async (): Promise<User[]> => {
    const response = await axios.get(`${API_BASE_URL}/users/role/Bus%20Assistant`);
    return response.data;
  },

  // Vehicle details (extended info - you may need to create this endpoint)
  getVehicleDetails: async (plateNumber: string): Promise<VehicleDetailsPayload> => {
    const response = await axios.get(`${API_BASE_URL}/vehicles/${plateNumber}`);
    return response.data;
  },

  updateVehicleDetails: async (
    plateNumber: string,
    data: VehicleDetailsPayload,
  ): Promise<VehicleDetailsPayload> => {
    const response = await axios.put(`${API_BASE_URL}/vehicles/${plateNumber}`, data);
    return response.data;
  },
};

// ─── Static Data ──────────────────────────────────────────────────────────────

const EMPTY_FORM: VehicleFormData = {
  plateNumber: '',
  model: '',
  type: '',
  year: '',
  capacity: '',
  color: '',
  fuelType: '',
  status: '',
};

const VEHICLE_HISTORY: Record<string, HistoryEntry[]> = {
  // This could be fetched from a vehicle_history table
};

const DEFAULT_HISTORY: HistoryEntry[] = [
  { id: 'h1', date: '2025-01-15', type: 'Service', description: 'Routine service completed successfully', performedBy: 'AutoCare Garage' },
  { id: 'h2', date: '2024-06-10', type: 'Document', description: 'Insurance policy renewed', performedBy: 'Admin Office' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: VehicleStatus }> = ({ status }) => (
  <span className={`vp-badge vp-badge--${status.toLowerCase().replace(' ', '-')}`}>
    {status}
  </span>
);

const HistoryTypeBadge: React.FC<{ type: HistoryEntry['type'] }> = ({ type }) => (
  <span className={`vp-history-badge vp-history-badge--${type.toLowerCase().replace(' ', '-')}`}>
    {type}
  </span>
);

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label, value, onChange, type = 'text', placeholder, error,
}) => (
  <div className="vp-form-field">
    <label className="vp-form-label">{label}</label>
    <input
      type={type}
      className={`vp-form-input${error ? ' vp-form-input--error' : ''}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
    {error && <span className="vp-form-error">{error}</span>}
  </div>
);

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  error?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label, value, onChange, options, error,
}) => (
  <div className="vp-form-field">
    <label className="vp-form-label">{label}</label>
    <select
      className={`vp-form-select${error ? ' vp-form-input--error' : ''}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">Select {label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    {error && <span className="vp-form-error">{error}</span>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Vehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [numberPlates, setNumberPlates] = useState<NumberPlate[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [assistants, setAssistants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<VehicleType | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'All'>('All');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [assignDriver, setAssignDriver] = useState('');
  const [assignAssistant, setAssignAssistant] = useState('');
  const [activeDashboardCard, setActiveDashboardCard] = useState<string>('list');

  // ─── Fetch Data from API ────────────────────────────────────────────────────

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch number plates
      const plates = await apiService.getNumberPlates();
      setNumberPlates(plates);

      // Fetch drivers and assistants
      const [driversData, assistantsData] = await Promise.all([
        apiService.getDrivers(),
        apiService.getBusAssistants(),
      ]);
      setDrivers(driversData);
      setAssistants(assistantsData);

      const vehiclesData: Vehicle[] = await Promise.all(
        plates.map(async (plate) => {
          let details: VehicleDetailsPayload = {};

          try {
            details = await apiService.getVehicleDetails(plate.plate_number);
          } catch (err) {
            if (!axios.isAxiosError(err) || err.response?.status !== 404) {
              throw err;
            }
          }

          return {
            id: String(plate.id),
            plateNumber: plate.plate_number,
            model: details.model || 'Unknown',
            type: details.type || 'School Bus',
            year: details.year || new Date().getFullYear(),
            capacity: details.capacity || 0,
            color: details.color || '—',
            fuelType: details.fuelType || 'Diesel',
            status: details.status || (plate.status === 'active' ? 'Active' : 'Inactive'),
            assignedDriver: details.assignedDriver || '',
            assignedAssistant: details.assignedAssistant || '',
            assignedRoute: details.assignedRoute || '',
            lastService: details.lastService || '—',
            mileage: details.mileage || 0,
          };
        })
      );
      setVehicles(vehiclesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load vehicles. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Close action dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.vp-actions')) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'Active').length,
    maintenance: vehicles.filter(v => v.status === 'Maintenance').length,
    inactive: vehicles.filter(v => v.status === 'Inactive').length,
  }), [vehicles]);

  const filteredVehicles = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return vehicles.filter(v => {
      const matchSearch =
        !q ||
        v.plateNumber.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.assignedDriver.toLowerCase().includes(q) ||
        v.assignedRoute.toLowerCase().includes(q);
      const matchType = typeFilter === 'All' || v.type === typeFilter;
      const matchStatus = statusFilter === 'All' || v.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [vehicles, searchTerm, typeFilter, statusFilter]);

  // ─── Modal Helpers ────────────────────────────────────────────────────────

  const openModal = (type: ModalType, vehicle?: Vehicle) => {
    setSelectedVehicle(vehicle ?? null);
    setModalType(type);
    setActiveMenu(null);
    setFormErrors({});

    if (type === 'register') {
      setFormData(EMPTY_FORM);
    } else if (type === 'edit' && vehicle) {
      setFormData({
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        type: vehicle.type,
        year: String(vehicle.year),
        capacity: String(vehicle.capacity),
        color: vehicle.color,
        fuelType: vehicle.fuelType,
        status: vehicle.status,
      });
    } else if (type === 'assign' && vehicle) {
      setAssignDriver(vehicle.assignedDriver);
      setAssignAssistant(vehicle.assignedAssistant);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedVehicle(null);
    setFormErrors({});
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const patchForm = (field: keyof VehicleFormData) => (val: string) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.plateNumber.trim()) errors.plateNumber = 'Plate number is required';
    if (!formData.model.trim()) errors.model = 'Model is required';
    if (!formData.type) errors.type = 'Vehicle type is required';
    if (!formData.year) errors.year = 'Year is required';
    else if (Number(formData.year) < 1990 || Number(formData.year) > new Date().getFullYear() + 1)
      errors.year = 'Enter a valid year';
    if (!formData.capacity) errors.capacity = 'Capacity is required';
    else if (Number(formData.capacity) < 1) errors.capacity = 'Must be at least 1';
    if (!formData.fuelType) errors.fuelType = 'Fuel type is required';
    if (!formData.status) errors.status = 'Status is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      const requestedStatus = formData.status as VehicleStatus;
      let newPlate = await apiService.createNumberPlate(formData.plateNumber.toUpperCase().trim());

      if (newPlate.status !== toNumberPlateStatus(requestedStatus)) {
        newPlate = await apiService.updateNumberPlateStatus(newPlate.id, toNumberPlateStatus(requestedStatus));
      }
      
      const newVehicle: Vehicle = {
        id: String(newPlate.id),
        plateNumber: newPlate.plate_number,
        model: formData.model.trim(),
        type: formData.type as VehicleType,
        year: Number(formData.year),
        capacity: Number(formData.capacity),
        color: formData.color.trim() || '—',
        fuelType: formData.fuelType as FuelType,
        status: requestedStatus,
        assignedDriver: '',
        assignedAssistant: '',
        assignedRoute: '',
        lastService: '—',
        mileage: 0,
      };

      await apiService.updateVehicleDetails(
        newVehicle.plateNumber,
        createVehicleDetailsPayload(newVehicle)
      );

      setVehicles(prev => [newVehicle, ...prev]);
      setNumberPlates(prev => [...prev, newPlate]);
      closeModal();
    } catch (err) {
      console.error('Error creating vehicle:', err);
      setFormErrors({ plateNumber: 'Failed to create vehicle. Plate number may already exist.' });
    }
  };

  const handleEditSubmit = async () => {
    if (!validateForm() || !selectedVehicle) return;
    
    try {
      const updatedVehicle: Vehicle = {
        ...selectedVehicle,
        plateNumber: formData.plateNumber.toUpperCase().trim(),
        model: formData.model.trim(),
        type: formData.type as VehicleType,
        year: Number(formData.year),
        capacity: Number(formData.capacity),
        color: formData.color.trim() || selectedVehicle.color,
        fuelType: formData.fuelType as FuelType,
        status: formData.status as VehicleStatus,
      };

      const plate = numberPlates.find(p => p.plate_number === selectedVehicle.plateNumber);
      if (plate) {
        const newStatus = toNumberPlateStatus(updatedVehicle.status);
        if (plate.status !== newStatus) {
          const updatedPlate = await apiService.updateNumberPlateStatus(plate.id, newStatus);
          setNumberPlates(prev =>
            prev.map(existingPlate =>
              existingPlate.id === updatedPlate.id ? updatedPlate : existingPlate
            )
          );
        }
      }

      await apiService.updateVehicleDetails(
        selectedVehicle.plateNumber,
        createVehicleDetailsPayload(updatedVehicle)
      );
      
      setVehicles(prev =>
        prev.map(v =>
          v.id === selectedVehicle.id
            ? updatedVehicle
            : v
        )
      );
      closeModal();
    } catch (err) {
      console.error('Error updating vehicle:', err);
      setFormErrors({ plateNumber: 'Failed to update vehicle.' });
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedVehicle) return;
    const updatedVehicle: Vehicle = {
      ...selectedVehicle,
      assignedDriver: assignDriver,
      assignedAssistant: assignAssistant,
    };

    try {
      await apiService.updateVehicleDetails(
        selectedVehicle.plateNumber,
        createVehicleDetailsPayload(updatedVehicle)
      );

      setVehicles(prev =>
        prev.map(v =>
          v.id === selectedVehicle.id ? updatedVehicle : v
        )
      );
      closeModal();
    } catch (err) {
      console.error('Error assigning staff:', err);
      setError('Failed to save assignment. Please try again.');
    }
  };

  const handleDeactivate = async () => {
    if (!selectedVehicle) return;
    
    try {
      const plate = numberPlates.find(p => p.plate_number === selectedVehicle.plateNumber);
      if (plate) {
        await apiService.updateNumberPlateStatus(plate.id, 'inactive');
      }
      
      setVehicles(prev =>
        prev.map(v =>
          v.id === selectedVehicle.id ? { ...v, status: 'Inactive' } : v
        )
      );
      await apiService.updateVehicleDetails(selectedVehicle.plateNumber, {
        ...createVehicleDetailsPayload(selectedVehicle),
        status: 'Inactive',
      });
      closeModal();
    } catch (err) {
      console.error('Error deactivating vehicle:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedVehicle) return;
    
    try {
      const plate = numberPlates.find(p => p.plate_number === selectedVehicle.plateNumber);
      if (plate) {
        await apiService.deleteNumberPlate(plate.id);
      }
      
      setVehicles(prev => prev.filter(v => v.id !== selectedVehicle.id));
      setNumberPlates(prev => prev.filter(p => p.plate_number !== selectedVehicle.plateNumber));
      closeModal();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
    }
  };

  // ─── Formatters ───────────────────────────────────────────────────────────

  const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr === '—') return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getHistory = (vehicleId: string): HistoryEntry[] =>
    VEHICLE_HISTORY[vehicleId] ?? DEFAULT_HISTORY;

  // ─── Modal: Register / Edit ───────────────────────────────────────────────

  const renderVehicleFormModal = (mode: 'register' | 'edit') => (
    <div className="vp-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
      <div className="vp-modal vp-modal--lg" onClick={e => e.stopPropagation()}>
        <div className="vp-modal-header">
          <div>
            <h2 className="vp-modal-title">
              {mode === 'register' ? 'Register New Vehicle' : 'Edit Vehicle'}
            </h2>
            <p className="vp-modal-subtitle">
              {mode === 'register'
                ? 'Add a new vehicle to the school fleet'
                : `Editing — ${selectedVehicle?.plateNumber}`}
            </p>
          </div>
          <button className="vp-modal-close" onClick={closeModal} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="vp-modal-body">
          <div className="vp-form-grid">
            <FormField label="Plate Number" value={formData.plateNumber} onChange={patchForm('plateNumber')} placeholder="e.g. KBZ 123A" error={formErrors.plateNumber} />
            <FormField label="Vehicle Model" value={formData.model} onChange={patchForm('model')} placeholder="e.g. Toyota Coaster" error={formErrors.model} />
            <SelectField label="Vehicle Type" value={formData.type} onChange={patchForm('type')} options={['School Bus', 'Mini Van', 'Coaster']} error={formErrors.type} />
            <FormField label="Year of Manufacture" value={formData.year} onChange={patchForm('year')} type="number" placeholder="e.g. 2022" error={formErrors.year} />
            <FormField label="Seating Capacity" value={formData.capacity} onChange={patchForm('capacity')} type="number" placeholder="e.g. 42" error={formErrors.capacity} />
            <FormField label="Color" value={formData.color} onChange={patchForm('color')} placeholder="e.g. Yellow" error={formErrors.color} />
            <SelectField label="Fuel Type" value={formData.fuelType} onChange={patchForm('fuelType')} options={['Diesel', 'Petrol', 'Electric']} error={formErrors.fuelType} />
            <SelectField label="Status" value={formData.status} onChange={patchForm('status')} options={['Active', 'Maintenance', 'Inactive']} error={formErrors.status} />
          </div>
        </div>

        <div className="vp-modal-footer">
          <button className="vp-btn vp-btn--ghost" onClick={closeModal}>Cancel</button>
          <button
            className="vp-btn vp-btn--primary"
            onClick={mode === 'register' ? handleRegisterSubmit : handleEditSubmit}
          >
            {mode === 'register' ? 'Register Vehicle' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Modal: View Details ──────────────────────────────────────────────────

  const renderViewModal = () => {
    if (!selectedVehicle) return null;
    const v = selectedVehicle;
    return (
      <div className="vp-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
        <div className="vp-modal vp-modal--md" onClick={e => e.stopPropagation()}>
          <div className="vp-modal-header">
            <div>
              <h2 className="vp-modal-title">{v.plateNumber}</h2>
              <p className="vp-modal-subtitle">{v.model} &middot; {v.type} &middot; {v.year}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StatusBadge status={v.status} />
              <button className="vp-modal-close" onClick={closeModal} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className="vp-modal-body">
            <section className="vp-detail-section">
              <h3 className="vp-detail-section-title">Vehicle Information</h3>
              <dl className="vp-detail-grid">
                <DetailItem label="Plate Number" value={v.plateNumber} />
                <DetailItem label="Model" value={v.model} />
                <DetailItem label="Vehicle Type" value={v.type} />
                <DetailItem label="Year" value={String(v.year)} />
                <DetailItem label="Seating Capacity" value={`${v.capacity} seats`} />
                <DetailItem label="Color" value={v.color} />
                <DetailItem label="Fuel Type" value={v.fuelType} />
                <DetailItem label="Mileage" value={`${v.mileage.toLocaleString()} km`} />
              </dl>
            </section>

            <section className="vp-detail-section">
              <h3 className="vp-detail-section-title">Current Assignments</h3>
              <dl className="vp-detail-grid">
                <DetailItem label="Driver" value={v.assignedDriver || '—'} />
                <DetailItem label="Bus Assistant" value={v.assignedAssistant || '—'} />
                <DetailItem label="Route" value={v.assignedRoute || '—'} span />
              </dl>
            </section>

            <section className="vp-detail-section">
              <h3 className="vp-detail-section-title">Maintenance</h3>
              <dl className="vp-detail-grid">
                <DetailItem label="Last Service" value={formatDate(v.lastService)} />
              </dl>
            </section>
          </div>

          <div className="vp-modal-footer">
            <button className="vp-btn vp-btn--ghost" onClick={closeModal}>Close</button>
            <button className="vp-btn vp-btn--secondary" onClick={() => openModal('assign', v)}>
              Assign Staff
            </button>
            <button className="vp-btn vp-btn--primary" onClick={() => openModal('edit', v)}>
              Edit Vehicle
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Modal: Assign Driver/Assistant ──────────────────────────────────────

  const renderAssignModal = () => {
    if (!selectedVehicle) return null;
    const v = selectedVehicle;
    return (
      <div className="vp-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
        <div className="vp-modal vp-modal--sm" onClick={e => e.stopPropagation()}>
          <div className="vp-modal-header">
            <div>
              <h2 className="vp-modal-title">Assign Staff</h2>
              <p className="vp-modal-subtitle">{v.plateNumber} &middot; {v.model}</p>
            </div>
            <button className="vp-modal-close" onClick={closeModal} aria-label="Close">
              <CloseIcon />
            </button>
          </div>

          <div className="vp-modal-body">
            {(v.assignedDriver || v.assignedAssistant) && (
              <div className="vp-assign-current">
                <p className="vp-assign-current-label">Currently Assigned</p>
                {v.assignedDriver && (
                  <p className="vp-assign-current-item">
                    <span>Driver</span> {v.assignedDriver}
                  </p>
                )}
                {v.assignedAssistant && (
                  <p className="vp-assign-current-item">
                    <span>Assistant</span> {v.assignedAssistant}
                  </p>
                )}
              </div>
            )}

            <div className="vp-form-field">
              <label className="vp-form-label">Driver</label>
              <select
                className="vp-form-select"
                value={assignDriver}
                onChange={e => setAssignDriver(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {drivers.map(d => (
                  <option key={d.id} value={`${d.firstName} ${d.lastName}`}>
                    {d.firstName} {d.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="vp-form-field" style={{ marginTop: 16 }}>
              <label className="vp-form-label">Bus Assistant</label>
              <select
                className="vp-form-select"
                value={assignAssistant}
                onChange={e => setAssignAssistant(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {assistants.map(a => (
                  <option key={a.id} value={`${a.firstName} ${a.lastName}`}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="vp-modal-footer">
            <button className="vp-btn vp-btn--ghost" onClick={closeModal}>Cancel</button>
            <button className="vp-btn vp-btn--primary" onClick={handleAssignSubmit}>
              Save Assignment
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Modal: View History ──────────────────────────────────────────────────

  const renderHistoryModal = () => {
    if (!selectedVehicle) return null;
    const history = getHistory(selectedVehicle.id);
    return (
      <div className="vp-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
        <div className="vp-modal vp-modal--md" onClick={e => e.stopPropagation()}>
          <div className="vp-modal-header">
            <div>
              <h2 className="vp-modal-title">Vehicle History</h2>
              <p className="vp-modal-subtitle">
                {selectedVehicle.plateNumber} &middot; {selectedVehicle.model}
              </p>
            </div>
            <button className="vp-modal-close" onClick={closeModal} aria-label="Close">
              <CloseIcon />
            </button>
          </div>

          <div className="vp-modal-body">
            <div className="vp-timeline">
              {history.map((entry, idx) => (
                <div key={entry.id} className="vp-timeline-item">
                  <div className="vp-timeline-left">
                    <div className={`vp-timeline-dot vp-timeline-dot--${entry.type.toLowerCase().replace(' ', '-')}`} />
                    {idx < history.length - 1 && <div className="vp-timeline-line" />}
                  </div>
                  <div className="vp-timeline-content">
                    <div className="vp-timeline-meta">
                      <HistoryTypeBadge type={entry.type} />
                      <span className="vp-timeline-date">{formatDate(entry.date)}</span>
                    </div>
                    <p className="vp-timeline-desc">{entry.description}</p>
                    <span className="vp-timeline-by">By {entry.performedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="vp-modal-footer">
            <button className="vp-btn vp-btn--ghost" onClick={closeModal}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Modal: Confirm Deactivate / Delete ───────────────────────────────────

  const renderConfirmModal = (mode: 'deactivate' | 'delete') => {
    if (!selectedVehicle) return null;
    const isDelete = mode === 'delete';
    return (
      <div className="vp-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
        <div className="vp-modal vp-modal--xs" onClick={e => e.stopPropagation()}>
          <div className="vp-modal-header">
            <h2 className="vp-modal-title">
              {isDelete ? 'Delete Vehicle' : 'Deactivate Vehicle'}
            </h2>
            <button className="vp-modal-close" onClick={closeModal} aria-label="Close">
              <CloseIcon />
            </button>
          </div>
          <div className="vp-modal-body">
            <p className="vp-confirm-text">
              {isDelete
                ? `Are you sure you want to permanently delete ${selectedVehicle.plateNumber}? This action cannot be undone.`
                : `Are you sure you want to deactivate ${selectedVehicle.plateNumber}? It will be marked as Inactive and removed from active routes.`}
            </p>
          </div>
          <div className="vp-modal-footer">
            <button className="vp-btn vp-btn--ghost" onClick={closeModal}>Cancel</button>
            <button
              className={`vp-btn ${isDelete ? 'vp-btn--danger' : 'vp-btn--warning'}`}
              onClick={isDelete ? handleDelete : handleDeactivate}
            >
              {isDelete ? 'Delete Vehicle' : 'Deactivate'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render Dashboard Cards ───────────────────────────────────────────────

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="vp-placeholder">
          <h3>Loading vehicles...</h3>
          <p>Please wait while we fetch the vehicle data.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="vp-placeholder">
          <h3>Error loading vehicles</h3>
          <p>{error}</p>
          <button className="vp-btn vp-btn--primary" onClick={fetchAllData} style={{ marginTop: 16 }}>
            Retry
          </button>
        </div>
      );
    }

    switch(activeDashboardCard) {
      case 'list':
        return (
          <>
            {/* Stats */}
            <div className="vp-stats-grid">
              <div className="vp-stat-card">
                <span className="vp-stat-label">Total Vehicles</span>
                <span className="vp-stat-value">{stats.total}</span>
              </div>
              <div className="vp-stat-card vp-stat-card--active">
                <span className="vp-stat-label">Active</span>
                <span className="vp-stat-value">{stats.active}</span>
              </div>
              <div className="vp-stat-card vp-stat-card--maintenance">
                <span className="vp-stat-label">Under Maintenance</span>
                <span className="vp-stat-value">{stats.maintenance}</span>
              </div>
              <div className="vp-stat-card vp-stat-card--inactive">
                <span className="vp-stat-label">Inactive</span>
                <span className="vp-stat-value">{stats.inactive}</span>
              </div>
            </div>

            {/* Toolbar */}
            <div className="vp-toolbar">
              <div className="vp-search-wrapper">
                <SearchIcon />
                <input
                  type="text"
                  className="vp-search-input"
                  placeholder="Search by plate, model, driver or route..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="vp-search-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                    <CloseIcon />
                  </button>
                )}
              </div>
              <div className="vp-filters">
                <select
                  className="vp-filter-select"
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as VehicleType | 'All')}
                >
                  <option value="All">All Types</option>
                  <option value="School Bus">School Bus</option>
                  <option value="Mini Van">Mini Van</option>
                  <option value="Coaster">Coaster</option>
                </select>
                <select
                  className="vp-filter-select"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as VehicleStatus | 'All')}
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="vp-table-wrapper">
              {filteredVehicles.length === 0 ? (
                <div className="vp-empty-state">
                  <p className="vp-empty-title">No vehicles found</p>
                  <p className="vp-empty-sub">Try adjusting your search or filter criteria.</p>
                </div>
              ) : (
                <table className="vp-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Vehicle</th>
                      <th>Type</th>
                      <th>Cap.</th>
                      <th>Driver</th>
                      <th>Assistant</th>
                      <th>Route</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.map((vehicle, index) => (
                      <tr key={vehicle.id}>
                        <td className="vp-td-index">{index + 1}</td>
                        <td>
                          <div className="vp-vehicle-cell">
                            <span className="vp-plate">{vehicle.plateNumber}</span>
                            <span className="vp-model-year">{vehicle.model} &middot; {vehicle.year}</span>
                          </div>
                        </td>
                        <td>{vehicle.type}</td>
                        <td>{vehicle.capacity}</td>
                        <td>
                          {vehicle.assignedDriver || <span className="vp-unassigned">Unassigned</span>}
                        </td>
                        <td>
                          {vehicle.assignedAssistant || <span className="vp-unassigned">Unassigned</span>}
                        </td>
                        <td>
                          {vehicle.assignedRoute || <span className="vp-unassigned">—</span>}
                        </td>
                        <td>
                          <StatusBadge status={vehicle.status} />
                        </td>
                        <td>
                          <div className="vp-actions">
                            <button
                              className="vp-action-trigger"
                              onClick={() =>
                                setActiveMenu(activeMenu === vehicle.id ? null : vehicle.id)
                              }
                              aria-label="Actions"
                            >
                              <DotsIcon />
                            </button>
                            {activeMenu === vehicle.id && (
                              <div className="vp-action-menu">
                                <button onClick={() => openModal('view', vehicle)}>
                                  View Details
                                </button>
                                <button onClick={() => openModal('edit', vehicle)}>
                                  Edit Vehicle
                                </button>
                                <button onClick={() => openModal('assign', vehicle)}>
                                  Assign Driver / Assistant
                                </button>
                                <button onClick={() => openModal('history', vehicle)}>
                                  View History
                                </button>
                                <div className="vp-menu-divider" />
                                {vehicle.status !== 'Inactive' && (
                                  <button
                                    className="vp-menu-item--warning"
                                    onClick={() => openModal('deactivate', vehicle)}
                                  >
                                    Deactivate
                                  </button>
                                )}
                                <button
                                  className="vp-menu-item--danger"
                                  onClick={() => openModal('delete', vehicle)}
                                >
                                  Delete Vehicle
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
            <div className="vp-table-footer">
              Showing <strong>{filteredVehicles.length}</strong> of <strong>{vehicles.length}</strong> vehicles
            </div>
          </>
        );
      
      case 'details':
        return (
          <div className="vp-placeholder">
            <h3>Vehicle Details</h3>
            <p>Select a vehicle from the list to view detailed information.</p>
          </div>
        );
      
      case 'maintenance':
        return (
          <div className="vp-placeholder">
            <h3>Vehicle Maintenance</h3>
            <p>Maintenance schedules and records will be displayed here.</p>
          </div>
        );
      
      case 'documents':
        return (
          <div className="vp-placeholder">
            <h3>Vehicle Documents</h3>
            <p>Vehicle documents and insurance information will be displayed here.</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="vp-page">
      {/* Page Header */}
      <div className="vp-page-header">
        <div>
          <h1 className="vp-page-title">Vehicles</h1>
          <p className="vp-page-subtitle">
            Manage your fleet of vehicles, including details, maintenance schedules, and more.
          </p>
        </div>
        {activeDashboardCard === 'list' && (
          <button className="vp-btn vp-btn--primary" onClick={() => openModal('register')}>
            + Register Vehicle
          </button>
        )}
      </div>

      {/* Dashboard Cards Navigation */}
      <div className="dashboardCards">
        <article 
          className={`dashboardCard ${activeDashboardCard === 'list' ? 'active' : ''}`}
          onClick={() => setActiveDashboardCard('list')}
        >
          <p>Vehicle List</p>
        </article>
        <article 
          className={`dashboardCard ${activeDashboardCard === 'details' ? 'active' : ''}`}
          onClick={() => setActiveDashboardCard('details')}
        >
          <p>Vehicle Details</p>
        </article>
        <article 
          className={`dashboardCard ${activeDashboardCard === 'maintenance' ? 'active' : ''}`}
          onClick={() => setActiveDashboardCard('maintenance')}
        >
          <p>Vehicle Maintenance</p>
        </article>
        <article 
          className={`dashboardCard ${activeDashboardCard === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveDashboardCard('documents')}
        >
          <p>Vehicle Documents</p>
        </article>
      </div>

      {/* Dynamic Content */}
      {renderDashboardContent()}

      {/* Modals */}
      {modalType
        ? createPortal(
            <>
              {modalType === 'register' && renderVehicleFormModal('register')}
              {modalType === 'edit' && renderVehicleFormModal('edit')}
              {modalType === 'view' && renderViewModal()}
              {modalType === 'assign' && renderAssignModal()}
              {modalType === 'history' && renderHistoryModal()}
              {modalType === 'deactivate' && renderConfirmModal('deactivate')}
              {modalType === 'delete' && renderConfirmModal('delete')}
            </>,
            document.body
          )
        : null}
    </div>
  );
};

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

const SearchIcon: React.FC = () => (
  <svg className="vp-icon-search" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
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

// ─── Helper Sub-components ────────────────────────────────────────────────────

const DetailItem: React.FC<{ label: string; value: string; span?: boolean }> = ({
  label, value, span,
}) => (
  <div className={`vp-detail-item${span ? ' vp-detail-item--span' : ''}`}>
    <dt className="vp-detail-label">{label}</dt>
    <dd className="vp-detail-value">{value}</dd>
  </div>
);

export default Vehicles;
