const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL =
  (configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl
    : "/api"
  ).replace(/\/$/, "");

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

const toUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
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
    headers: {
      "Content-Type": "application/json",
    },
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
    post<LoginPayload, { email: string; role: string; token: string }>(
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
