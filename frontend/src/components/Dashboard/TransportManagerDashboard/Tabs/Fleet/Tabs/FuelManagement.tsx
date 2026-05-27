import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import type { RoleSection } from '../../../../dashboard.types';
import './FuelManagement.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type FuelRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed';
type RequestType = 'Fuel' | 'Service' | 'Repair and Maintenance' | 'Compliance';
type RequestCategory = 
  | 'Fuels & Oils'
  | 'Body Works and Body Parts'
  | 'Mechanical'
  | 'Wiring'
  | 'Puncture & Tires'
  | 'Insurance'
  | 'RSL'
  | 'Inspection / Speed Governors';
type ModalType = 'new-request' | 'reject' | 'view-request' | 'log-entry' | null;

interface FuelRequest {
  id: number;
  requestDate: string;
  requestTime: string;
  numberPlate: string;
  currentMileage: number;
  requestType: RequestType;
  requestedBy: string;
  category: RequestCategory;
  description: string;
  amount: number | null;
  confirmedBy: string;
  status: FuelRequestStatus;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  vehicleModel?: string;
  odometerBefore?: number;
  odometerAfter?: number;
  litresFilled?: number;
  costPerLitre?: number;
}

interface FuelLog {
  id: number;
  requestDate: string;
  numberPlate: string;
  currentMileage: number;
  requestType: string;
  category: string;
  amount: number;
  litresFilled: number;
  costPerLitre: number;
  odometerBefore: number;
  odometerAfter: number;
  status: string;
  confirmedBy: string;
  requestedBy: string;
  createdAt: string;
  createdByUserId?: number;
  vehicleModel?: string;
}

interface NumberPlate {
  id: number;
  plate_number: string;
  status: 'active' | 'inactive';
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

interface VehicleDetail {
  id: number;
  plate_number: string;
  model: string;
  type: string;
  year: number;
  capacity: number;
  fuelType: string;
  status: string;
}

interface NewRequestForm {
  numberPlate: string;
  requestType: RequestType | '';
  category: RequestCategory | '';
  currentMileage: string;
  description: string;
  amount: string;
}

interface NewLogForm {
  numberPlate: string;
  date: string;
  litresFilled: string;
  costPerLitre: string;
  odometerBefore: string;
  odometerAfter: string;
  description: string;
}

type FormErrors = Partial<Record<string, string>>;

interface FuelManagementProps {
  section: RoleSection;
}

interface MileageAnomaly {
  id: number;
  vehiclePlate: string;
  vehicleModel: string;
  driverName: string;
  date: string;
  expectedLitresPer100km: number;
  actualLitresPer100km: number;
  variancePercent: number;
  severity: 'Low' | 'Medium' | 'High';
  flag: string;
}

type ApiStatusError = {
  status?: number;
  response?: {
    status?: number;
  };
};

const isApiStatusError = (err: unknown): err is ApiStatusError =>
  typeof err === 'object' && err !== null;

// ─── API Service ──────────────────────────────────────────────────────────────

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('soho_auth_token');
  return token;
};

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('soho_auth_token');
      localStorage.removeItem('soho_user_role');
      localStorage.removeItem('soho_user_number_plate');
      localStorage.removeItem('soho_user_first_name');
      localStorage.removeItem('soho_user_last_name');
      localStorage.removeItem('soho_user_profile_photo_url');
    }
    return Promise.reject(error);
  }
);

const apiService = {
  getFuelRequests: async (): Promise<FuelRequest[]> => {
    try {
      const response = await axiosInstance.get('/fuel-requests');
      const reqs = response.data?.data?.requests || [];
      return reqs.map((r: any) => ({
        ...r,
        amount: r.amount !== null && r.amount !== undefined ? Number(r.amount) : null
      }));
    } catch (error) {
      console.error('getFuelRequests error:', error);
      throw error;
    }
  },

  createFuelRequest: async (data: Partial<FuelRequest>): Promise<FuelRequest> => {
    try {
      const response = await axiosInstance.post('/fuel-requests', data);
      const created = response.data?.data?.request || response.data;
      return {
        ...created,
        amount: created.amount !== null && created.amount !== undefined ? Number(created.amount) : null
      };
    } catch (error) {
      console.error('createFuelRequest error:', error);
      throw error;
    }
  },

  createFuelLog: async (data: Partial<FuelLog>): Promise<FuelLog> => {
    try {
      const response = await axiosInstance.post('/fuel-logs', data);
      const created = response.data?.data?.log || response.data;
      return {
        ...created,
        amount: created.amount !== null && created.amount !== undefined ? Number(created.amount) : null
      };
    } catch (error) {
      console.error('createFuelLog error:', error);
      throw error;
    }
  },

  updateFuelRequestStatus: async (id: number, status: FuelRequestStatus, confirmedBy: string, rejectionReason?: string): Promise<FuelRequest> => {
    try {
      const response = await axiosInstance.patch(`/fuel-requests/${id}/status`, {
        status,
        confirmedBy,
        rejectionReason
      });
      const updated = response.data?.data?.request || response.data;
      return {
        ...updated,
        amount: updated.amount !== null && updated.amount !== undefined ? Number(updated.amount) : null
      };
    } catch (error) {
      console.error('updateFuelRequestStatus error:', error);
      throw error;
    }
  },

  getNumberPlates: async (): Promise<NumberPlate[]> => {
    try {
      const response = await axiosInstance.get('/number-plates');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('getNumberPlates error:', error);
      throw error;
    }
  },

  getAllVehicleDetails: async (): Promise<VehicleDetail[]> => {
    try {
      const response = await axiosInstance.get('/vehicle-details');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('getAllVehicleDetails error:', error);
      throw error;
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await axiosInstance.get('/users/me');
      return response.data?.data || response.data || {};
    } catch (error) {
      console.error('getCurrentUser error:', error);
      throw error;
    }
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number): string => {
  if (!n && n !== 0) return '0';
  return n.toLocaleString('en-KE');
};

const fmtCost = (n: number): string => {
  if (!n && n !== 0) return 'KES 0';
  return `KES ${n.toLocaleString('en-KE')}`;
};

const fmtDate = (d: string): string => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return 'Invalid date';
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

const FuelManagement: React.FC<FuelManagementProps> = ({ section }) => {
  const [requests, setRequests] = useState<FuelRequest[]>([]);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<FuelRequest[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<FuelLog[]>([]);
  const [numberPlates, setNumberPlates] = useState<NumberPlate[]>([]);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetail[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedRequest, setSelectedRequest] = useState<FuelRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reqForm, setReqForm] = useState<NewRequestForm>({
    numberPlate: '',
    requestType: '',
    category: '',
    currentMileage: '',
    description: '',
    amount: '',
  });
  const [logForm, setLogForm] = useState<NewLogForm>({
    numberPlate: '',
    date: new Date().toISOString().split('T')[0],
    litresFilled: '',
    costPerLitre: '180',
    odometerBefore: '',
    odometerAfter: '',
    description: '',
  });
  const [reqErrors, setReqErrors] = useState<FormErrors>({});
  const [logErrors, setLogErrors] = useState<FormErrors>({});
  const [reqSearch, setReqSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FuelRequestStatus | 'All'>('All');
  
  // Tab state - Dashboard is the first tab now
  const tabs = ['Dashboard', 'Fuel Requests', 'Fuel Approvals', 'Fuel Logs', 'Analytics', 'Mileage Anomalies'];
  
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);
  
  const [anomalies, setAnomalies] = useState<MileageAnomaly[]>([]);
  
  const initialFetchDone = useRef(false);
  const isMounted = useRef(true);

  // ─── Fetch Data from API ────────────────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    if (!isMounted.current) return;
    
    setLoading(true);
    setError(null);
    try {
      const [requestsData, platesData, vehiclesData, userData] = await Promise.all([
        apiService.getFuelRequests(),
        apiService.getNumberPlates(),
        apiService.getAllVehicleDetails(),
        apiService.getCurrentUser(),
      ]);
      
      if (!isMounted.current) return;
      
      setRequests(requestsData);
      setNumberPlates(platesData);
      setVehicleDetails(vehiclesData);
      setCurrentUser(userData);
      
      // Convert fuel requests to logs for completed/approved ones
      const logsData: FuelLog[] = requestsData
        .filter(r => r.status === 'Approved' || r.status === 'Completed')
        .map(r => ({
          id: r.id,
          requestDate: r.requestDate,
          numberPlate: r.numberPlate,
          currentMileage: r.currentMileage,
          requestType: r.requestType,
          category: r.category,
          amount: r.amount || 0,
          litresFilled: r.litresFilled || (r.amount ? r.amount / 180 : 0),
          costPerLitre: r.costPerLitre || 180,
          odometerBefore: r.odometerBefore || 0,
          odometerAfter: r.odometerAfter || r.currentMileage,
          status: r.status,
          confirmedBy: r.confirmedBy,
          requestedBy: r.requestedBy,
          createdAt: r.createdAt,
          vehicleModel: vehiclesData.find(v => v.plate_number === r.numberPlate)?.model,
        }));
      setLogs(logsData);
      
      // Calculate anomalies
      const fuelRequests = requestsData.filter(r => r.requestType === 'Fuel' && r.status === 'Approved');
      const vehicleFuelMap: Record<string, FuelRequest[]> = {};
      
      fuelRequests.forEach(req => {
        if (!vehicleFuelMap[req.numberPlate]) {
          vehicleFuelMap[req.numberPlate] = [];
        }
        vehicleFuelMap[req.numberPlate].push(req);
      });
      
      const calculatedAnomalies: MileageAnomaly[] = [];
      
      Object.entries(vehicleFuelMap).forEach(([plate, reqs]) => {
        reqs.sort((a, b) => new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime());
        
        for (let i = 1; i < reqs.length; i++) {
          const prev = reqs[i - 1];
          const curr = reqs[i];
          const mileageDiff = curr.currentMileage - prev.currentMileage;
          
          if (mileageDiff > 0 && curr.amount) {
            const litresPer100km = (curr.amount / mileageDiff) * 100;
            const expectedConsumption = 14;
            const variance = ((litresPer100km - expectedConsumption) / expectedConsumption) * 100;
            
            if (variance > 15) {
              const vehicle = vehiclesData.find(v => v.plate_number === plate);
              const severity = variance > 50 ? 'High' : variance > 25 ? 'Medium' : 'Low';
              
              calculatedAnomalies.push({
                id: curr.id,
                vehiclePlate: plate,
                vehicleModel: vehicle?.model || 'Unknown',
                driverName: curr.requestedBy,
                date: curr.requestDate,
                expectedLitresPer100km: expectedConsumption,
                actualLitresPer100km: Math.round(litresPer100km * 10) / 10,
                variancePercent: Math.round(variance),
                severity,
                flag: `Consumption ${Math.round(variance)}% above expected. ${severity === 'High' ? 'Possible fuel siphoning or unreported idling.' : 'Monitor next fill.'}`,
              });
            }
          }
        }
      });
      
      setAnomalies(calculatedAnomalies);
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      if (isMounted.current) {
        if (isApiStatusError(err) && (err.response?.status === 401 || err.status === 401)) {
          localStorage.removeItem('soho_auth_token');
          setError('Your session has expired. Please log in again.');
        } else {
          setError('Failed to load fuel management data. Please try again later.');
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  // Filter functions
  const filterRequests = useCallback(() => {
    const q = reqSearch.toLowerCase();
    let filtered = requests.filter(r => {
      const matchQ =
        !q ||
        r.numberPlate.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q) ||
        r.id.toString().includes(q);
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchQ && matchStatus;
    });
    
    filtered = filtered.map(r => ({
      ...r,
      vehicleModel: vehicleDetails.find(v => v.plate_number === r.numberPlate)?.model || 'Unknown',
    }));
    
    setFilteredRequests(filtered);
  }, [requests, reqSearch, statusFilter, vehicleDetails]);

  const filterLogs = useCallback(() => {
    const q = logSearch.toLowerCase();
    let filtered = logs.filter(l => {
      const matchQ =
        !q ||
        l.numberPlate.toLowerCase().includes(q) ||
        l.requestedBy.toLowerCase().includes(q);
      return matchQ;
    });
    
    filtered = filtered.map(l => ({
      ...l,
      vehicleModel: vehicleDetails.find(v => v.plate_number === l.numberPlate)?.model || 'Unknown',
    }));
    
    setFilteredLogs(filtered);
  }, [logs, logSearch, vehicleDetails]);

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    isMounted.current = true;
    
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchAllData();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchAllData]);

  useEffect(() => {
    if (requests.length > 0) {
      filterRequests();
    }
  }, [filterRequests, requests.length]);

  useEffect(() => {
    if (logs.length > 0) {
      filterLogs();
    }
  }, [filterLogs, logs.length]);

  // ─── Computed ──────────────────────────────────────────────────────────────

  const pendingRequests = useMemo(
    () => requests.filter(r => r.status === 'Pending'),
    [requests],
  );

  const analytics = useMemo(() => {
    // Get current date at start of function to ensure consistency
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Filter approved fuel requests
    const approvedFuelRequests = requests.filter(r => 
      r.requestType === 'Fuel' && r.status === 'Approved'
    );
    
    // Current month filter (same month and year)
    const currentMonthRequests = approvedFuelRequests.filter(r => {
      const date = new Date(r.requestDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    // Calculate totals
    const totalCostMonth = currentMonthRequests.reduce((s, r) => s + (r.amount || 0), 0);
    const totalCostAll = approvedFuelRequests.reduce((s, r) => s + (r.amount || 0), 0);
    
    // For litres - use litresFilled if available, otherwise estimate from amount (assuming ~180 KES/L)
    const totalLitresMonth = currentMonthRequests.reduce((s, r) => {
      if (r.litresFilled) return s + r.litresFilled;
      return s + ((r.amount || 0) / 180);
    }, 0);
    
    const totalLitresAll = approvedFuelRequests.reduce((s, r) => {
      if (r.litresFilled) return s + r.litresFilled;
      return s + ((r.amount || 0) / 180);
    }, 0);

    // Vehicle costs breakdown
    const vehicleCosts: Record<string, number> = {};
    approvedFuelRequests.forEach(r => {
      vehicleCosts[r.numberPlate] = (vehicleCosts[r.numberPlate] || 0) + (r.amount || 0);
    });
    
    const topVehicle = Object.entries(vehicleCosts).sort((a, b) => b[1] - a[1])[0];

    const perVehicle = Object.entries(vehicleCosts).map(([plate, cost]) => ({
      plate,
      cost,
      pct: totalCostAll > 0 ? Math.round((cost / totalCostAll) * 100) : 0,
    })).sort((a, b) => b.cost - a.cost);

    // Monthly trend data (last 6 months)
    const monthlyData: { month: string; cost: number; litres: number }[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const monthName = months[d.getMonth()];
      const monthYear = d.getFullYear();
      
      const monthRequests = approvedFuelRequests.filter(r => {
        const date = new Date(r.requestDate);
        return date.getMonth() === d.getMonth() && date.getFullYear() === monthYear;
      });
      
      const monthCost = monthRequests.reduce((s, r) => s + (r.amount || 0), 0);
      const monthLitres = monthRequests.reduce((s, r) => {
        if (r.litresFilled) return s + r.litresFilled;
        return s + ((r.amount || 0) / 180);
      }, 0);
      
      monthlyData.push({ month: monthName, cost: monthCost, litres: monthLitres });
    }

    return {
      totalCostMonth,
      totalLitresMonth,
      totalCostAll,
      totalLitresAll,
      topVehicle: topVehicle ? topVehicle[0] : '—',
      topVehicleCost: topVehicle ? topVehicle[1] : 0,
      perVehicle,
      monthlyData,
    };
  }, [requests]);

  // Get recent logs for dashboard (last 5)
  const recentLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()).slice(0, 5);
  }, [logs]);

  // Get recent anomalies for dashboard (top 3 by severity)
  const recentAnomalies = useMemo(() => {
    const severityOrder = { High: 0, Medium: 1, Low: 2 };
    return [...anomalies].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 3);
  }, [anomalies]);

  // ─── Modal Handlers ───────────────────────────────────────────────────────

  const openModal = useCallback((type: ModalType, req?: FuelRequest) => {
    setModalType(type);
    setSelectedRequest(req ?? null);
    setRejectReason('');
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setModalType(null);
    setSelectedRequest(null);
    setReqErrors({});
    setLogErrors({});
    document.body.style.overflow = '';
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const approveRequest = useCallback(async (req: FuelRequest) => {
    try {
      const updated = await apiService.updateFuelRequestStatus(
        req.id, 
        'Approved', 
        currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Transport Manager'
      );
      setRequests(prev =>
        prev.map(r => r.id === req.id ? { ...r, status: 'Approved', confirmedBy: updated.confirmedBy } : r)
      );
    } catch (err) {
      console.error('Error approving request:', err);
    }
  }, [currentUser]);

  const rejectRequest = useCallback(async () => {
    if (!selectedRequest) return;
    try {
      const updated = await apiService.updateFuelRequestStatus(
        selectedRequest.id,
        'Rejected',
        currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Transport Manager',
        rejectReason
      );
      setRequests(prev =>
        prev.map(r =>
          r.id === selectedRequest.id
            ? { ...r, status: 'Rejected', confirmedBy: updated.confirmedBy }
            : r
        )
      );
      setRejectReason('');
      closeModal();
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  }, [selectedRequest, currentUser, rejectReason, closeModal]);

  // ─── Form Handlers ─────────────────────────────────────────────────────────

  const patchReq = useCallback((field: keyof NewRequestForm) => (val: string) => {
    setReqForm(p => ({ ...p, [field]: val }));
    if (reqErrors[field]) setReqErrors(p => ({ ...p, [field]: undefined }));
  }, [reqErrors]);

  const patchLog = useCallback((field: keyof NewLogForm) => (val: string) => {
    setLogForm(p => ({ ...p, [field]: val }));
    if (logErrors[field]) setLogErrors(p => ({ ...p, [field]: undefined }));
  }, [logErrors]);

  const validateReqForm = useCallback(() => {
    const e: FormErrors = {};
    if (!reqForm.numberPlate) e.numberPlate = 'Required';
    if (!reqForm.requestType) e.requestType = 'Required';
    if (!reqForm.category) e.category = 'Required';
    if (!reqForm.currentMileage || Number(reqForm.currentMileage) <= 0) e.currentMileage = 'Enter valid mileage';
    if (!reqForm.description.trim()) e.description = 'Required';
    setReqErrors(e);
    return Object.keys(e).length === 0;
  }, [reqForm]);

  const validateLogForm = useCallback(() => {
    const e: FormErrors = {};
    if (!logForm.numberPlate) e.numberPlate = 'Required';
    if (!logForm.date) e.date = 'Required';
    if (!logForm.litresFilled || Number(logForm.litresFilled) <= 0) e.litresFilled = 'Enter valid litres';
    if (!logForm.costPerLitre || Number(logForm.costPerLitre) <= 0) e.costPerLitre = 'Enter valid rate';
    setLogErrors(e);
    return Object.keys(e).length === 0;
  }, [logForm]);

  const submitRequest = useCallback(async () => {
    if (!validateReqForm() || !currentUser) return;
    
    try {
      const now = new Date();
      const newRequest: Partial<FuelRequest> = {
        requestDate: now.toISOString().split('T')[0],
        requestTime: now.toTimeString().split(' ')[0],
        numberPlate: reqForm.numberPlate,
        currentMileage: Number(reqForm.currentMileage),
        requestType: reqForm.requestType as RequestType,
        requestedBy: `${currentUser.firstName} ${currentUser.lastName}`,
        category: reqForm.category as RequestCategory,
        description: reqForm.description,
        amount: reqForm.amount ? Number(reqForm.amount) : null,
        confirmedBy: '',
        status: 'Pending',
        createdByUserId: currentUser.id,
      };
      
      const created = await apiService.createFuelRequest(newRequest);
      setRequests(prev => [created, ...prev]);
      setReqForm({
        numberPlate: '',
        requestType: '',
        category: '',
        currentMileage: '',
        description: '',
        amount: '',
      });
      closeModal();
    } catch (err) {
      console.error('Error creating request:', err);
      setReqErrors({ description: 'Failed to create request. Please try again.' });
    }
  }, [validateReqForm, currentUser, reqForm, closeModal]);

  const submitLog = useCallback(async () => {
    if (!validateLogForm() || !currentUser) return;
    
    try {
      const newLog: Partial<FuelLog> = {
        requestDate: logForm.date,
        numberPlate: logForm.numberPlate,
        currentMileage: Number(logForm.odometerAfter),
        requestType: 'Fuel',
        category: 'Fuels & Oils',
        amount: Number(logForm.litresFilled) * Number(logForm.costPerLitre),
        litresFilled: Number(logForm.litresFilled),
        costPerLitre: Number(logForm.costPerLitre),
        odometerBefore: Number(logForm.odometerBefore),
        odometerAfter: Number(logForm.odometerAfter),
        status: 'Completed',
        confirmedBy: `${currentUser.firstName} ${currentUser.lastName}`,
        requestedBy: `${currentUser.firstName} ${currentUser.lastName}`,
        createdByUserId: currentUser.id,
      };
      
      const created = await apiService.createFuelLog(newLog);
      setLogs(prev => [created as FuelLog, ...prev]);
      setLogForm({
        numberPlate: '',
        date: new Date().toISOString().split('T')[0],
        litresFilled: '',
        costPerLitre: '180',
        odometerBefore: '',
        odometerAfter: '',
        description: '',
      });
      closeModal();
    } catch (err) {
      console.error('Error creating log:', err);
      setLogErrors({ description: 'Failed to create log entry. Please try again.' });
    }
  }, [validateLogForm, currentUser, logForm, closeModal]);

  // ─── Dashboard Renderer ─────────────────────────────────────────────────────

  const renderDashboard = () => (
    <div className="fuel-dashboard">
      {/* Quick Stats Row */}
      <div className="fuel-stats-grid">
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Total Fuel Spend</small>
          <div className="fuel-stat-value">{fmtCost(analytics.totalCostAll)}</div>
          <small className="fuel-stat-sub">All time</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">This Month</small>
          <div className="fuel-stat-value">{fmtCost(analytics.totalCostMonth)}</div>
          <small className="fuel-stat-sub">{fmt(Math.round(analytics.totalLitresMonth))} litres</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Pending Approvals</small>
          <div className="fuel-stat-value">{pendingRequests.length}</div>
          <small className="fuel-stat-sub">Requests waiting</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Active Vehicles</small>
          <div className="fuel-stat-value">{numberPlates.filter(p => p.status === 'active').length}</div>
          <small className="fuel-stat-sub">In fleet</small>
        </div>
      </div>

      {/* Fuel Consumption Trends Card */}
      <div className="fuel-dashboard-card">
        <div className="fuel-dashboard-card-header">
          <div>
            <h3>📊 Fuel Consumption Trends</h3>
            <p>Monthly fuel expenditure trend over the last 6 months</p>
          </div>
          <button 
            className="fuel-link-button"
            onClick={() => setActiveTab('Analytics')}
          >
            View Details →
          </button>
        </div>
        <div className="fuel-chart-container fuel-dashboard-chart">
          {analytics.monthlyData.map((m, idx) => {
            const maxCost = Math.max(...analytics.monthlyData.map(d => d.cost), 1);
            const barHeight = Math.max(30, Math.min(200, (m.cost / maxCost) * 150));
            return (
              <div key={idx} className="fuel-chart-bar-wrapper">
                <div className="fuel-chart-bar-value">{fmtCost(m.cost)}</div>
                <div className="fuel-chart-bar" style={{ height: `${barHeight}px` }} />
                <div className="fuel-chart-label">{m.month}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout for Recent Logs and Alerts */}
      <div className="fuel-dashboard-two-column">
        {/* Recent Refueling Logs */}
        <div className="fuel-dashboard-card">
          <div className="fuel-dashboard-card-header">
            <div>
              <h3>⛽ Recent Refueling Logs</h3>
              <p>Latest fuel fill-ups across the fleet</p>
            </div>
            <button 
              className="fuel-link-button"
              onClick={() => setActiveTab('Fuel Logs')}
            >
              View All →
            </button>
          </div>
          <div className="fuel-dashboard-logs">
            {loading ? (
              <div className="fuel-loading">Loading logs...</div>
            ) : recentLogs.length === 0 ? (
              <div className="fuel-empty-state-small">No refueling logs found</div>
            ) : (
              <table className="fuel-dashboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Litres</th>
                    <th>Cost</th>
                    <th>Consumption</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map(log => {
                    const distance = log.odometerAfter - log.odometerBefore;
                    const consumption = distance > 0 ? ((log.litresFilled / distance) * 100).toFixed(1) : '—';
                    return (
                      <tr key={log.id}>
                        <td>{fmtDate(log.requestDate)}</td>
                        <td>
                          <strong>{log.numberPlate}</strong>
                          {log.vehicleModel && <small>{log.vehicleModel}</small>}
                        </td>
                        <td>{fmt(log.litresFilled)} L</td>
                        <td>{fmtCost(log.amount)}</td>
                        <td>{consumption !== '—' ? `${consumption} L/100km` : '—'}</td>
                       </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Fuel Variance Alerts */}
        <div className="fuel-dashboard-card">
          <div className="fuel-dashboard-card-header">
            <div>
              <h3>⚠️ Fuel Variance Alerts</h3>
              <p>Vehicles with unusual consumption patterns</p>
            </div>
            <button 
              className="fuel-link-button"
              onClick={() => setActiveTab('Mileage Anomalies')}
            >
              View All →
            </button>
          </div>
          <div className="fuel-dashboard-alerts">
            {loading ? (
              <div className="fuel-loading">Analyzing data...</div>
            ) : recentAnomalies.length === 0 ? (
              <div className="fuel-empty-state-small">
                <span className="fuel-empty-icon-small">✓</span>
                <p>No anomalies detected</p>
              </div>
            ) : (
              recentAnomalies.map(anomaly => (
                <div key={anomaly.id} className={`fuel-alert-item fuel-alert-${anomaly.severity.toLowerCase()}`}>
                  <div className="fuel-alert-header">
                    <span className={`fuel-severity-badge fuel-severity-${anomaly.severity.toLowerCase()}`}>
                      {anomaly.severity}
                    </span>
                    <span className="fuel-alert-date">{fmtDate(anomaly.date)}</span>
                  </div>
                  <div className="fuel-alert-vehicle">
                    <strong>{anomaly.vehiclePlate}</strong>
                    <span>{anomaly.vehicleModel}</span>
                  </div>
                  <div className="fuel-alert-stats">
                    <span>Expected: {anomaly.expectedLitresPer100km} L/100km</span>
                    <span className="fuel-alert-actual">Actual: {anomaly.actualLitresPer100km} L/100km</span>
                    <span className="fuel-alert-variance">+{anomaly.variancePercent}% variance</span>
                  </div>
                  <div className="fuel-alert-flag">
                    <span>🚨</span> {anomaly.flag}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Tab Content Renderers ─────────────────────────────────────────────────

  const renderRequests = () => (
    <div>
      <div className="fuel-search-bar">
        <div className="fuel-search-input-wrapper">
          <input 
            className="fuel-search-input"
            placeholder="Search plate, requested by, ID…" 
            value={reqSearch} 
            onChange={e => setReqSearch(e.target.value)} 
          />
        </div>
        <select 
          className="fuel-filter-select"
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value as FuelRequestStatus | 'All')}
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Completed">Completed</option>
        </select>
        <button 
          className="fuel-primary-button"
          onClick={() => openModal('new-request')}
        >
          + New Request
        </button>
      </div>

      <div className="fuel-table-container">
        <table className="fuel-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Vehicle</th>
              <th>Requested By</th>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="fuel-loading">Loading...</td>
              </tr>
            ) : filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={9} className="fuel-empty-state">No records found.</td>
              </tr>
            ) : (
              filteredRequests.map(r => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>
                    <div>{r.numberPlate}</div>
                    {r.vehicleModel && <small>{r.vehicleModel}</small>}
                  </td>
                  <td>{r.requestedBy}</td>
                  <td>{fmtDate(r.requestDate)}</td>
                  <td>{r.requestType}</td>
                  <td>{r.category}</td>
                  <td>{r.amount ? fmtCost(r.amount) : '—'}</td>
                  <td>
                    <span className={`fuel-status-badge fuel-status-${r.status.toLowerCase()}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="fuel-view-button"
                      onClick={() => openModal('view-request', r)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderApprovals = () => (
    <div>
      <div className="fuel-approvals-header">
        <div>
          <h3>Pending Fuel Requests</h3>
          <p>Review and approve or reject outstanding fuel requests</p>
        </div>
        <span className="fuel-pending-badge">
          {pendingRequests.length} Pending
        </span>
      </div>

      {loading ? (
        <div className="fuel-loading">Loading pending requests...</div>
      ) : pendingRequests.length === 0 ? (
        <div className="fuel-empty-state">
          <p className="fuel-empty-icon">✓</p>
          <p className="fuel-empty-title">All caught up</p>
          <p className="fuel-empty-description">No pending fuel requests at the moment.</p>
        </div>
      ) : (
        <div className="fuel-approvals-list">
          {pendingRequests.map(r => {
            const vehicleModel = vehicleDetails.find(v => v.plate_number === r.numberPlate)?.model || 'Unknown';
            return (
              <div key={r.id} className="fuel-approval-card">
                <div className="fuel-approval-header">
                  <div>
                    <div className="fuel-approval-title">
                      <span>#{r.id}</span>
                      <span className="fuel-approval-date">{fmtDate(r.requestDate)}</span>
                    </div>
                    <div className="fuel-approval-vehicle">
                      <span>{r.numberPlate}</span>
                      <span className="fuel-approval-vehicle-model">{vehicleModel}</span>
                    </div>
                  </div>
                  <div className="fuel-approval-amount">
                    <div>{r.amount ? fmtCost(r.amount) : 'Variable'}</div>
                    <div>{r.requestType}</div>
                  </div>
                </div>

                <div className="fuel-approval-details">
                  <div><small>Requested By</small><div>{r.requestedBy}</div></div>
                  <div><small>Current Mileage</small><div>{fmt(r.currentMileage)} km</div></div>
                  <div><small>Category</small><div>{r.category}</div></div>
                  <div><small>Description</small><div>{r.description}</div></div>
                </div>

                <div className="fuel-approval-actions">
                  <button 
                    className="fuel-danger-button"
                    onClick={() => openModal('reject', r)}
                  >
                    Reject
                  </button>
                  <button 
                    className="fuel-success-button"
                    onClick={() => approveRequest(r)}
                  >
                    Approve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderLogs = () => (
    <div>
      <div className="fuel-search-bar">
        <div className="fuel-search-input-wrapper">
          <input 
            className="fuel-search-input"
            placeholder="Search plate, requested by…" 
            value={logSearch} 
            onChange={e => setLogSearch(e.target.value)} 
          />
        </div>
        <button 
          className="fuel-primary-button"
          onClick={() => openModal('log-entry')}
        >
          + Log Fuel Fill
        </button>
      </div>

      <div className="fuel-table-container">
        <table className="fuel-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Driver/Requester</th>
              <th>Litres</th>
              <th>Rate (KES/L)</th>
              <th>Total Cost</th>
              <th>Odometer</th>
              <th>Consumption</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="fuel-loading">Loading...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={9} className="fuel-empty-state">No records found.</td>
              </tr>
            ) : (
              filteredLogs.map(l => {
                const distance = l.odometerAfter - l.odometerBefore;
                const consumption = distance > 0 ? ((l.litresFilled / distance) * 100).toFixed(1) : null;
                return (
                  <tr key={l.id}>
                    <td>{fmtDate(l.requestDate)}</td>
                    <td>
                      <div>{l.numberPlate}</div>
                      {l.vehicleModel && <small>{l.vehicleModel}</small>}
                    </td>
                    <td>{l.requestedBy}</td>
                    <td>{fmt(l.litresFilled)} L</td>
                    <td>KES {fmt(l.costPerLitre)}</td>
                    <td>{fmtCost(l.amount)}</td>
                    <td>{distance > 0 ? `${fmt(l.odometerBefore)} → ${fmt(l.odometerAfter)} km` : '—'}</td>
                    <td>{consumption ? `${consumption} L/100km` : '—'}</td>
                    <td>
                      <span className="fuel-status-badge fuel-status-completed">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div>
      <div className="fuel-stats-grid">
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Total Spend — This Month</small>
          <div className="fuel-stat-value">{fmtCost(analytics.totalCostMonth)}</div>
          <small className="fuel-stat-sub">{fmt(Math.round(analytics.totalLitresMonth))} litres consumed</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Total Spend — All Time</small>
          <div className="fuel-stat-value">{fmtCost(analytics.totalCostAll)}</div>
          <small className="fuel-stat-sub">{fmt(Math.round(analytics.totalLitresAll))} litres total</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Top Consuming Vehicle</small>
          <div className="fuel-stat-value">{analytics.topVehicle}</div>
          <small className="fuel-stat-sub">{fmtCost(analytics.topVehicleCost)} spent</small>
        </div>
        <div className="fuel-stat-card">
          <small className="fuel-stat-label">Total Requests</small>
          <div className="fuel-stat-value">{requests.length}</div>
          <small className="fuel-stat-sub">{pendingRequests.length} pending approval</small>
        </div>
      </div>

      <div className="fuel-analytics-section">
        <h3>Fuel Cost by Vehicle</h3>
        <p>Breakdown of total fuel expenditure per vehicle</p>
        <div className="fuel-progress-list">
          {analytics.perVehicle.slice(0, 5).map(v => (
            <div key={v.plate} className="fuel-progress-item">
              <span className="fuel-progress-label">{v.plate}</span>
              <div className="fuel-progress-bar-container">
                <div className="fuel-progress-bar" style={{ width: `${v.pct}%` }} />
              </div>
              <span className="fuel-progress-cost">{fmtCost(v.cost)}</span>
              <span className="fuel-progress-percent">{v.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fuel-analytics-section">
        <h3>Monthly Fuel Cost Trend</h3>
        <p>Last 6 months fuel expenditure</p>
        <div className="fuel-chart-container">
          {analytics.monthlyData.map((m, idx) => {
            const maxCost = Math.max(...analytics.monthlyData.map(d => d.cost), 1);
            const barHeight = Math.max(30, Math.min(200, (m.cost / maxCost) * 150));
            return (
              <div key={idx} className="fuel-chart-bar-wrapper">
                <div className="fuel-chart-bar-value">{fmtCost(m.cost)}</div>
                <div className="fuel-chart-bar" style={{ height: `${barHeight}px` }} />
                <div className="fuel-chart-label">{m.month}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderAnomalies = () => (
    <div>
      <div className="fuel-anomalies-header">
        <div>
          <h3>Mileage Anomalies</h3>
          <p>Vehicles where fuel consumption deviates significantly from expected fleet average</p>
        </div>
        <div className="fuel-anomaly-stats-badges">
          <span className="fuel-anomaly-badge-high">
            {anomalies.filter(a => a.severity === 'High').length} High
          </span>
          <span className="fuel-anomaly-badge-medium">
            {anomalies.filter(a => a.severity === 'Medium').length} Medium
          </span>
          <span className="fuel-anomaly-badge-low">
            {anomalies.filter(a => a.severity === 'Low').length} Low
          </span>
        </div>
      </div>

      {loading ? (
        <div className="fuel-loading">Analyzing data...</div>
      ) : anomalies.length === 0 ? (
        <div className="fuel-empty-state">
          <p className="fuel-empty-icon">✓</p>
          <p className="fuel-empty-title">No anomalies detected</p>
          <p className="fuel-empty-description">All vehicles are operating within expected fuel consumption ranges.</p>
        </div>
      ) : (
        <div className="fuel-anomalies-list">
          {anomalies.map(a => (
            <div key={a.id} className={`fuel-anomaly-card fuel-anomaly-${a.severity.toLowerCase()}`}>
              <div className="fuel-anomaly-header">
                <div>
                  <div className="fuel-anomaly-vehicle">{a.vehiclePlate}</div>
                  <div className="fuel-anomaly-meta">{a.vehicleModel} · {a.driverName}</div>
                </div>
                <div className="fuel-anomaly-severity-wrapper">
                  <span className={`fuel-anomaly-severity fuel-severity-${a.severity.toLowerCase()}`}>
                    {a.severity} Risk
                  </span>
                  <div className="fuel-anomaly-date">{fmtDate(a.date)}</div>
                </div>
              </div>

              <div className="fuel-anomaly-stats">
                <div className="fuel-anomaly-stat">
                  <small>Expected</small>
                  <div>{a.expectedLitresPer100km} L/100km</div>
                </div>
                <div className="fuel-anomaly-stat">
                  <small>Actual</small>
                  <div className="fuel-anomaly-stat-value highlight">{a.actualLitresPer100km} L/100km</div>
                </div>
                <div className="fuel-anomaly-stat">
                  <small>Variance</small>
                  <div className="fuel-anomaly-stat-value highlight">+{a.variancePercent}%</div>
                </div>
              </div>

              <div className="fuel-anomaly-flag">
                <span>⚠️</span> {a.flag}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDashboardContent = () => {
    if (loading && requests.length === 0) {
      return <div className="fuel-loading">Loading fuel management data...</div>;
    }

    if (error && requests.length === 0) {
      return (
        <div className="fuel-error">
          <p className="fuel-error-message">{error}</p>
          <button className="fuel-primary-button" onClick={fetchAllData}>Retry</button>
        </div>
      );
    }

    switch(activeTab) {
      case 'Dashboard':
        return renderDashboard();
      case 'Fuel Requests':
        return renderRequests();
      case 'Fuel Approvals':
        return renderApprovals();
      case 'Fuel Logs':
        return renderLogs();
      case 'Analytics':
        return renderAnalytics();
      case 'Mileage Anomalies':
        return renderAnomalies();
      default:
        return renderDashboard();
    }
  };

  // ─── Modals ────────────────────────────────────────────────────────────────

  const renderNewRequestModal = () => (
    <div className="fuel-modal-overlay" onClick={closeModal}>
      <div className="fuel-modal" onClick={e => e.stopPropagation()}>
        <div className="fuel-modal-header">
          <div>
            <h2 className="fuel-modal-title">New Fuel Request</h2>
            <p className="fuel-modal-subtitle">Submit a fuel or maintenance request</p>
          </div>
          <button className="fuel-modal-close" onClick={closeModal}>&times;</button>
        </div>
        <div className="fuel-modal-body">
          <div className="fuel-form-grid">
            <div className="fuel-form-group">
              <label className="fuel-form-label">Vehicle *</label>
              <select 
                className="fuel-form-select"
                value={reqForm.numberPlate} 
                onChange={e => patchReq('numberPlate')(e.target.value)}
              >
                <option value="">Select Vehicle</option>
                {numberPlates.filter(p => p.status === 'active').map(p => (
                  <option key={p.id} value={p.plate_number}>{p.plate_number}</option>
                ))}
              </select>
              {reqErrors.numberPlate && <small className="fuel-form-error">{reqErrors.numberPlate}</small>}
            </div>
            <div className="fuel-form-group">
              <label className="fuel-form-label">Request Type *</label>
              <select 
                className="fuel-form-select"
                value={reqForm.requestType} 
                onChange={e => patchReq('requestType')(e.target.value)}
              >
                <option value="">Select Type</option>
                <option value="Fuel">Fuel</option>
                <option value="Service">Service</option>
                <option value="Repair and Maintenance">Repair and Maintenance</option>
                <option value="Compliance">Compliance</option>
              </select>
              {reqErrors.requestType && <small className="fuel-form-error">{reqErrors.requestType}</small>}
            </div>
            <div className="fuel-form-group">
              <label className="fuel-form-label">Category *</label>
              <select 
                className="fuel-form-select"
                value={reqForm.category} 
                onChange={e => patchReq('category')(e.target.value)}
              >
                <option value="">Select Category</option>
                <option value="Fuels & Oils">Fuels & Oils</option>
                <option value="Body Works and Body Parts">Body Works and Body Parts</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Wiring">Wiring</option>
                <option value="Puncture & Tires">Puncture & Tires</option>
                <option value="Insurance">Insurance</option>
                <option value="RSL">RSL</option>
                <option value="Inspection / Speed Governors">Inspection / Speed Governors</option>
              </select>
              {reqErrors.category && <small className="fuel-form-error">{reqErrors.category}</small>}
            </div>
            <div className="fuel-form-group">
              <label className="fuel-form-label">Current Mileage (km) *</label>
              <input 
                type="number"
                className="fuel-form-input"
                value={reqForm.currentMileage} 
                onChange={e => patchReq('currentMileage')(e.target.value)}
                placeholder="e.g. 45230"
              />
              {reqErrors.currentMileage && <small className="fuel-form-error">{reqErrors.currentMileage}</small>}
            </div>
            <div className="fuel-form-group">
              <label className="fuel-form-label">Amount (KES) - Optional</label>
              <input 
                type="number"
                className="fuel-form-input"
                value={reqForm.amount} 
                onChange={e => patchReq('amount')(e.target.value)}
                placeholder="e.g. 14400"
              />
            </div>
          </div>
          <div className="fuel-form-group">
            <label className="fuel-form-label">Description *</label>
            <textarea 
              className="fuel-form-textarea"
              placeholder="Provide detailed description of the request..." 
              value={reqForm.description} 
              onChange={e => patchReq('description')(e.target.value)}
            />
            {reqErrors.description && <small className="fuel-form-error">{reqErrors.description}</small>}
          </div>
          {reqForm.requestType === 'Fuel' && reqForm.amount && (
            <div className="fuel-form-hint">
              Estimated cost: <strong>{fmtCost(Number(reqForm.amount))}</strong>
            </div>
          )}
        </div>
        <div className="fuel-modal-footer">
          <button className="fuel-secondary-button" onClick={closeModal}>Cancel</button>
          <button className="fuel-primary-button" onClick={submitRequest}>Submit Request</button>
        </div>
      </div>
    </div>
  );

  const renderLogEntryModal = () => (
    <div className="fuel-modal-overlay" onClick={closeModal}>
      <div className="fuel-modal" onClick={e => e.stopPropagation()}>
        <div className="fuel-modal-header">
          <div>
            <h2 className="fuel-modal-title">Log Fuel Fill</h2>
            <p className="fuel-modal-subtitle">Record a completed fuel fill-up</p>
          </div>
          <button className="fuel-modal-close" onClick={closeModal}>&times;</button>
        </div>
        <div className="fuel-modal-body">
          <div className="fuel-form-grid">
            <div className="fuel-form-group">
              <label className="fuel-form-label">Vehicle *</label>
              <select 
                className="fuel-form-select"
                value={logForm.numberPlate} 
                onChange={e => patchLog('numberPlate')(e.target.value)}
              >
                <option value="">Select Vehicle</option>
                {numberPlates.filter(p => p.status === 'active').map(p => (
                  <option key={p.id} value={p.plate_number}>{p.plate_number}</option>
                ))}
              </select>
              {logErrors.numberPlate && <small className="fuel-form-error">{logErrors.numberPlate}</small>}
            </div>
            <div className="fuel-form-group">
              <label className="fuel-form-label">Date *</label>
              <input 
                type="date"
                className="fuel-form-input"
                value={logForm.date} 
                onChange={e => patchLog('date')(e.target.value)}
              />
              {logErrors.date && <small className="fuel-form-error">{logErrors.date}</small>}
            </div>
            <div className="fuel-form-group">
              <label className="fuel-form-label">Litres Filled *</label>
              <input 
                type="number"
                className="fuel-form-input"
                value={logForm.litresFilled} 
                onChange={e => patchLog('litresFilled')(e.target.value)}
                placeholder="e.g. 80"
              />
              {logErrors.litresFilled && <small className="fuel-form-error">{logErrors.litresFilled}</small>}
            </div>
            <div className="fuel-form-group">
              <label className="fuel-form-label">Cost per Litre (KES) *</label>
              <input 
                type="number"
                className="fuel-form-input"
                value={logForm.costPerLitre} 
                onChange={e => patchLog('costPerLitre')(e.target.value)}
                placeholder="180"
              />
              {logErrors.costPerLitre && <small className="fuel-form-error">{logErrors.costPerLitre}</small>}
            </div>
            <div className="fuel-form-group">
              <label className="fuel-form-label">Odometer Before (km)</label>
              <input 
                type="number"
                className="fuel-form-input"
                value={logForm.odometerBefore} 
                onChange={e => patchLog('odometerBefore')(e.target.value)}
                placeholder="e.g. 44890"
              />
            </div>
            <div className="fuel-form-group">
              <label className="fuel-form-label">Odometer After (km)</label>
              <input 
                type="number"
                className="fuel-form-input"
                value={logForm.odometerAfter} 
                onChange={e => patchLog('odometerAfter')(e.target.value)}
                placeholder="e.g. 45230"
              />
            </div>
          </div>
          <div className="fuel-form-group">
            <label className="fuel-form-label">Additional Notes (Optional)</label>
            <textarea 
              className="fuel-form-textarea"
              placeholder="Any additional notes about this fill-up..." 
              value={logForm.description} 
              onChange={e => patchLog('description')(e.target.value)}
            />
          </div>
          {logForm.litresFilled && logForm.costPerLitre && (
            <div className="fuel-form-hint">
              Total cost: <strong>{fmtCost(Number(logForm.litresFilled) * Number(logForm.costPerLitre))}</strong>
              {logForm.odometerBefore && logForm.odometerAfter && Number(logForm.odometerAfter) > Number(logForm.odometerBefore) && (
                <>
                  <br />
                  Consumption: <strong>
                    {((Number(logForm.litresFilled) / (Number(logForm.odometerAfter) - Number(logForm.odometerBefore))) * 100).toFixed(1)} L/100km
                  </strong>
                </>
              )}
            </div>
          )}
        </div>
        <div className="fuel-modal-footer">
          <button className="fuel-secondary-button" onClick={closeModal}>Cancel</button>
          <button className="fuel-primary-button" onClick={submitLog}>Save Log Entry</button>
        </div>
      </div>
    </div>
  );

  const renderRejectModal = () => (
    <div className="fuel-modal-overlay" onClick={closeModal}>
      <div className="fuel-modal fuel-modal-small" onClick={e => e.stopPropagation()}>
        <div className="fuel-modal-header">
          <div>
            <h2 className="fuel-modal-title">Reject Request</h2>
            <p className="fuel-modal-subtitle">Request #{selectedRequest?.id} — {selectedRequest?.numberPlate}</p>
          </div>
          <button className="fuel-modal-close" onClick={closeModal}>&times;</button>
        </div>
        <div className="fuel-modal-body">
          <label className="fuel-form-label">Reason for Rejection</label>
          <textarea 
            className="fuel-form-textarea"
            placeholder="Explain why this request is being rejected…" 
            value={rejectReason} 
            onChange={e => setRejectReason(e.target.value)} 
          />
        </div>
        <div className="fuel-modal-footer">
          <button className="fuel-secondary-button" onClick={closeModal}>Cancel</button>
          <button className="fuel-danger-button" onClick={rejectRequest}>Confirm Rejection</button>
        </div>
      </div>
    </div>
  );

  const renderViewRequestModal = () => {
    if (!selectedRequest) return null;
    const r = selectedRequest;
    return (
      <div className="fuel-modal-overlay" onClick={closeModal}>
        <div className="fuel-modal" onClick={e => e.stopPropagation()}>
          <div className="fuel-modal-header">
            <div>
              <h2 className="fuel-modal-title">Request #{r.id}</h2>
              <p className="fuel-modal-subtitle">{r.numberPlate} · {r.requestType}</p>
            </div>
            <div className="fuel-modal-header-actions">
              <span className={`fuel-status-badge fuel-status-${r.status.toLowerCase()}`}>
                {r.status}
              </span>
              <button className="fuel-modal-close" onClick={closeModal}>&times;</button>
            </div>
          </div>
          <div className="fuel-modal-body">
            <div className="fuel-detail-grid">
              <div><small>Vehicle</small><div>{r.numberPlate}</div></div>
              <div><small>Requested By</small><div>{r.requestedBy}</div></div>
              <div><small>Request Date</small><div>{fmtDate(r.requestDate)}</div></div>
              <div><small>Request Time</small><div>{r.requestTime}</div></div>
              <div><small>Request Type</small><div>{r.requestType}</div></div>
              <div><small>Category</small><div>{r.category}</div></div>
              <div><small>Current Mileage</small><div>{fmt(r.currentMileage)} km</div></div>
              <div><small>Amount</small><div>{r.amount ? fmtCost(r.amount) : '—'}</div></div>
              <div className="fuel-detail-full"><small>Description</small><div>{r.description}</div></div>
              {r.status !== 'Pending' && (
                <div><small>Confirmed By</small><div>{r.confirmedBy || '—'}</div></div>
              )}
              {r.status === 'Rejected' && (
                <div className="fuel-detail-full"><small>Rejection Reason</small><div>No specific reason provided</div></div>
              )}
            </div>
          </div>
          <div className="fuel-modal-footer">
            <button className="fuel-secondary-button" onClick={closeModal}>Close</button>
            {r.status === 'Pending' && (
              <>
                <button className="fuel-danger-button" onClick={() => { setSelectedRequest(r); setModalType('reject'); }}>Reject</button>
                <button className="fuel-success-button" onClick={() => { approveRequest(r); closeModal(); }}>Approve</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fuel-management-container">
      <div className="fuel-management-header">
        <h1>{section.heading}</h1>
        <p>{section.description}</p>
      </div>

      {/* Tab Navigation */}
      <div className="fuel-tab-navigation">
        {tabs.map((tab) => {
          let badge = null;
          if (tab === 'Fuel Approvals' && pendingRequests.length > 0) {
            badge = <span className="fuel-tab-badge">{pendingRequests.length}</span>;
          } else if (tab === 'Mileage Anomalies' && anomalies.filter(a => a.severity === 'High').length > 0) {
            badge = <span className="fuel-tab-badge high-risk">{anomalies.filter(a => a.severity === 'High').length}</span>;
          }
          
          return (
            <button 
              key={tab} 
              className={`fuel-tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {badge}
            </button>
          );
        })}
      </div>

      {renderDashboardContent()}

      {/* Modals */}
      {modalType
        ? createPortal(
            <>
              {modalType === 'new-request' && renderNewRequestModal()}
              {modalType === 'log-entry' && renderLogEntryModal()}
              {modalType === 'reject' && renderRejectModal()}
              {modalType === 'view-request' && renderViewRequestModal()}
            </>,
            document.body
          )
        : null}
    </div>
  );
};

export default FuelManagement;