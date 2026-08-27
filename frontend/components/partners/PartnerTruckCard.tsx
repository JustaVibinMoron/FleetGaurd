"use client";

import type { PartnerTruck } from "@/lib/types";
import { availableCapacity } from "@/lib/trucks";

export function PartnerTruckCard({
  truck,
  onDetails,
  onRequest,
}: {
  truck: PartnerTruck;
  onDetails: () => void;
  onRequest: () => void;
}) {
  const free = availableCapacity(truck);
  return (
    <article className="card p-4 transition hover:-translate-y-0.5">
      <p className="text-xs uppercase tracking-wide text-muted">{truck.company}</p>
      <h3 className="text-lg font-semibold">Truck: {truck.id}</h3>
      <p className="mt-2 text-sm">Distance: {truck.distanceKm} km</p>
      <p className="text-sm">Capacity: {truck.capacity} tons</p>
      <p className="text-sm">Current Load: {truck.load} tons</p>
      <p className="text-sm">Free: {free} tons</p>
      <p className="text-sm">Status: {truck.status}</p>
      <p className="text-xs text-muted">Compatible: {truck.compatibleDestinations.join(", ")}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="rounded-xl border border-line px-3 py-2 text-sm" onClick={onDetails}>
          View Details
        </button>
        <button
          type="button"
          className="rounded-xl bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={truck.status !== "available"}
          onClick={onRequest}
        >
          Request Truck
        </button>
      </div>
    </article>
  );
}
