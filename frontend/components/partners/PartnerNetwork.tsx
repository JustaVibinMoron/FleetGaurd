"use client";

import { Modal } from "@/components/ui/Modal";
import { PartnerTruckCard } from "@/components/partners/PartnerTruckCard";
import { TruckRequestModal } from "@/components/partners/TruckRequestModal";
import { useFleet } from "@/context/FleetContext";
import { availableCapacity } from "@/lib/trucks";
import type { PartnerTruck } from "@/lib/types";
import { useMemo, useState } from "react";

type SortKey = "distance" | "capacity" | "availability" | "destination";

export function PartnerNetwork() {
  const { partnerTrucks, startRequest } = useFleet();
  const [sort, setSort] = useState<SortKey>("distance");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [destination, setDestination] = useState("all");
  const [details, setDetails] = useState<PartnerTruck | null>(null);

  const destOptions = useMemo(() => {
    const set = new Set<string>();
    partnerTrucks.forEach((p) => p.compatibleDestinations.forEach((d) => set.add(d)));
    return ["all", ...Array.from(set)];
  }, [partnerTrucks]);

  const filtered = useMemo(() => {
    let list = [...partnerTrucks];
    if (onlyAvailable) list = list.filter((p) => p.status === "available");
    if (destination !== "all") {
      list = list.filter((p) => p.compatibleDestinations.includes(destination));
    }
    list.sort((a, b) => {
      if (sort === "distance") return a.distanceKm - b.distanceKm;
      if (sort === "capacity") return availableCapacity(b) - availableCapacity(a);
      if (sort === "availability") return a.status.localeCompare(b.status);
      return a.compatibleDestinations.length - b.compatibleDestinations.length;
    });
    return list;
  }, [partnerTrucks, onlyAvailable, destination, sort]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Partner Truck Network</h2>
        <p className="text-sm text-muted">Find nearby trucks from registered partner companies.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Sort
          <select className="ml-2 rounded-xl border border-line bg-surface px-3 py-2" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="distance">Distance</option>
            <option value="capacity">Available capacity</option>
            <option value="availability">Availability</option>
            <option value="destination">Destination compatibility</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
          Available only
        </label>
        <label className="text-sm">
          Destination
          <select className="ml-2 rounded-xl border border-line bg-surface px-3 py-2" value={destination} onChange={(e) => setDestination(e.target.value)}>
            {destOptions.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((truck) => (
          <PartnerTruckCard
            key={truck.id}
            truck={truck}
            onDetails={() => setDetails(truck)}
            onRequest={() =>
              startRequest({
                partnerCompany: truck.company,
                partnerTruckId: truck.id,
                requiredCapacity: 8,
                pickup: truck.location,
                destination: truck.compatibleDestinations[0] ?? "Bhubaneswar",
              })
            }
          />
        ))}
      </div>
      {details && (
        <PartnerDetailsModal truck={details} onClose={() => setDetails(null)} onOpenRequest={() => {
          setDetails(null);
          startRequest({
            partnerCompany: details.company,
            partnerTruckId: details.id,
            requiredCapacity: 8,
            pickup: details.location,
            destination: details.compatibleDestinations[0] ?? "Bhubaneswar",
          });
        }} />
      )}
      <TruckRequestModal />
    </section>
  );
}

function PartnerDetailsModal({
  truck,
  onClose,
  onOpenRequest,
}: {
  truck: PartnerTruck;
  onClose: () => void;
  onOpenRequest: () => void;
}) {
  const free = availableCapacity(truck);
  return (
    <Modal title={`${truck.company} — ${truck.id}`} onClose={onClose}>
      <dl className="space-y-3 text-sm">
        <Row label="Truck ID" value={truck.id} />
        <Row label="Company" value={truck.company} />
        <Row label="Distance" value={`${truck.distanceKm} km`} />
        <Row label="Capacity" value={`${truck.capacity} tons`} />
        <Row label="Current Load" value={`${truck.load} tons`} />
        <Row label="Free Capacity" value={`${free} tons`} />
        <Row
          label="Status"
          value={
            truck.status === "available"
              ? "✅ Available"
              : truck.status === "busy"
                ? "⏳ Busy"
                : "❌ Offline"
          }
        />
        <Row
          label="Compatible Destinations"
          value={truck.compatibleDestinations.join(", ") || "None"}
        />
      </dl>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          className="rounded-xl bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={truck.status !== "available"}
          onClick={onOpenRequest}
        >
          Request Truck
        </button>
        <button type="button" className="rounded-xl border border-line px-4 py-2 text-sm" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
