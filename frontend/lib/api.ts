/**
 * Centralized API client for the FleetGuard FastAPI backend.
 *
 * All backend requests go through this module so the base URL, JWT
 * header, and error handling live in one place.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Token helpers (localStorage)
// ---------------------------------------------------------------------------

const TOKEN_KEY = "fleetguard.jwt";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Low-level fetch wrapper
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  /** Override the default Authorization header. */
  token?: string | null;
  /** If true, do not send Authorization even if a token exists. */
  noAuth?: boolean;
};

/**
 * Make a request to the FastAPI backend.
 *
 * The backend wraps every success response in { success: true, data: ... }.
 * This helper unwraps that envelope and throws on error.
 */
export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, token, noAuth } = opts;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!noAuth) {
    const jwt = token ?? getStoredToken();
    if (jwt) {
      headers["Authorization"] = `Bearer ${jwt}`;
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Try to parse the JSON regardless of status so we can extract error info.
  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, `Unexpected response (HTTP ${res.status})`);
  }

  if (!res.ok) {
    // Backend error envelope: { success: false, error: { code, message } }
    const errObj = json?.error as { code?: string; message?: string } | undefined;
    throw new ApiError(
      res.status,
      errObj?.message ?? `Request failed (HTTP ${res.status})`,
      errObj?.code,
    );
  }

  // Backend success envelope: { success: true, data: ... }
  return (json?.data ?? json) as T;
}

// ---------------------------------------------------------------------------
// Typed API helpers
// ---------------------------------------------------------------------------

// ---- Auth ----

export type BackendLoginResponse = {
  accessToken: string;
  tokenType: string;
  role: string;
  userId: number;
};

export type BackendUser = {
  userId: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export type BackendRegisterRequest = {
  email: string;
  password: string;
  fullName: string;
  role?: string;
};

export const authApi = {
  login(email: string, password: string) {
    return apiRequest<BackendLoginResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      noAuth: true,
    });
  },

  register(payload: BackendRegisterRequest) {
    return apiRequest<BackendUser>("/api/auth/register", {
      method: "POST",
      body: payload,
      noAuth: true,
    });
  },

  me() {
    return apiRequest<BackendUser>("/api/auth/me");
  },
};

// ---- Trucks ----

export type BackendTruck = {
  truckId: number;
  registrationNumber: string;
  ownerId: number;
  driverId: number | null;
  maxCapacityKg: number;
  currentLoadKg: number;
  currentLocation: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export const trucksApi = {
  list() {
    return apiRequest<BackendTruck[]>("/api/trucks");
  },

  get(truckId: number) {
    return apiRequest<BackendTruck>(`/api/trucks/${truckId}`);
  },

  create(payload: {
    registrationNumber: string;
    maxCapacityKg: number;
    currentLocation: string;
    status?: string;
    currentLoadKg?: number;
  }) {
    return apiRequest<BackendTruck>("/api/trucks", {
      method: "POST",
      body: payload,
    });
  },
};

// ---- Deliveries ----

export type BackendDelivery = {
  deliveryId: number;
  truckId: number | null;
  origin: string;
  destination: string;
  loadKg: number;
  deliveryStatus: string;
  assignedDriverId: number | null;
  estimatedDeliveryTime: string | null;
  createdAt: string;
};

export const deliveriesApi = {
  list() {
    return apiRequest<BackendDelivery[]>("/api/deliveries");
  },

  get(deliveryId: number) {
    return apiRequest<BackendDelivery>(`/api/deliveries/${deliveryId}`);
  },

  create(payload: {
    origin: string;
    destination: string;
    loadKg: number;
    truckId?: number;
  }) {
    return apiRequest<BackendDelivery>("/api/deliveries", {
      method: "POST",
      body: payload,
    });
  },
};

// ---- OSRM Route Calculation ----

export type OSRMRouteResult = {
  distanceKm: number;
  durationMinutes: number;
  geometry: unknown;
};

export const osrmApi = {
  calculate(payload: {
    startLatitude: number;
    startLongitude: number;
    destinationLatitude: number;
    destinationLongitude: number;
  }) {
    return apiRequest<OSRMRouteResult>("/api/routes/calculate", {
      method: "POST",
      body: payload,
    });
  },
};

// ---- Routes ----

export type BackendOptimizationResult = {
  resultId: number;
  routeId: number;
  source: string;
  recommendedRoute: string;
  estimatedTime: number;
  fuelSaving: number | null;
  reason: string;
  createdAt: string;
};

export type BackendRoute = {
  routeId: number;
  deliveryId: number;
  startLocation: string;
  destination: string;
  distanceKm: number;
  estimatedTimeMinutes: number;
  routeStatus: string;
  createdAt: string;
  latestOptimization: BackendOptimizationResult | null;
};

export type OptimizePayload = {
  problem?: string;
  deliveryPriority?: string;
  originLatitude?: number;
  originLongitude?: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
};

export type OptimizeResult = {
  contextSent: Record<string, unknown>;
  optimizer: {
    recommendedRoute: string;
    estimatedTime: number;
    fuelSaving?: number;
    reason: string;
    source: string;
    distanceKm?: number;
    [key: string]: unknown;
  };
  ai: {
    decision?: string;
    risk?: string;
    recommendedRoute: string;
    estimatedTime: number;
    fuelSaving?: number;
    reason: string;
    actions?: string[];
    source: string;
    [key: string]: unknown;
  };
  storedResultIds: number[];
  updatedRoute: BackendRoute;
};

export const routesApi = {
  list() {
    return apiRequest<BackendRoute[]>("/api/routes");
  },

  get(routeId: number) {
    return apiRequest<BackendRoute>(`/api/routes/${routeId}`);
  },

  create(payload: {
    deliveryId: number;
    startLocation: string;
    destination: string;
    distanceKm: number;
    estimatedTimeMinutes: number;
    routeStatus?: string;
  }) {
    return apiRequest<BackendRoute>("/api/routes", {
      method: "POST",
      body: payload,
    });
  },

  optimize(routeId: number, payload?: OptimizePayload) {
    return apiRequest<OptimizeResult>(`/api/routes/${routeId}/optimize`, {
      method: "POST",
      body: payload ?? {},
    });
  },
};

// ---- Simulations ----

export type ScenarioType =
  | "normal"
  | "heavy_traffic"
  | "road_closure"
  | "vehicle_breakdown"
  | "urgent_delivery"
  | "overloaded_vehicle"
  | "impossible_overdue_delivery";

export type SimulationRunResult = {
  simulated: boolean;
  scenario: string;
  generatedAt: string;
  optimizerContext: Record<string, unknown>;
  baseline: {
    distanceKm: number;
    estimatedTimeMinutes: number;
    fuelLiters: number | null;
    deadlineMinutesFromNow: number;
  };
  optimized?: {
    recommendedRoute: string;
    estimatedTime: number;
    fuelSaving?: number;
    reason: string;
    source: string;
  };
  feasible: boolean;
  failure: unknown;
  analytics: {
    totalDistanceKm: number;
    estimatedTravelDeliveryTimeMinutes: number;
    lateDeliveries: number;
    distanceReductionKm: number;
    distanceReductionPercent: number;
    delayReductionMinutes: number;
    delayReductionPercent: number;
    fuelSavingPercent: number | null;
    fuelSavedLiters: number | null;
    simulated: boolean;
  } | null;
  comparison: {
    simulated: boolean;
    baseline: { distanceKm: number; estimatedTimeMinutes: number };
    optimized: { distanceKm: number; estimatedTimeMinutes: number };
  } | null;
  note: string;
};

export type SimulationBatchResult = {
  simulated: boolean;
  runs: SimulationRunResult[];
  summary: {
    scenarioCount: number;
    feasibleScenarioCount: number;
    lateDeliveries: number;
    totalDistanceKm: number;
    estimatedTravelDeliveryTimeMinutes: number;
  };
  note: string;
};

export const simulationsApi = {
  run(payload: {
    scenario: ScenarioType;
    distanceKm?: number;
    estimatedTimeMinutes?: number;
    fuelLiters?: number;
  }) {
    return apiRequest<SimulationRunResult>("/api/simulations/run", {
      method: "POST",
      body: payload,
    });
  },

  runBatch(payload: {
    scenarios: ScenarioType[];
    distanceKm?: number;
    estimatedTimeMinutes?: number;
    fuelLiters?: number;
  }) {
    return apiRequest<SimulationBatchResult>("/api/simulations/run-batch", {
      method: "POST",
      body: payload,
    });
  },
};

// ---- Health ----

export const healthApi = {
  check() {
    return apiRequest<{ status: string }>("/api/health", { noAuth: true });
  },
};
