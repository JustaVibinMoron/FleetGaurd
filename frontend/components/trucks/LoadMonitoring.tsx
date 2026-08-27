"use client";

import { useFleet } from "@/context/FleetContext";
import { isOverloaded, loadPercent } from "@/lib/trucks";

export function LoadMonitoring() {
  const { trucks, updateTruckLoad, setSelectedTruckId, setSection } = useFleet();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Load Capacity Monitoring</h2>
        <p className="text-sm text-muted">Simulated axle sensors. Drag a slider to mimic IoT weight readings.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {trucks.map((truck) => {
          const overload = isOverloaded(truck);
          const pct = loadPercent(truck);
          return (
            <article key={truck.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{truck.id}</p>
                  <p className="text-sm text-muted">{truck.driver}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${overload ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>
                  {overload ? "🔴 OVERLOAD DETECTED" : "🟢 SAFE LOAD"}
                </span>
              </div>
              <p className="mt-3 text-sm">
                Current Load: <strong>{truck.load} tons</strong> · Max: {truck.capacity} tons
              </p>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full ${overload ? "bg-red-600" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <label className="mt-3 block text-xs text-muted" htmlFor={`load-${truck.id}`}>
                Sensor simulation
              </label>
              <input
                id={`load-${truck.id}`}
                type="range"
                min={0}
                max={truck.capacity + 4}
                step={0.1}
                value={truck.load}
                onChange={(e) => updateTruckLoad(truck.id, Number(e.target.value))}
                className="w-full"
              />
              {overload && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
                  <span>⚠ Truck {truck.id} has exceeded its permitted load capacity.</span>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-red-700 px-2 py-1 text-white"
                    onClick={() => {
                      setSelectedTruckId(truck.id);
                      setSection("trucks");
                    }}
                  >
                    View Truck
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
