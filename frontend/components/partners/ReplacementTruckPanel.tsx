"use client";

import { TruckRequestModal } from "@/components/partners/TruckRequestModal";
import { COMPANY_NAME } from "@/data/mock";
import { useFleet } from "@/context/FleetContext";
import { bestReplacement } from "@/lib/replacements";

export function ReplacementTruckPanel({ truckId }: { truckId: string }) {
  const { trucks, partnerTrucks, startRequest } = useFleet();
  const truck = trucks.find((t) => t.id === truckId);
  if (!truck) return null;

  const rec = bestReplacement(partnerTrucks, truck.load, truck.destination === "—" ? "Bhubaneswar" : truck.destination);
  if (!rec) return <p>No partner trucks in the network.</p>;

  return (
    <section className="card border-amber-200 p-5">
      <p className="text-sm font-semibold text-amber-700">Replacement Truck Required</p>
      <h3 className="mt-1 text-xl font-semibold">Recommended Replacement</h3>
      <p className="mt-2 text-sm">Truck: {rec.truck.id}</p>
      <p className="text-sm">Company: {rec.truck.company}</p>
      <p className="text-sm">Distance: {rec.truck.distanceKm} km</p>
      <p className="text-sm">Available Capacity: {rec.availableTons} tons</p>
      <p className="mt-2 text-sm text-muted">Reason: {rec.reason}</p>
      <p className="mt-1 text-xs text-muted">Requesting company: {COMPANY_NAME}</p>
      <button
        type="button"
        className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-white"
        onClick={() =>
          startRequest({
            partnerCompany: rec.truck.company,
            partnerTruckId: rec.truck.id,
            requiredCapacity: truck.load,
            pickup: truck.location,
            destination: truck.destination === "—" ? "Bhubaneswar" : truck.destination,
          })
        }
      >
        Send Truck Request
      </button>
      <TruckRequestModal />
    </section>
  );
}
