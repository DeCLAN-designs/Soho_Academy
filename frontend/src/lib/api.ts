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

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  numberPlate: string;
  role: string;
  password: string;
};

export type StudentRecord = {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  grade: string;
  parentContact: string;
  admissionDate: string | null;
  status: "active" | "withdrawn";
  withdrawalDate: string | null;
  withdrawalReason: string | null;
  createdAt: string;
  updatedAt: string;
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
  className: string;
  grade: string;
  parentContact: string;
  admissionDate?: string;
};

export type UpdateStudentParentContactPayload = {
  parentContact: string;
};

export type WithdrawStudentPayload = {
  withdrawalDate?: string;
  withdrawalReason?: string;
};

export type UpdateStudentMasterDataPayload = {
  admissionNumber?: string;
  firstName?: string;
  lastName?: string;
  className?: string;
  grade?: string;
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
  numberPlate: string;
  currentMileage: number;
  requestType: FuelMaintenanceRequestType;
  requestedBy: string;
  category: FuelMaintenanceCategory;
  description: string;
  amount?: number;
  confirmedBy: string;
};

export type FuelMaintenanceRequestRecord = {
  id: number;
  requestDate: string;
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

const post = async <TPayload, TResponse>(
  path: string,
  payload: TPayload
): Promise<ApiEnvelope<TResponse>> => {
  const response = await fetch(toUrl(path), {
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

    throw new ApiError(message, response.status, errors);
  }

  if (!parsedPayload || typeof parsedPayload !== "object") {
    throw new Error("Invalid response from server.");
  }

  return parsedPayload as ApiEnvelope<TResponse>;
};

const patch = async <TPayload, TResponse>(
  path: string,
  payload: TPayload
): Promise<ApiEnvelope<TResponse>> => {
  const response = await fetch(toUrl(path), {
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

    throw new ApiError(message, response.status, errors);
  }

  if (!parsedPayload || typeof parsedPayload !== "object") {
    throw new Error("Invalid response from server.");
  }

  return parsedPayload as ApiEnvelope<TResponse>;
};

const get = async <TResponse>(path: string): Promise<ApiEnvelope<TResponse>> => {
  const response = await fetch(toUrl(path), {
    method: "GET",
    headers: buildHeaders(false),
    credentials: "include",
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

    throw new ApiError(message, response.status, errors);
  }

  if (!parsedPayload || typeof parsedPayload !== "object") {
    throw new Error("Invalid response from server.");
  }

  return parsedPayload as ApiEnvelope<TResponse>;
};

export const authApi = {
  login: (payload: LoginPayload) =>
    post<
      LoginPayload,
      {
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        token: string;
        numberPlate: string | null;
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

export const fuelMaintenanceApi = {
  getRequests: () =>
    get<{ requests: FuelMaintenanceRequestRecord[] }>("/fuel-maintenance/requests"),
  createRequest: (payload: CreateFuelMaintenanceRequestPayload) =>
    post<CreateFuelMaintenanceRequestPayload, { request: FuelMaintenanceRequestRecord }>(
      "/fuel-maintenance/requests",
      payload
    ),
};
