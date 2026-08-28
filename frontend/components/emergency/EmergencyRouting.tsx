"use client";

import { useFleet } from "@/context/FleetContext";
import { calculateEmergencyReroute, formatEta } from "@/lib/routes";
import type { Emergency } from "@/lib/types";

export function EmergencyRouting({ emergency }: { emergency: Emergency }) {
  const { pushNotification } = useFleet();
  const reroute = calculateEmergencyReroute(emergency.location, emergency.destination, emergency.truckId);

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <h3 className="font-semibold">Automatic emergency routing</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-muted">Original Route</p>
          <p>ETA: {formatEta(reroute.recommended.etaMinutes)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">New Route</p>
          <p>ETA: {formatEta(reroute.alternative.etaMinutes)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm">
        Emergency: {emergency.problem}. {reroute.alternative.name}.
      </p>
      <p className="mt-2 font-medium text-amber-700 dark:text-amber-300">{reroute.message}</p>
      <button
        type="button"
        className="mt-3 rounded-xl bg-blue-700 px-3 py-2 text-sm text-white"
        onClick={() =>
          pushNotification("Company notified", `Reroute for ${emergency.truckId} shared with operations.`, "success", emergency.truckId)
        }
      >
        Notify Company
      </button>
    </div>
  );
}
