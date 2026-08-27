"use client";

import { Modal } from "@/components/ui/Modal";
import { useFleet } from "@/context/FleetContext";
import { isOverloaded, statusLabel } from "@/lib/trucks";
import type { Truck } from "@/lib/types";

const STATUS_EMOJI: Record<string, string> = {
  "on-route": "🟢 On Route",
  delayed: "🟡 Delayed",
  emergency: "🔴 Emergency",
  available: "🔵 Available",
  offline: "⚫ Offline",
};

export function TruckDetailsModal({ truck, onClose }: { truck: Truck; onClose: () => void }) {
  const { setSection, setSelectedTruckId } = useFleet();
  const overload = isOverloaded(truck);

  return (
    <Modal title={`Truck ${truck.id}`} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Item label="Driver" value={truck.driver} />
        <Item label="Location" value={truck.location} />
        <Item label="Speed" value={`${truck.speed} km/h`} />
        <Item label="Load" value={`${truck.load} t`} />
        <Item label="Capacity" value={`${truck.capacity} t`} />
        <Item label="Status" value={STATUS_EMOJI[truck.status]} />
        <Item label="Destination" value={truck.destination} />
        <Item label="ETA" value={truck.eta} />
      </dl>
      {overload && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">🔴 OVERLOAD DETECTED</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-xl bg-blue-700 px-3 py-2 text-sm text-white"
          onClick={() => {
            setSection("dashboard");
            setSelectedTruckId(truck.id);
            onClose();
          }}
        >
          Track
        </button>
        <button
          className="rounded-xl border border-line px-3 py-2 text-sm"
          onClick={() => {
            setSection("routes");
            setSelectedTruckId(truck.id);
            onClose();
          }}
        >
          Route
        </button>
        <button
          className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white"
          onClick={() => {
            setSection("emergency");
            setSelectedTruckId(truck.id);
            onClose();
          }}
        >
          Emergency
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">GPS source is mock coordinates today. Connect a live GPS feed in /api/trucks.</p>
    </Modal>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

export { STATUS_EMOJI, statusLabel };
