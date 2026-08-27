/**
 * Shared TypeScript types for FleetGuard.
 * Keep these simple so they can later map to a real database/API.
 */

/** User account shown after sign-in. */
export type User = {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
  phone?: string;
  role: string;
};

/** Company fleet truck. */
export type TruckStatus =
  | "on-route"
  | "delayed"
  | "emergency"
  | "available"
  | "offline";

export type Truck = {
  id: string;
  driver: string;
  location: string;
  lat: number;
  lng: number;
  speed: number;
  load: number;
  capacity: number;
  status: TruckStatus;
  destination: string;
  eta: string;
  cargo?: string;
};

/** Partner company truck available for replacement. */
export type PartnerTruck = {
  id: string;
  company: string;
  location: string;
  lat: number;
  lng: number;
  distanceKm: number;
  capacity: number;
  load: number;
  status: "available" | "busy" | "offline";
  compatibleDestinations: string[];
};

export type DeliveryStatus = "completed" | "in-transit" | "delayed" | "cancelled";

export type Delivery = {
  id: string;
  truckId: string;
  origin: string;
  destination: string;
  cargo: string;
  status: DeliveryStatus;
  etaHours: number;
};

export type EmergencySeverity = "critical" | "high" | "medium";

export type Emergency = {
  id: string;
  truckId: string;
  problem: string;
  location: string;
  destination: string;
  cargo: string;
  severity: EmergencySeverity;
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
};

export type NotificationSeverity = "critical" | "warning" | "info" | "success";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  read: boolean;
  createdAt: string;
  truckId?: string;
};

export type RouteOption = {
  name: string;
  distanceKm: number;
  etaMinutes: number;
  traffic: "Light" | "Moderate" | "Heavy";
  notes: string;
};

export type RouteResult = {
  from: string;
  to: string;
  truckId: string;
  recommended: RouteOption;
  alternative: RouteOption;
};

export type TruckRequestStatus = "idle" | "sending" | "sent" | "accepted" | "rejected";

export type TruckRequest = {
  id: string;
  partnerCompany: string;
  partnerTruckId: string;
  requiredCapacity: number;
  pickup: string;
  destination: string;
  status: TruckRequestStatus;
};

export type DashboardSection =
  | "dashboard"
  | "trucks"
  | "deliveries"
  | "routes"
  | "emergency"
  | "partners"
  | "analytics"
  | "notifications"
  | "profile"
  | "settings";

// ---------------------------------------------------------------------------
// Backend → Frontend Adapters
// These map the FastAPI response shapes to the existing UI types.
// The frontend components keep using the types above unchanged.
// ---------------------------------------------------------------------------

import type {
  BackendTruck,
  BackendDelivery,
  BackendRoute,
  BackendOptimizationResult,
} from "@/lib/api";

/** Map backend TruckStatus enum to frontend TruckStatus */
function adaptTruckStatus(backend: string): TruckStatus {
  switch (backend) {
    case "IN_TRANSIT":
      return "on-route";
    case "ASSIGNED":
      return "on-route";
    case "MAINTENANCE":
      return "emergency";
    case "AVAILABLE":
      return "available";
    case "OFFLINE":
      return "offline";
    default:
      return "available";
  }
}

/** Map backend DeliveryStatus enum to frontend DeliveryStatus */
function adaptDeliveryStatus(backend: string): DeliveryStatus {
  switch (backend) {
    case "IN_TRANSIT":
      return "in-transit";
    case "ASSIGNED":
      return "in-transit";
    case "PICKED_UP":
      return "in-transit";
    case "PENDING":
      return "in-transit";
    case "DELIVERED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "in-transit";
  }
}

/** Generate a deterministic pseudo-coordinate from a location string. */
function locationToCoords(loc: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < loc.length; i++) {
    hash = (hash * 31 + loc.charCodeAt(i)) | 0;
  }
  // Map to East India bounding box: lat 18–24, lng 83–89
  const lat = 21 + ((hash & 0x7fff) / 0x7fff) * 3;
  const lng = 85 + (((hash >> 16) & 0x7fff) / 0x7fff) * 3;
  return { lat, lng };
}

/** Adapt a backend truck response to the frontend Truck type. */
export function adaptTruck(b: BackendTruck): Truck {
  const { lat, lng } = locationToCoords(b.currentLocation);
  return {
    id: `T-${b.truckId}`,
    driver: b.registrationNumber,
    location: b.currentLocation,
    lat,
    lng,
    speed: 0,
    load: Number((b.currentLoadKg / 1000).toFixed(1)),
    capacity: Number((b.maxCapacityKg / 1000).toFixed(1)),
    status: adaptTruckStatus(b.status),
    destination: "—",
    eta: "—",
  };
}

/** Adapt a backend delivery response to the frontend Delivery type. */
export function adaptDelivery(b: BackendDelivery): Delivery {
  const etaHours = b.estimatedDeliveryTime
    ? Math.max(
        0,
        (new Date(b.estimatedDeliveryTime).getTime() - Date.now()) / (1000 * 60 * 60),
      )
    : 0;
  return {
    id: `D-${b.deliveryId}`,
    truckId: b.truckId !== null ? `T-${b.truckId}` : "—",
    origin: b.origin,
    destination: b.destination,
    cargo: `Load ${b.loadKg} kg`,
    status: adaptDeliveryStatus(b.deliveryStatus),
    etaHours: Math.round(etaHours * 10) / 10,
  };
}

/** Adapt a backend route to the frontend RouteResult format. */
export function adaptRouteResult(
  route: BackendRoute,
): RouteResult {
  const opt = route.latestOptimization;
  const recommended: RouteOption = {
    name: opt?.recommendedRoute ?? route.startLocation + " → " + route.destination,
    distanceKm: route.distanceKm,
    etaMinutes: opt?.estimatedTime ?? route.estimatedTimeMinutes,
    traffic: "Moderate",
    notes: opt?.reason ?? "",
  };
  return {
    from: route.startLocation,
    to: route.destination,
    truckId: `R-${route.routeId}`,
    recommended,
    alternative: {
      ...recommended,
      name: recommended.name + " (alt)",
      distanceKm: recommended.distanceKm + 5,
      etaMinutes: recommended.etaMinutes + 10,
      notes: "Alternative calculated by the system",
    },
  };
}
