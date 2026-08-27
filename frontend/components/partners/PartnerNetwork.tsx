"use client";

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
        <div className="card p-4">
          <h3 className="font-semibold">
            {details.company} · {details.id}
          </h3>
          <p className="text-sm text-muted">
            Based at {details.location}. Remaining capacity {availableCapacity(details)} tons.
          </p>
          <button className="mt-2 text-sm text-primary" onClick={() => setDetails(null)}>
            Close details
          </button>
        </div>
      )}
      <TruckRequestModal />
    </section>
  );
}
