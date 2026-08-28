"use client";

import { EmergencyRouting } from "@/components/emergency/EmergencyRouting";
import { ReplacementTruckPanel } from "@/components/partners/ReplacementTruckPanel";
import { useFleet } from "@/context/FleetContext";
import { useState } from "react";

export function EmergencyPanel() {
  const { emergencies, trucks, selectedTruckId, updateEmergencyStatus, addEmergency, setSection, pushNotification } = useFleet();
  const selected = emergencies.find((e) => e.truckId === selectedTruckId && e.status !== "resolved") ?? emergencies.find((e) => e.status === "open") ?? emergencies[0];
  const [problem, setProblem] = useState("Engine Failure");
  const [truckId, setTruckId] = useState(selectedTruckId ?? "T-104");
  const [showReplace, setShowReplace] = useState(false);

  if (!selected) {
    return <p className="text-muted">No emergency records.</p>;
  }

  const truck = trucks.find((t) => t.id === selected.truckId);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm font-semibold text-red-700">🔴 EMERGENCY DETECTED</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Truck: {selected.truckId}
        </h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <p>Problem: {selected.problem}</p>
          <p>Location: {selected.location}</p>
          <p>Destination: {selected.destination}</p>
          <p>Delivery: {selected.cargo}</p>
          <p>Status: {selected.status}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded-xl bg-blue-700 px-3 py-2 text-sm text-white" onClick={() => setSection("routes")}>
            Find Alternative Route
          </button>
          <button type="button" className="rounded-xl bg-indigo-700 px-3 py-2 text-sm text-white" onClick={() => setShowReplace(true)}>
            Find Replacement Truck
          </button>
          <button
            type="button"
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
            onClick={() => {
              pushNotification(
                "Driver Contacted",
                `Contacted driver ${truck?.driver ?? "unknown"} for ${selected.truckId}: ${selected.problem}. Awaiting response.`,
                "info",
                selected.truckId,
              );
            }}
          >
            Contact Driver {truck ? `(${truck.driver})` : ""}
          </button>
          <button
            type="button"
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
            onClick={() => {
              updateEmergencyStatus(selected.id, "acknowledged");
              pushNotification(
                "Emergency Acknowledged",
                `Emergency ${selected.id} for ${selected.truckId} has been acknowledged and operations have been notified.`,
                "success",
                selected.truckId,
              );
            }}
          >
            Notify / Acknowledge
          </button>
        </div>
      </div>

      <EmergencyRouting emergency={selected} />
      {showReplace && <ReplacementTruckPanel truckId={selected.truckId} />}

      <div className="card p-4">
        <h3 className="font-semibold">Create emergency record</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select className="rounded-xl border border-line bg-surface px-3 py-2" value={truckId} onChange={(e) => setTruckId(e.target.value)}>
            {trucks.map((t) => (
              <option key={t.id}>{t.id}</option>
            ))}
          </select>
          <input className="rounded-xl border border-line bg-surface px-3 py-2" value={problem} onChange={(e) => setProblem(e.target.value)} />
          <button
            type="button"
            className="rounded-xl bg-red-600 px-3 py-2 text-white"
            onClick={() => {
              const t = trucks.find((x) => x.id === truckId);
              addEmergency({
                truckId,
                problem,
                location: t?.location ?? "Unknown",
                destination: t?.destination ?? "Unknown",
                cargo: t?.cargo ?? "Freight",
                severity: "high",
              });
            }}
          >
            Raise emergency
          </button>
        </div>
      </div>

      <ul className="grid gap-2">
        {emergencies.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
            <span>
              {item.truckId} · {item.problem} · {item.status}
            </span>
            <span className="flex gap-2">
              <button className="rounded-lg border border-line px-2 py-1" onClick={() => updateEmergencyStatus(item.id, "acknowledged")}>
                Acknowledge
              </button>
              <button className="rounded-lg border border-line px-2 py-1" onClick={() => updateEmergencyStatus(item.id, "resolved")}>
                Resolve
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
