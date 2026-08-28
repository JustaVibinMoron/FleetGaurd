"use client";

import { osrmApi, routesApi, deliveriesApi, type OptimizeResult, type BackendRoute } from "@/lib/api";
import { useFleet } from "@/context/FleetContext";
import { formatEta } from "@/lib/routes";
import { useEffect, useState } from "react";

type RouteInfo = {
  from: string;
  to: string;
  distanceKm: number;
  durationMinutes: number;
  geometry: unknown;
};

export function RoutePlanner() {
  const { trucks, selectedTruckId, pushNotification, setCurrentRouteGeometry } = useFleet();
  const selected = trucks.find((t) => t.id === selectedTruckId) ?? trucks[0] ?? null;
  const [truckId, setTruckId] = useState<string>(selected?.id ?? "");

  // When trucks list changes (e.g. backend load replaces mocks), ensure
  // truckId still points to a valid truck.
  useEffect(() => {
    if (truckId && trucks.some((t) => t.id === truckId)) return;
    if (trucks.length > 0) setTruckId(trucks[0].id);
  }, [trucks, truckId]);

  // Known city coordinate map for OSRM calls
  const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    kolkata: { lat: 22.5726, lng: 88.3639 },
    howrah: { lat: 22.5726, lng: 88.3639 },
    bhubaneswar: { lat: 20.2961, lng: 85.8245 },
    cuttack: { lat: 20.462, lng: 85.883 },
    kharagpur: { lat: 22.346, lng: 87.232 },
    balasore: { lat: 21.494, lng: 86.933 },
    ranchi: { lat: 23.3441, lng: 85.3096 },
    jamshedpur: { lat: 22.8046, lng: 86.2029 },
    durgapur: { lat: 23.52, lng: 87.311 },
    asansol: { lat: 23.673, lng: 86.952 },
    berhampur: { lat: 19.315, lng: 84.794 },
    visakhapatnam: { lat: 17.6868, lng: 83.2185 },
    haldia: { lat: 22.0667, lng: 88.0698 },
    nh16: { lat: 21.15, lng: 86.5 },
    "nh-16": { lat: 21.15, lng: 86.5 },
  };

  const [from, setFrom] = useState(selected?.location.includes("Kolkata") ? "Kolkata" : "Kolkata");
  const [to, setTo] = useState(
    selected?.destination && selected.destination !== "—" ? selected.destination : "Bhubaneswar",
  );
  const [routeResult, setRouteResult] = useState<RouteInfo | null>(null);
  const [savedRouteId, setSavedRouteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);
  const [optimizeError, setOptimizeError] = useState("");

  function lookupCoords(name: string): { lat: number; lng: number } | null {
    const key = name.trim().toLowerCase();
    if (CITY_COORDS[key]) return CITY_COORDS[key];
    // Fuzzy match
    for (const [k, v] of Object.entries(CITY_COORDS)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    return null;
  }

  async function findRoute() {
    setError("");
    setOptimizeResult(null);
    setOptimizeError("");
    setSaveError("");
    setSavedRouteId(null);
    setCurrentRouteGeometry(null);

    const startCoords = lookupCoords(from);
    const endCoords = lookupCoords(to);

    if (!startCoords || !endCoords) {
      setError(
        `Could not find coordinates for "${!startCoords ? from : to}". Try: Kolkata, Bhubaneswar, Cuttack, Kharagpur, Balasore, Ranchi, Jamshedpur, Durgapur, Asansol, Berhampur, Visakhapatnam, Haldia.`,
      );
      return;
    }

    setLoading(true);
    try {
      const result = await osrmApi.calculate({
        startLatitude: startCoords.lat,
        startLongitude: startCoords.lng,
        destinationLatitude: endCoords.lat,
        destinationLongitude: endCoords.lng,
      });

      setRouteResult({
        from,
        to,
        distanceKm: result.distanceKm,
        durationMinutes: result.durationMinutes,
        geometry: result.geometry,
      });

      // Pass geometry to the map for polyline rendering
      if (result.geometry && typeof result.geometry === "object" && "coordinates" in (result.geometry as Record<string, unknown>)) {
        setCurrentRouteGeometry(result.geometry as { type: string; coordinates: number[][] });
      }

      pushNotification(
        "Route calculated",
        `OSRM route from ${from} to ${to}: ${result.distanceKm.toFixed(1)} km, ${formatEta(Math.round(result.durationMinutes))}`,
        "success",
        truckId,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Route calculation failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function saveRoute() {
    if (!routeResult) return;
    setSaving(true);
    setSaveError("");

    const startCoords = lookupCoords(from);
    const endCoords = lookupCoords(to);
    const numericTruckId = truckId ? (parseInt(truckId.replace(/\D/g, ""), 10) || undefined) : undefined;

    try {
      // Step 1: Create a delivery
      const delivery = await deliveriesApi.create({
        origin: from,
        destination: to,
        loadKg: 500,
        truckId: numericTruckId,
      });

      // Step 2: Create a route linked to that delivery
      const route = await routesApi.create({
        deliveryId: delivery.deliveryId,
        startLocation: from,
        destination: to,
        distanceKm: routeResult.distanceKm,
        estimatedTimeMinutes: Math.round(routeResult.durationMinutes),
      });

      setSavedRouteId(route.routeId);
      pushNotification(
        "Route saved",
        `Created delivery D-${delivery.deliveryId} and route R-${route.routeId} for ${from} → ${to}`,
        "success",
        truckId,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save route";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function optimizeRoute() {
    const routeId = savedRouteId;
    if (!routeResult || !routeId) return;
    setOptimizing(true);
    setOptimizeError("");

    const startCoords = lookupCoords(from);
    const endCoords = lookupCoords(to);

    try {
      const result = await routesApi.optimize(routeId, {
        problem: `Route from ${from} to ${to}`,
        deliveryPriority: "normal",
        originLatitude: startCoords?.lat,
        originLongitude: startCoords?.lng,
        destinationLatitude: endCoords?.lat,
        destinationLongitude: endCoords?.lng,
      });
      setOptimizeResult(result);
      pushNotification(
        "Optimization complete",
        `Optimizer: ${result.optimizer.reason}`,
        "success",
        truckId,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Optimization failed";
      setOptimizeError(msg);
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Fastest Route System</h2>
        <p className="text-sm text-muted">
          Uses the FastAPI backend + OSRM for real driving routes. Optimization uses the backend optimizer + AI.
        </p>
      </div>

      {/* Route calculation form */}
      <div className="card grid gap-3 p-4 md:grid-cols-3">
        <Field label="Starting location" id="from" value={from} onChange={setFrom} />
        <Field label="Destination" id="to" value={to} onChange={setTo} />
        <div>
          <label htmlFor="route-truck" className="mb-1 block text-sm font-medium">
            Truck ID
          </label>
          <select
            id="route-truck"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5"
            value={truckId}
            onChange={(e) => setTruckId(e.target.value)}
          >
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} ({t.driver})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-3">
          <button
            type="button"
            className="rounded-xl bg-blue-700 px-4 py-2 font-medium text-white disabled:opacity-50"
            onClick={findRoute}
            disabled={loading}
          >
            {loading ? "Calculating…" : "Find Fastest Route"}
          </button>
          {routeResult && !savedRouteId && (
            <button
              type="button"
              className="rounded-xl bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
              onClick={saveRoute}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Route"}
            </button>
          )}
          <button
            type="button"
            className="rounded-xl bg-indigo-700 px-4 py-2 font-medium text-white disabled:opacity-50"
            onClick={optimizeRoute}
            disabled={!savedRouteId || optimizing}
          >
            {optimizing ? "Optimizing…" : "Optimize Route"}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {saveError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {saveError}
        </p>
      )}

      {/* OSRM route result */}
      {routeResult && (
        <div className="card p-4">
          <h3 className="font-semibold">OSRM Route: {routeResult.from} → {routeResult.to}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm">Distance: <strong>{routeResult.distanceKm.toFixed(1)} km</strong></p>
              <p className="text-sm">Duration: <strong>{formatEta(Math.round(routeResult.durationMinutes))}</strong></p>
            </div>
            <div>
              <p className="text-sm text-muted">Source: OSRM driving route</p>
              <p className="text-sm text-muted">Truck: {truckId}</p>
              {savedRouteId && (
                <p className="text-sm text-emerald-600">✓ Saved as route R-{savedRouteId} — ready to optimize</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optimization result */}
      {optimizeResult && (() => {
        const o = optimizeResult.optimizer;
        const a = optimizeResult.ai;
        const riskColor = a?.risk === "HIGH" ? "text-red-600" : a?.risk === "MEDIUM" ? "text-amber-600" : "text-emerald-600";
        const decisionColor = a?.decision === "REROUTE" ? "text-amber-600" : a?.decision === "DELAY" ? "text-red-600" : "text-emerald-600";
        const timeHrs = Math.floor(o.estimatedTime / 60);
        const timeMins = o.estimatedTime % 60;
        const formattedTime = timeHrs > 0 ? `${timeHrs}h ${timeMins}m` : `${timeMins}m`;

        return (
          <div className="space-y-3">
            {/* Optimizer result card */}
            <div className="card border-indigo-200 p-4 dark:border-indigo-800">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                <h3 className="font-semibold text-indigo-700 dark:text-indigo-300">
                  Route Optimization Complete
                </h3>
              </div>

              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted">Route</p>
                    <p className="font-medium">{from} → {to}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Assigned Truck</p>
                    <p className="font-medium">{truckId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Optimization Engine</p>
                    <p className="font-medium capitalize">{o.source === "ortools" ? "OR-Tools VRP" : o.source}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted">Estimated Travel Time</p>
                    <p className="text-lg font-semibold">{formattedTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Distance</p>
                    <p className="font-medium">{routeResult?.distanceKm.toFixed(1) ?? "—"} km</p>
                  </div>
                  {(o.fuelSaving ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-muted">Fuel Saving</p>
                      <p className="font-medium text-emerald-600">{o.fuelSaving}%</p>
                    </div>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm text-muted">{o.reason}</p>
            </div>

            {/* AI / Gemini result card */}
            {a && (
              <div className="card border-amber-200 p-4 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  <h3 className="font-semibold text-amber-700 dark:text-amber-300">
                    AI Decision Support
                  </h3>
                </div>

                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  {a.decision && (
                    <div>
                      <p className="text-xs text-muted">Decision</p>
                      <p className={`text-lg font-bold ${decisionColor}`}>{a.decision}</p>
                    </div>
                  )}
                  {a.risk && (
                    <div>
                      <p className="text-xs text-muted">Risk Level</p>
                      <p className={`text-lg font-bold ${riskColor}`}>{a.risk}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted">AI Estimated Time</p>
                    <p className="text-lg font-bold">
                      {(() => {
                        const h = Math.floor(a.estimatedTime / 60);
                        const m = a.estimatedTime % 60;
                        return h > 0 ? `${h}h ${m}m` : `${m}m`;
                      })()}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-xs text-muted">AI Recommendation</p>
                    <p className="text-sm">{a.reason}</p>
                  </div>

                  {a.actions && a.actions.length > 0 && (
                    <div>
                      <p className="text-xs text-muted">Suggested Actions</p>
                      <ul className="mt-1 space-y-1">
                        {a.actions.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {optimizeError && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {optimizeError}
        </p>
      )}
    </section>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
