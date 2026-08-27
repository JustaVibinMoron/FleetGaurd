"use client";

import { trucksApi, deliveriesApi } from "@/lib/api";
import { deliveries as seedDeliveries, emergencies as seedEmergencies, partnerTrucks as seedPartners, trucks as seedTrucks } from "@/data/mock";
import { createNotification } from "@/lib/notifications";
import { isOverloaded } from "@/lib/trucks";
import { adaptTruck, adaptDelivery } from "@/lib/types";
import type {
  AppNotification,
  DashboardSection,
  Delivery,
  Emergency,
  PartnerTruck,
  Truck,
  TruckRequest,
} from "@/lib/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Toast = { id: string; message: string; severity: AppNotification["severity"] };

type FleetContextValue = {
  trucks: Truck[];
  partnerTrucks: PartnerTruck[];
  deliveries: Delivery[];
  emergencies: Emergency[];
  notifications: AppNotification[];
  toasts: Toast[];
  request: TruckRequest | null;
  section: DashboardSection;
  selectedTruckId: string | null;
  setSection: (s: DashboardSection) => void;
  setSelectedTruckId: (id: string | null) => void;
  updateTruckLoad: (truckId: string, load: number) => void;
  addEmergency: (partial: Omit<Emergency, "id" | "createdAt" | "status">) => void;
  updateEmergencyStatus: (id: string, status: Emergency["status"]) => void;
  pushNotification: (title: string, message: string, severity: AppNotification["severity"], truckId?: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  dismissToast: (id: string) => void;
  startRequest: (payload: Omit<TruckRequest, "id" | "status">) => void;
  setRequestStatus: (status: TruckRequest["status"]) => void;
  clearRequest: () => void;
  refreshFromBackend: () => void;
};

const FleetContext = createContext<FleetContextValue | null>(null);

const initialNotifications: AppNotification[] = [
  createNotification("Overload", "⚠ Truck T-103 has exceeded its permitted load capacity.", "critical", "T-103"),
  createNotification("Delay", "Truck T-102 delayed by 18 minutes.", "warning", "T-102"),
  createNotification("Emergency", "Truck T-104 has reported engine failure.", "critical", "T-104"),
];

export function FleetProvider({ children }: { children: React.ReactNode }) {
  const [trucks, setTrucks] = useState<Truck[]>(seedTrucks);
  const [partnerTrucks] = useState<PartnerTruck[]>(seedPartners);
  const [deliveries, setDeliveries] = useState<Delivery[]>(seedDeliveries);
  const [emergencies, setEmergencies] = useState<Emergency[]>(seedEmergencies);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [request, setRequest] = useState<TruckRequest | null>(null);
  const [section, setSection] = useState<DashboardSection>("dashboard");
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Fetch real data from FastAPI backend on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    fetchFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fetchFromBackend() {
    // Fetch trucks
    trucksApi
      .list()
      .then((backendTrucks) => {
        if (Array.isArray(backendTrucks) && backendTrucks.length > 0) {
          const adapted = backendTrucks.map(adaptTruck);
          setTrucks(adapted);
        }
      })
      .catch(() => {
        // Backend unavailable — keep seed/mock data
      });

    // Fetch deliveries
    deliveriesApi
      .list()
      .then((backendDeliveries) => {
        if (Array.isArray(backendDeliveries) && backendDeliveries.length > 0) {
          const adapted = backendDeliveries.map(adaptDelivery);
          setDeliveries(adapted);
        }
      })
      .catch(() => {
        // Backend unavailable — keep seed/mock data
      });
  }

  function refreshFromBackend() {
    fetchFromBackend();
  }

  function pushNotification(
    title: string,
    message: string,
    severity: AppNotification["severity"],
    truckId?: string,
  ) {
    const item = createNotification(title, message, severity, truckId);
    setNotifications((list) => [item, ...list]);
    if (severity === "critical" || severity === "success" || severity === "warning") {
      setToasts((list) => [...list, { id: item.id, message, severity }]);
    }
  }

  const value = useMemo<FleetContextValue>(
    () => ({
      trucks,
      partnerTrucks,
      deliveries,
      emergencies,
      notifications,
      toasts,
      request,
      section,
      selectedTruckId,
      setSection,
      setSelectedTruckId,
      updateTruckLoad: (truckId, load) => {
        setTrucks((list) =>
          list.map((truck) => {
            if (truck.id !== truckId) return truck;
            const next = { ...truck, load: Number(load.toFixed(1)) };
            const wasOver = isOverloaded(truck);
            const nowOver = isOverloaded(next);
            if (nowOver && !wasOver) {
              pushNotification(
                "Overload",
                `⚠ Truck ${truck.id} has exceeded its permitted load capacity.`,
                "critical",
                truck.id,
              );
            }
            return next;
          }),
        );
      },
      addEmergency: (partial) => {
        const item: Emergency = {
          ...partial,
          id: `E-${Date.now()}`,
          status: "open",
          createdAt: new Date().toISOString(),
        };
        setEmergencies((list) => [item, ...list]);
        setTrucks((list) =>
          list.map((t) => (t.id === partial.truckId ? { ...t, status: "emergency" } : t)),
        );
        pushNotification("Emergency", `Truck ${partial.truckId} — ${partial.problem}.`, "critical", partial.truckId);
        setSection("emergency");
      },
      updateEmergencyStatus: (id, status) => {
        setEmergencies((list) => list.map((e) => (e.id === id ? { ...e, status } : e)));
      },
      pushNotification,
      markRead: (id) => setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markAllRead: () => setNotifications((list) => list.map((n) => ({ ...n, read: true }))),
      clearNotifications: () => setNotifications([]),
      dismissToast: (id) => setToasts((list) => list.filter((t) => t.id !== id)),
      startRequest: (payload) => {
        setRequest({
          ...payload,
          id: `req-${Date.now()}`,
          status: "idle",
        });
      },
      setRequestStatus: (status) => setRequest((current) => (current ? { ...current, status } : current)),
      clearRequest: () => setRequest(null),
      refreshFromBackend,
    }),
    [trucks, partnerTrucks, deliveries, emergencies, notifications, toasts, request, section, selectedTruckId],
  );

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

export function useFleet() {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used inside FleetProvider");
  return ctx;
}
