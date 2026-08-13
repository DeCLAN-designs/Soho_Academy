import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

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
      const response = await axiosInstance.get('/auth/me');
      return response.data?.data || response.data || {};
    } catch (error) {
      console.error('getCurrentUser error:', error);
      throw error;
    }
  },
};

// ─── Context ─────────────────────────────────────────────────────────────────

interface FuelManagementContextType {
  requests: FuelRequest[];
  logs: FuelLog[];
  numberPlates: NumberPlate[];
  vehicleDetails: VehicleDetail[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  anomalies: MileageAnomaly[];
  refreshData: () => Promise<void>;
  approveRequest: (req: FuelRequest) => Promise<void>;
  rejectRequest: (req: FuelRequest, reason: string) => Promise<void>;
  createRequest: (data: Partial<FuelRequest>) => Promise<void>;
  createLog: (data: Partial<FuelLog>) => Promise<void>;
}

const FuelManagementContext = createContext<FuelManagementContextType | null>(null);

export const useFuelManagement = () => {
  const context = useContext(FuelManagementContext);
  if (!context) {
    throw new Error('useFuelManagement must be used within FuelManagementProvider');
  }
  return context;
};

interface FuelManagementProviderProps {
  children: React.ReactNode;
}

export const FuelManagementProvider: React.FC<FuelManagementProviderProps> = ({ children }) => {
  const [requests, setRequests] = useState<FuelRequest[]>([]);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [numberPlates, setNumberPlates] = useState<NumberPlate[]>([]);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetail[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<MileageAnomaly[]>([]);

  const initialFetchDone = useRef(false);
  const isMounted = useRef(true);

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

  const refreshData = useCallback(() => {
    return fetchAllData();
  }, [fetchAllData]);

  const approveRequest = useCallback(async (req: FuelRequest) => {
    try {
      const updated = await apiService.updateFuelRequestStatus(
        req.id, 
        'Approved', 
        currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Fuel Manager'
      );
      setRequests(prev =>
        prev.map(r => r.id === req.id ? { ...r, status: 'Approved', confirmedBy: updated.confirmedBy } : r)
      );
    } catch (err) {
      console.error('Error approving request:', err);
      throw err;
    }
  }, [currentUser]);

  const rejectRequest = useCallback(async (req: FuelRequest, reason: string) => {
    try {
      const updated = await apiService.updateFuelRequestStatus(
        req.id,
        'Rejected',
        currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Fuel Manager',
        reason
      );
      setRequests(prev =>
        prev.map(r =>
          r.id === req.id
            ? { ...r, status: 'Rejected', confirmedBy: updated.confirmedBy }
            : r
        )
      );
    } catch (err) {
      console.error('Error rejecting request:', err);
      throw err;
    }
  }, [currentUser]);

  const createRequest = useCallback(async (data: Partial<FuelRequest>) => {
    try {
      const created = await apiService.createFuelRequest(data);
      setRequests(prev => [created, ...prev]);
    } catch (err) {
      console.error('Error creating request:', err);
      throw err;
    }
  }, []);

  const createLog = useCallback(async (data: Partial<FuelLog>) => {
    try {
      const created = await apiService.createFuelLog(data);
      setLogs(prev => [created as FuelLog, ...prev]);
    } catch (err) {
      console.error('Error creating log:', err);
      throw err;
    }
  }, []);

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

  const value: FuelManagementContextType = {
    requests,
    logs,
    numberPlates,
    vehicleDetails,
    currentUser,
    loading,
    error,
    anomalies,
    refreshData,
    approveRequest,
    rejectRequest,
    createRequest,
    createLog,
  };

  return (
    <FuelManagementContext.Provider value={value}>
      {children}
    </FuelManagementContext.Provider>
  );
};

export type { FuelRequest, FuelLog, NumberPlate, User, VehicleDetail, MileageAnomaly, FuelRequestStatus, RequestType, RequestCategory };
