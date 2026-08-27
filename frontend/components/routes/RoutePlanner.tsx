"use client";

import { osrmApi, routesApi, type OptimizeResult, type BackendRoute } from "@/lib/api";
import { useFleet } from "@/context/FleetContext";
import { formatEta } from "@/lib/routes";
import { useState } from "react";

type RouteInfo = {
  from: string;
  to: string;
  distanceKm: number;
  durationMinutes: number;
  geometry: unknown;
};

export function RoutePlanner() {
  const { trucks, selectedTruckId, pushNotification } = useFleet();
  const selected = trucks.find((t) => t.id === selectedTruckId);

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
  const [truckId, setTruckId] = useState(selected?.id ?? trucks[0]?.id ?? "T-101");
  const [routeResult, setRouteResult] = useState<RouteInfo | null>(null);
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

  async function optimizeRoute() {
    if (!routeResult) return;
    setOptimizing(true);
    setOptimizeError("");

    const startCoords = lookupCoords(from);
    const endCoords = lookupCoords(to);

    try {
      // First, try to find an existing route from the backend to optimize
      const existingRoutes = await routesApi.list();
      let routeId: number | null = null;

      if (existingRoutes.length > 0) {
        routeId = existingRoutes[0].routeId;
      }

      if (routeId !== null) {
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
      } else {
        setOptimizeError("No routes available to optimize. Create a delivery and route first.");
      }
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
              <option key={t.id}>{t.id}</option>
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
          <button
            type="button"
            className="rounded-xl bg-indigo-700 px-4 py-2 font-medium text-white disabled:opacity-50"
            onClick={optimizeRoute}
            disabled={!routeResult || optimizing}
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
            </div>
          </div>
        </div>
      )}

      {/* Optimization result */}
      {optimizeResult && (
        <div className="space-y-3">
          <div className="card border-indigo-200 p-4 dark:border-indigo-800">
            <h3 className="font-semibold text-indigo-700 dark:text-indigo-300">
              Deterministic Optimizer
            </h3>
            <div className="mt-2 space-y-1 text-sm">
              <p>Recommended route: <strong>{optimizeResult.optimizer.recommendedRoute}</strong></p>
              <p>Estimated time: <strong>{optimizeResult.optimizer.estimatedTime} min</strong></p>
              <p>Fuel saving: <strong>{optimizeResult.optimizer.fuelSaving ?? 0}%</strong></p>
              <p>Source: <span className="text-muted">{optimizeResult.optimizer.source}</span></p>
              <p className="text-muted">{optimizeResult.optimizer.reason}</p>
            </div>
          </div>

          {/* AI / Gemini result */}
          {optimizeResult.ai && (
            <div className="card border-amber-200 p-4 dark:border-amber-800">
              <h3 className="font-semibold text-amber-700 dark:text-amber-300">
                AI Decision Support
              </h3>
              <div className="mt-2 space-y-1 text-sm">
                {optimizeResult.ai.decision && (
                  <p>Decision: <strong>{optimizeResult.ai.decision}</strong></p>
                )}
                {optimizeResult.ai.risk && (
                  <p>Risk: <strong>{optimizeResult.ai.risk}</strong></p>
                )}
                <p>Recommended route: <strong>{optimizeResult.ai.recommendedRoute}</strong></p>
                <p>Estimated time: <strong>{optimizeResult.ai.estimatedTime} min</strong></p>
                <p>Fuel saving: <strong>{optimizeResult.ai.fuelSaving ?? 0}%</strong></p>
                <p className="text-muted">{optimizeResult.ai.reason}</p>
                {optimizeResult.ai.actions && optimizeResult.ai.actions.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-muted">
                    {optimizeResult.ai.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
