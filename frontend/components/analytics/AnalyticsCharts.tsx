"use client";

import { simulationsApi, type SimulationRunResult, type ScenarioType } from "@/lib/api";
import { useFleet } from "@/context/FleetContext";
import { isOverloaded } from "@/lib/trucks";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SCENARIOS: { id: ScenarioType; label: string; description: string }[] = [
  { id: "normal", label: "Normal", description: "Standard operations" },
  { id: "heavy_traffic", label: "Heavy Traffic", description: "Road congestion" },
  { id: "road_closure", label: "Road Closure", description: "Detour required" },
  { id: "vehicle_breakdown", label: "Breakdown", description: "Truck failure" },
  { id: "urgent_delivery", label: "Urgent", description: "Priority delivery" },
  { id: "overloaded_vehicle", label: "Overload", description: "Excess cargo" },
  { id: "impossible_overdue_delivery", label: "Impossible", description: "Overdue + blocked" },
];

export function AnalyticsCharts() {
  const { deliveries, trucks, emergencies } = useFleet();

  // ---- Simulation state ----
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimulationRunResult | null>(null);
  const [simError, setSimError] = useState("");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>("heavy_traffic");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<SimulationRunResult[]>([]);
  const [batchSummary, setBatchSummary] = useState<{
    scenarioCount: number;
    feasibleScenarioCount: number;
    lateDeliveries: number;
  } | null>(null);
  const [batchError, setBatchError] = useState("");

  // ---- Existing chart data (from local/mock data) ----
  const deliveryData = useMemo(() => {
    const completed = deliveries.filter((d) => d.status === "completed").length;
    const delayed = deliveries.filter((d) => d.status === "delayed").length;
    const inTransit = deliveries.filter((d) => d.status === "in-transit").length;
    const cancelled = deliveries.filter((d) => d.status === "cancelled").length;
    return [
      { name: "Completed", value: completed },
      { name: "In transit", value: inTransit },
      { name: "Delayed", value: delayed },
      { name: "Cancelled", value: cancelled },
    ];
  }, [deliveries]);

  const utilization = useMemo(
    () =>
      trucks.map((t) => ({
        id: t.id,
        used: Math.round((t.load / t.capacity) * 100),
      })),
    [trucks],
  );

  const incidents = useMemo(
    () => [
      { name: "Overloads", value: trucks.filter(isOverloaded).length },
      { name: "Emergencies", value: emergencies.filter((e) => e.status !== "resolved").length },
      { name: "Delayed trucks", value: trucks.filter((t) => t.status === "delayed").length },
    ],
    [trucks, emergencies],
  );

  const avgHours = useMemo(() => {
    const active = deliveries.filter((d) => d.etaHours > 0);
    if (!active.length) return 0;
    return (active.reduce((sum, d) => sum + d.etaHours, 0) / active.length).toFixed(1);
  }, [deliveries]);

  const colors = ["#1d4ed8", "#0f766e", "#ca8a04", "#dc2626"];

  // ---- Simulation handlers ----
  async function runSimulation() {
    setSimLoading(true);
    setSimError("");
    setSimResult(null);
    try {
      const result = await simulationsApi.run({
        scenario: selectedScenario,
        distanceKm: 100,
        estimatedTimeMinutes: 120,
        fuelLiters: 30,
      });
      setSimResult(result);
    } catch (err: unknown) {
      setSimError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  }

  async function runBatchSimulation() {
    setBatchLoading(true);
    setBatchError("");
    setBatchResults([]);
    setBatchSummary(null);
    try {
      const result = await simulationsApi.runBatch({
        scenarios: SCENARIOS.map((s) => s.id),
        distanceKm: 100,
        estimatedTimeMinutes: 120,
        fuelLiters: 30,
      });
      setBatchResults(result.runs);
      setBatchSummary(result.summary);
    } catch (err: unknown) {
      setBatchError(err instanceof Error ? err.message : "Batch simulation failed");
    } finally {
      setBatchLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Analytics</h2>
        <p className="text-sm text-muted">Charts update when loads and emergencies change.</p>
      </div>

      {/* Existing charts */}
      <p className="card p-4 text-sm">
        Average active delivery time: <strong>{avgHours} h</strong>
      </p>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card h-80 p-4">
          <h3 className="mb-2 font-medium">Deliveries</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={deliveryData} dataKey="value" nameKey="name" outerRadius={90} label>
                {deliveryData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card h-80 p-4">
          <h3 className="mb-2 font-medium">Truck utilization (%)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={utilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="id" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="used" fill="#1d4ed8" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card h-80 p-4 xl:col-span-2">
          <h3 className="mb-2 font-medium">Incidents</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incidents}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#dc2626" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Simulation Panel — connected to FastAPI backend                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Disruption Simulations</h3>
          <p className="text-sm text-muted">
            Run synthetic scenario simulations via the backend optimizer. These are simulated results, not measured fleet performance.
          </p>
        </div>

        {/* Single scenario run */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Scenario
            <select
              className="ml-2 rounded-xl border border-line bg-surface px-3 py-2"
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value as ScenarioType)}
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {s.description}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={runSimulation}
            disabled={simLoading}
          >
            {simLoading ? "Running…" : "Run Simulation"}
          </button>
          <button
            type="button"
            className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={runBatchSimulation}
            disabled={batchLoading}
          >
            {batchLoading ? "Running…" : "Run All Scenarios"}
          </button>
        </div>

        {simError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {simError}
          </p>
        )}

        {/* Single scenario result */}
        {simResult && (
          <div className="rounded-xl border border-line bg-surface-2 p-4 space-y-2 text-sm">
            <h4 className="font-semibold">Scenario: {simResult.scenario}</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-muted">Baseline</p>
                <p>Distance: {simResult.baseline.distanceKm} km</p>
                <p>Time: {simResult.baseline.estimatedTimeMinutes} min</p>
              </div>
              {simResult.optimized && (
                <div>
                  <p className="text-xs uppercase text-muted">Optimized</p>
                  <p>Distance: {simResult.optimized.recommendedRoute}</p>
                  <p>Time: {simResult.optimized.estimatedTime} min</p>
                  <p>Fuel saving: {simResult.optimized.fuelSaving ?? 0}%</p>
                </div>
              )}
            </div>
            {simResult.analytics && (
              <div className="grid gap-2 sm:grid-cols-3 mt-2 pt-2 border-t border-line">
                <div>
                  <p className="text-xs text-muted">Distance reduction</p>
                  <p className="font-medium">{simResult.analytics.distanceReductionPercent}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Delay reduction</p>
                  <p className="font-medium">{simResult.analytics.delayReductionMinutes} min ({simResult.analytics.delayReductionPercent}%)</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Feasible</p>
                  <p className="font-medium">{simResult.feasible ? "✅ Yes" : "❌ No"}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Batch results */}
        {batchResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Batch Results</h4>
            <div className="grid gap-3 md:grid-cols-2">
              {batchResults.map((run, i) => (
                <div key={i} className="rounded-xl border border-line bg-surface p-3 text-sm">
                  <p className="font-medium">{run.scenario}</p>
                  <p className="text-muted">
                    Baseline: {run.baseline.distanceKm} km, {run.baseline.estimatedTimeMinutes} min
                  </p>
                  {run.analytics && (
                    <p>
                      Optimized: {run.analytics.totalDistanceKm} km, {run.analytics.estimatedTravelDeliveryTimeMinutes} min
                      {" "}({run.analytics.delayReductionPercent}% delay reduction)
                    </p>
                  )}
                  <p>{run.feasible ? "✅ Feasible" : "❌ Infeasible"}</p>
                </div>
              ))}
            </div>
            {batchSummary && (
              <p className="text-sm text-muted">
                Summary: {batchSummary.scenarioCount} scenarios, {batchSummary.feasibleScenarioCount} feasible, {batchSummary.lateDeliveries} late deliveries
              </p>
            )}
          </div>
        )}

        {batchError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {batchError}
          </p>
        )}
      </div>
    </section>
  );
}
