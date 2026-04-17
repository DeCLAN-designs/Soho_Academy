const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL =
  (configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl
    : "/api"
  ).replace(/\/$/, "");
const AUTH_TOKEN_KEY = "soho_auth_token";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type ValidationError = {
  field: string;
  message: string;
};

type ErrorEnvelope = {
  success?: boolean;
  message?: string;
  errors?: ValidationError[];
};

export class ApiError extends Error {
  status: number;
  errors: ValidationError[];

  constructor(message: string, status: number, errors: ValidationError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

// Import error handling utilities
const isNetworkError = (error: any): boolean => {
  return (
    error instanceof TypeError && 
    (error.message === 'Failed to fetch' || 
     error.message.includes('NetworkError') ||
     error.message.includes('fetch') ||
     error.message.includes('ERR_NETWORK') ||
     error.message.includes('ERR_INTERNET_DISCONNECTED'))
  ) || (
    // Handle DOMException timeout errors
    error instanceof DOMException && error.name === 'TimeoutError'
  )
}

const isServerError = (error: any): boolean => {
  return error instanceof ApiError && (error.status >= 500 || error.status === 0)
}

const isConnectionError = (error: any): boolean => {
  return isNetworkError(error) || isServerError(error)
}

// Clear all authentication data
const clearAuthData = (): void => {
  if (typeof window === 'undefined') return

  const keysToRemove = [
    'soho_auth_token',
    'soho_user_role',
    'soho_user_number_plate',
    'soho_user_first_name',
    'soho_user_last_name',
    'soho_user_profile_photo_url'
  ]

  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })
}

// Redirect to login page
const redirectToLogin = (): void => {
  if (typeof window === 'undefined') return

  // Clear auth data first
  clearAuthData()
  
  // Redirect to login page
  window.location.href = '/login'
}

// Enhanced error handler for API calls
const handleApiError = (error: any): void => {
  console.error('API Error:', error)

  // Check if it's a connection/server error
  if (isConnectionError(error)) {
    console.log('Connection error detected, clearing auth data and redirecting to login')
    redirectToLogin()
    return
  }

  // Handle authentication errors (401)
  if (error instanceof ApiError && error.status === 401) {
    console.log('Authentication error detected, clearing auth data and redirecting to login')
    redirectToLogin()
    return
  }

  // Handle forbidden errors (403)
  if (error instanceof ApiError && error.status === 403) {
    console.log('Forbidden error detected, clearing auth data and redirecting to login')
    redirectToLogin()
    return
  }
}

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  parentIdType: string;
  parentIdNumber: string;
  numberPlate: string;
  role: string;
  password: string;
};

export type StudentRecord = {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  grade: string;
  stream: string;
  parentContact: string;
  admissionDate: string | null;
  status: "active" | "withdrawn";
  withdrawalDate: string | null;
  withdrawalReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ParentChildRecord = {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  grade: string;
  stream: string;
  status: "active" | "withdrawn";
  admissionDate: string | null;
  withdrawalDate: string | null;
};

export type ParentTransportRequestType =
  | "route_change"
  | "complaint"
  | "general_support";

export type ParentTransportRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type ParentTransportRequestRecord = {
  id: number;
  parentUserId: number;
  parentName: string | null;
  parentEmail: string | null;
  studentId: number;
  studentName: string;
  admissionNumber: string;
  grade: string;
  stream: string;
  currentRouteId: number | null;
  currentRouteCode: string | null;
  currentRouteName: string | null;
  requestType: ParentTransportRequestType;
  requestTitle: string;
  requestDetails: string;
  requestedPickupLocation: string | null;
  requestedDropoffLocation: string | null;
  preferredEffectiveDate: string | null;
  status: ParentTransportRequestStatus;
  managerReviewNotes: string | null;
  reviewedByUserId: number | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLogRecord = {
  id: number;
  actorUserId: number | null;
  actorName: string | null;
  actorRole: string | null;
  domain: string;
  entityType: string;
  entityId: number;
  action: string;
  previousState: unknown;
  newState: unknown;
  createdAt: string;
};

export type ParentTransportRequestDetailRecord = {
  request: ParentTransportRequestRecord;
  auditLogs: AuditLogRecord[];
};

export type CreateParentTransportRequestPayload = {
  studentId: number;
  requestType: ParentTransportRequestType;
  requestTitle: string;
  requestDetails: string;
  requestedPickupLocation?: string | null;
  requestedDropoffLocation?: string | null;
  preferredEffectiveDate?: string | null;
};

export type ReviewParentTransportRequestPayload = {
  status: Extract<ParentTransportRequestStatus, "APPROVED" | "REJECTED">;
  managerReviewNotes?: string | null;
};

export type ParentContactChangeRecord = {
  id: number;
  studentId: number;
  studentName: string;
  previousContact: string;
  newContact: string;
  changedByUserId: number;
  changedAt: string;
};

export type StudentDashboardData = {
  students: StudentRecord[];
  admissions: StudentRecord[];
  withdrawals: StudentRecord[];
  parentContactChanges: ParentContactChangeRecord[];
  summary: {
    totalStudents: number;
    activeStudents: number;
    withdrawnStudents: number;
  };
};

export type CreateStudentAdmissionPayload = {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  grade: string;
  stream: string;
  parentContact: string;
  parentIdType: string;
  parentIdNumber: string;
  admissionDate?: string;
};

export type UpdateStudentParentContactPayload = {
  parentContact: string;
};

export type UpdateStudentParentIdentifierPayload = {
  parentIdType: string;
  parentIdNumber: string;
};

export type WithdrawStudentPayload = {
  withdrawalDate?: string;
  withdrawalReason?: string;
};

export type UpdateStudentMasterDataPayload = {
  admissionNumber?: string;
  firstName?: string;
  lastName?: string;
  grade?: string;
  stream?: string;
  admissionDate?: string;
};

export type FuelMaintenanceRequestType =
  | "Fuel"
  | "Service"
  | "Repair and Maintenance"
  | "Compliance";

export type FuelMaintenanceCategory =
  | "Fuels & Oils"
  | "Body Works and Body Parts"
  | "Mechanical"
  | "Wiring"
  | "Puncture & Tires"
  | "Insurance"
  | "RSL"
  | "Inspection / Speed Governors";

export type CreateFuelMaintenanceRequestPayload = {
  requestDate: string;
  requestTime: string;
  numberPlate: string;
  currentMileage: number;
  requestType: FuelMaintenanceRequestType;
  category: FuelMaintenanceCategory;
  description: string;
  amount?: number;
  confirmedBy: string;
};

export type FuelMaintenanceRequestRecord = {
  id: number;
  requestDate: string;
  requestTime: string;
  numberPlate: string;
  currentMileage: number;
  requestType: FuelMaintenanceRequestType;
  requestedBy: string;
  category: FuelMaintenanceCategory;
  description: string;
  amount: number | null;
  confirmedBy: string;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
};

export type IncidentUploadRecord = {
  id: number;
  userId: number;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  createdAt: string;
};

export type DriverIncidentReportRecord = {
  id: number;
  incidentDate: string;
  incidentTime: string;
  pointOfIncident: string;
  childrenInvolved: string;
  description: string;
  actionTaken: string;
  numberPlate: string;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  uploads: IncidentUploadRecord[];
};

export type ComplaintTiming = "Morning" | "Evening";

export type ComplaintType =
  | "Learner"
  | "Driver"
  | "Bus"
  | "Community"
  | "Bus Assistant"
  | "Other";

export type ComplaintAttachmentRecord = {
  id: number;
  userId: number;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  createdAt: string;
};

export type DriverComplaintFormMeta = {
  requestedBy: string;
  contactPhoneNumber: string;
  numberPlates: string[];
  assignedNumberPlate: string | null;
  timingOptions: ComplaintTiming[];
  tripNumbers: number[];
  complaintTypes: ComplaintType[];
};

export type DriverComplaintReportRecord = {
  id: number;
  requestedBy: string;
  contactPhoneNumber: string;
  numberPlate: string;
  timing: ComplaintTiming;
  tripNumber: number;
  complaintType: ComplaintType;
  learnerName: string | null;
  details: string;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  attachment: ComplaintAttachmentRecord | null;
};

export type ComplianceDocumentRelatedTo = "Driver";

export type ComplianceDocumentType =
  | "Insurance"
  | "NTSA Inspection"
  | "Speed Governor"
  | "RSL"
  | "Driving License"
  | "PSV"
  | "Police Clearance"
  | "Warranty Certificate"
  | "Other";

export type DriverComplianceDocumentRecord = {
  id: number;
  relatedTo: ComplianceDocumentRelatedTo;
  documentType: ComplianceDocumentType;
  validFromDate: string;
  validToDate: string;
  uploadedBy: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
};

export type AuthenticatedUserRecord = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  numberPlate: string | null;
  profilePhotoUrl: string | null;
};

const toUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const getAccessToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY)?.trim() || "";
};

const buildHeaders = (isJsonPayload = false) => {
  const headers: Record<string, string> = {};

  if (isJsonPayload) {
    headers["Content-Type"] = "application/json";
  }

  const token = getAccessToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parsePayload = async (response: Response) => {
  const body = await response.text();
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
};

const readMessage = (payload: unknown) => {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return null;
};

const enhancedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    const response = await fetch(url, {
      ...options,
      // Increase timeout to 30 seconds for better reliability
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    return response
  } catch (error) {
    console.error('Fetch error:', error)
    
    // Handle timeout errors specifically
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error('Request timed out. Please check your internet connection and try again.')
    }
    
    // Handle network errors
    if (isNetworkError(error)) {
      throw new Error('Network connection failed. Server might be down or unavailable.')
    }
    
    throw error
  }
}

const post = async <TPayload, TResponse>(
  path: string,
  payload: TPayload
): Promise<ApiEnvelope<TResponse>> => {
  try {
    const response = await enhancedFetch(toUrl(path), {
      method: "POST",
      headers: buildHeaders(true),
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const parsedPayload = await parsePayload(response);

    if (!response.ok) {
      const errorPayload =
        parsedPayload && typeof parsedPayload === "object"
          ? (parsedPayload as ErrorEnvelope)
          : null;
      const errors = Array.isArray(errorPayload?.errors) ? errorPayload.errors : [];
      const firstValidationMessage = errors.length > 0 ? errors[0].message : null;
      const message =
        firstValidationMessage ||
        readMessage(parsedPayload) ||
        `Request failed with status ${response.status}.`;

      const apiError = new ApiError(message, response.status, errors);
      handleApiError(apiError);
      throw apiError;
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
      throw new Error("Invalid response from server.");
    }

    return parsedPayload as ApiEnvelope<TResponse>;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

const postFormData = async <TResponse>(
  path: string,
  payload: FormData
): Promise<ApiEnvelope<TResponse>> => {
  try {
    const response = await enhancedFetch(toUrl(path), {
      method: "POST",
      headers: buildHeaders(false),
      credentials: "include",
      body: payload,
    });

    const parsedPayload = await parsePayload(response);

    if (!response.ok) {
      const errorPayload =
        parsedPayload && typeof parsedPayload === "object"
          ? (parsedPayload as ErrorEnvelope)
          : null;
      const errors = Array.isArray(errorPayload?.errors) ? errorPayload.errors : [];
      const firstValidationMessage = errors.length > 0 ? errors[0].message : null;
      const message =
        firstValidationMessage ||
        readMessage(parsedPayload) ||
        `Request failed with status ${response.status}.`;

      const apiError = new ApiError(message, response.status, errors);
      handleApiError(apiError);
      throw apiError;
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
      throw new Error("Invalid response from server.");
    }

    return parsedPayload as ApiEnvelope<TResponse>;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

const patch = async <TPayload, TResponse>(
  path: string,
  payload: TPayload
): Promise<ApiEnvelope<TResponse>> => {
  try {
    const response = await enhancedFetch(toUrl(path), {
      method: "PATCH",
      headers: buildHeaders(true),
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const parsedPayload = await parsePayload(response);

    if (!response.ok) {
      const errorPayload =
        parsedPayload && typeof parsedPayload === "object"
          ? (parsedPayload as ErrorEnvelope)
          : null;
      const errors = Array.isArray(errorPayload?.errors) ? errorPayload.errors : [];
      const firstValidationMessage = errors.length > 0 ? errors[0].message : null;
      const message =
        firstValidationMessage ||
        readMessage(parsedPayload) ||
        `Request failed with status ${response.status}.`;

      const apiError = new ApiError(message, response.status, errors);
      handleApiError(apiError);
      throw apiError;
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
      throw new Error("Invalid response from server.");
    }

    return parsedPayload as ApiEnvelope<TResponse>;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

const patchFormData = async <TResponse>(
  path: string,
  payload: FormData
): Promise<ApiEnvelope<TResponse>> => {
  try {
    const response = await enhancedFetch(toUrl(path), {
      method: "PATCH",
      headers: buildHeaders(false),
      credentials: "include",
      body: payload,
    });

    const parsedPayload = await parsePayload(response);

    if (!response.ok) {
      const errorPayload =
        parsedPayload && typeof parsedPayload === "object"
          ? (parsedPayload as ErrorEnvelope)
          : null;
      const errors = Array.isArray(errorPayload?.errors) ? errorPayload.errors : [];
      const firstValidationMessage = errors.length > 0 ? errors[0].message : null;
      const message =
        firstValidationMessage ||
        readMessage(parsedPayload) ||
        `Request failed with status ${response.status}.`;

      const apiError = new ApiError(message, response.status, errors);
      handleApiError(apiError);
      throw apiError;
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
      throw new Error("Invalid response from server.");
    }

    return parsedPayload as ApiEnvelope<TResponse>;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

const get = async <TResponse>(path: string): Promise<ApiEnvelope<TResponse>> => {
  try {
    const response = await enhancedFetch(toUrl(path), {
      method: "GET",
      headers: buildHeaders(false),
      credentials: "include",
      // Avoid HTTP cache revalidation (304) for API endpoints.
      cache: "no-store",
    });

    const parsedPayload = await parsePayload(response);

    if (!response.ok) {
      const errorPayload =
        parsedPayload && typeof parsedPayload === "object"
          ? (parsedPayload as ErrorEnvelope)
          : null;
      const errors = Array.isArray(errorPayload?.errors) ? errorPayload.errors : [];
      const firstValidationMessage = errors.length > 0 ? errors[0].message : null;
      const message =
        firstValidationMessage ||
        readMessage(parsedPayload) ||
        `Request failed with status ${response.status}.`;

      const apiError = new ApiError(message, response.status, errors);
      handleApiError(apiError);
      throw apiError;
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
      throw new Error("Invalid response from server.");
    }

    return parsedPayload as ApiEnvelope<TResponse>;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const authApi = {
  login: (payload: LoginPayload) =>
    post<
      LoginPayload,
      {
        email: string;
        firstName: string;
        lastName: string;
        phoneNumber: string;
        role: string;
        token: string;
        numberPlate: string | null;
        profilePhotoUrl: string | null;
      }
    >(
      "/auth/login",
      payload
    ),
  register: (payload: RegisterPayload) =>
    post<RegisterPayload, { email: string; role: string }>(
      "/auth/register",
      payload
    ),
  getNumberPlates: () =>
    get<{ numberPlates: string[] }>("/auth/number-plates"),
  me: () =>
    get<AuthenticatedUserRecord>("/auth/me"),
  updateProfile: (payload: FormData) =>
    patchFormData<{ user: AuthenticatedUserRecord }>("/auth/profile", payload),
  logout: () =>
    post<{}, {}>("/auth/logout", {}),
};

export const studentApi = {
  getDashboardData: () => get<StudentDashboardData>("/students"),
  createAdmission: (payload: CreateStudentAdmissionPayload) =>
    post<CreateStudentAdmissionPayload, { student: StudentRecord }>(
      "/students/admissions",
      payload
    ),
  updateParentContact: (
    studentId: number,
    payload: UpdateStudentParentContactPayload
  ) =>
    patch<UpdateStudentParentContactPayload, { student: StudentRecord }>(
      `/students/${studentId}/parent-contact`,
      payload
    ),
  updateParentIdentifier: (
    studentId: number,
    payload: UpdateStudentParentIdentifierPayload
  ) =>
    patch<
      UpdateStudentParentIdentifierPayload,
      { student: StudentRecord }
    >(`/students/${studentId}/parent-identifier`, payload),
  withdrawStudent: (studentId: number, payload: WithdrawStudentPayload) =>
    patch<WithdrawStudentPayload, { student: StudentRecord }>(
      `/students/${studentId}/withdrawal`,
      payload
    ),
  updateMasterData: (studentId: number, payload: UpdateStudentMasterDataPayload) =>
    patch<UpdateStudentMasterDataPayload, { student: StudentRecord }>(
      `/students/${studentId}/master-data`,
      payload
    ),
};

export const parentApi = {
  getChildren: () => get<{ children: ParentChildRecord[] }>("/parent/children"),
  getTransportRequests: () =>
    get<{ requests: ParentTransportRequestRecord[] }>("/parent/transport-requests"),
  getTransportRequest: (requestId: number) =>
    get<ParentTransportRequestDetailRecord>(`/parent/transport-requests/${requestId}`),
  createTransportRequest: (payload: CreateParentTransportRequestPayload) =>
    post<CreateParentTransportRequestPayload, ParentTransportRequestDetailRecord>(
      "/parent/transport-requests",
      payload
    ),
};

export const fuelMaintenanceApi = {
  getRequests: () =>
    get<{ requests: FuelMaintenanceRequestRecord[] }>("/fuel-maintenance/requests"),
  createRequest: (payload: CreateFuelMaintenanceRequestPayload) =>
    post<CreateFuelMaintenanceRequestPayload, { request: FuelMaintenanceRequestRecord }>(
      "/fuel-maintenance/requests",
      payload
    ),
};

export const driverIncidentApi = {
  getReports: () => get<{ reports: DriverIncidentReportRecord[] }>("/incidents/reports"),
  createReport: (payload: FormData) =>
    postFormData<{ report: DriverIncidentReportRecord }>("/incidents/reports", payload),
};

export const driverComplaintApi = {
  getMeta: () => get<DriverComplaintFormMeta>("/complaints/meta"),
  getReports: () => get<{ reports: DriverComplaintReportRecord[] }>("/complaints/reports"),
  createReport: (payload: FormData) =>
    postFormData<{ report: DriverComplaintReportRecord }>("/complaints/reports", payload),
};

export const driverComplianceDocumentApi = {
  getDocuments: () =>
    get<{ documents: DriverComplianceDocumentRecord[] }>("/compliance-documents/documents"),
  createDocument: (payload: FormData) =>
    postFormData<{ document: DriverComplianceDocumentRecord }>(
      "/compliance-documents/documents",
      payload
    ),
};

export type TransportVehicleRecord = {
  plateNumber: string;
  capacity: number;
  insuranceExpiryDate: string | null;
  inspectionExpiryDate: string | null;
  status: "active" | "inactive";
};

export type TransportStaffRecord = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber: string;
};

export type TransportStudentRecord = {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  grade: string;
  stream: string;
};

export type RouteStopPayload = {
  stopType: "pickup" | "dropoff";
  stopOrder: number;
  location: string;
  timeAllocation?: string | null;
};

export type CreateRoutePayload = {
  routeCode: string;
  routeName: string;
  routeDate: string;
  startTime: string;
  endTime: string;
  stops: RouteStopPayload[];
};

export type RouteRecord = {
  id: number;
  routeCode: string;
  routeName: string;
  routeDate: string | null;
  startTime: string | null;
  endTime: string | null;
  status: "active" | "inactive" | "completed";
  createdAt: string;
};

export type AssignVehicleStaffPayload = {
  numberPlate: string;
  driverUserId: number;
  assistantUserId?: number | null;
};

export type AssignStudentsPayload = {
  studentIds: number[];
};

export type TripStatus = "scheduled" | "started" | "in_progress" | "completed";

export type TripRecord = {
  id: number;
  routeId: number;
  routeAssignmentId: number;
  routeCode: string;
  routeName: string;
  routeDate: string | null;
  startTime: string | null;
  endTime: string | null;
  tripDate: string | null;
  scheduledStartTime: string | null;
  numberPlate: string;
  driverUserId: number;
  assistantUserId: number | null;
  driverName: string | null;
  assistantName: string | null;
  status: TripStatus;
  totalStudents: number;
  boardedStudents: number;
  droppedOffStudents: number;
  startedAt: string | null;
  inProgressAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type TripAttendanceRecord = {
  studentId: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  grade: string;
  stream: string;
  boardingStatus: "not_boarded" | "boarded" | "dropped_off";
  boardedAt: string | null;
  droppedOffAt: string | null;
};

export type TripEventRecord = {
  id: number;
  eventType: "scheduled" | "started" | "in_progress" | "completed" | "attendance_updated";
  description: string;
  actorUserId: number | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
};

export type TripDetailRecord = {
  trip: TripRecord;
  attendance: TripAttendanceRecord[];
  events: TripEventRecord[];
};

export type UpdateTripStatusPayload = {
  status: Extract<TripStatus, "started" | "in_progress" | "completed">;
};

export type UpdateTripAttendancePayload = {
  boardingStatus: "boarded" | "dropped_off";
};

export const transportManagerApi = {
  getRoutes: () => get<{ routes: RouteRecord[] }>("/transport-manager/routes"),
  getVehicles: () =>
    get<{ vehicles: TransportVehicleRecord[] }>("/transport-manager/vehicles"),
  getStaff: () => get<{ staff: TransportStaffRecord[] }>("/transport-manager/staff"),
  getStudents: () =>
    get<{ students: TransportStudentRecord[] }>("/transport-manager/students"),
  getTrips: () => get<{ trips: TripRecord[] }>("/transport-manager/trips"),
  getTrip: (tripId: number) =>
    get<TripDetailRecord>(`/transport-manager/trips/${tripId}`),
  getParentRequests: () =>
    get<{ requests: ParentTransportRequestRecord[] }>("/transport-manager/parent-requests"),
  getParentRequest: (requestId: number) =>
    get<ParentTransportRequestDetailRecord>(
      `/transport-manager/parent-requests/${requestId}`
    ),

  createRoute: (payload: CreateRoutePayload) =>
    post<CreateRoutePayload, { route: RouteRecord }>("/transport-manager/routes", payload),

  assignVehicleStaff: (
    routeId: number,
    payload: AssignVehicleStaffPayload
  ) =>
    post<
      AssignVehicleStaffPayload,
      { assigned: boolean }
    >(`/transport-manager/routes/${routeId}/assign-vehicle-staff`, payload),

  assignStudents: (routeId: number, payload: AssignStudentsPayload) =>
    post<AssignStudentsPayload, { assigned: boolean }>(
      `/transport-manager/routes/${routeId}/students`,
      payload
    ),

  createTrip: (routeId: number) =>
    post<{}, TripDetailRecord>(`/transport-manager/routes/${routeId}/trips`, {}),

  updateTripStatus: (tripId: number, payload: UpdateTripStatusPayload) =>
    patch<UpdateTripStatusPayload, TripDetailRecord>(
      `/transport-manager/trips/${tripId}/status`,
      payload
    ),

  updateTripAttendance: (
    tripId: number,
    studentId: number,
    payload: UpdateTripAttendancePayload
  ) =>
    patch<UpdateTripAttendancePayload, TripDetailRecord>(
      `/transport-manager/trips/${tripId}/students/${studentId}/attendance`,
      payload
    ),

  reviewParentRequest: (
    requestId: number,
    payload: ReviewParentTransportRequestPayload
  ) =>
    patch<ReviewParentTransportRequestPayload, ParentTransportRequestDetailRecord>(
      `/transport-manager/parent-requests/${requestId}/review`,
      payload
    ),

  // Compliance Documents
  getComplianceDocuments: () =>
    get<{ documents: DriverComplianceDocumentRecord[] }>("/compliance-documents/documents"),

  // Complaints
  getComplaints: () =>
    get<{ reports: DriverComplaintReportRecord[] }>("/complaints/reports"),
};
