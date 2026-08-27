import type { PartnerTruck, Truck, TruckStatus } from "@/lib/types";

export function isOverloaded(truck: Pick<Truck, "load" | "capacity">) {
  return truck.load > truck.capacity;
}

export function availableCapacity(truck: Pick<Truck, "load" | "capacity">) {
  return Math.max(0, Number((truck.capacity - truck.load).toFixed(1)));
}

export function loadPercent(truck: Pick<Truck, "load" | "capacity">) {
  if (truck.capacity <= 0) return 0;
  return Math.min(100, Math.round((truck.load / truck.capacity) * 100));
}

export function statusLabel(status: TruckStatus) {
  const map: Record<TruckStatus, string> = {
    "on-route": "On Route",
    delayed: "Delayed",
    emergency: "Emergency",
    available: "Available",
    offline: "Offline",
  };
  return map[status];
}

export function matchesQuery(truck: Truck, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [truck.id, truck.driver, truck.location, truck.status, truck.destination, statusLabel(truck.status)]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function filterTrucks(trucks: Truck[], query: string, status: "all" | TruckStatus) {
  return trucks.filter((truck) => {
    const statusOk = status === "all" || truck.status === status;
    return statusOk && matchesQuery(truck, query);
  });
}

export function isActiveTruck(truck: Truck) {
  return truck.status === "on-route" || truck.status === "delayed" || truck.status === "emergency";
}

export function getDashboardStats(trucks: Truck[], partnerTrucks: PartnerTruck[]) {
  return {
    totalTrucks: trucks.length,
    activeTrucks: trucks.filter(isActiveTruck).length,
    delayed: trucks.filter((t) => t.status === "delayed").length,
    emergencyAlerts: trucks.filter((t) => t.status === "emergency" || isOverloaded(t)).length,
    availablePartners: partnerTrucks.filter((p) => p.status === "available").length,
    overloadCount: trucks.filter(isOverloaded).length,
  };
}
