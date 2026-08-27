"use client";

import { TruckDetailsModal, STATUS_EMOJI } from "@/components/trucks/TruckDetailsModal";
import { SearchFilterBar, useTruckFilter } from "@/components/ui/useTruckFilter";
import { useFleet } from "@/context/FleetContext";
import type { Truck } from "@/lib/types";
import { useEffect, useState } from "react";

export function TruckTable() {
  const { setSelectedTruckId, selectedTruckId, trucks, setSection } = useFleet();
  const { query, setQuery, status, setStatus, filtered } = useTruckFilter();
  const [open, setOpen] = useState<Truck | null>(null);

  useEffect(() => {
    if (!selectedTruckId) return;
    const truck = trucks.find((t) => t.id === selectedTruckId);
    if (truck) setOpen(truck);
  }, [selectedTruckId, trucks]);

  return (
    <section className="space-y-4">
      <SearchFilterBar query={query} setQuery={setQuery} status={status} setStatus={setStatus} />
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">No trucks match this search.</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-2 text-muted">
                <tr>
                  {["Truck ID", "Driver", "Location", "Speed", "Load", "Capacity", "Status", "Destination", "ETA", "Action"].map((h) => (
                    <th key={h} className="px-3 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((truck) => (
                  <tr key={truck.id} className="border-t border-line">
                    <td className="px-3 py-3 font-semibold">{truck.id}</td>
                    <td className="px-3 py-3">{truck.driver}</td>
                    <td className="px-3 py-3">{truck.location}</td>
                    <td className="px-3 py-3">{truck.speed}</td>
                    <td className="px-3 py-3">{truck.load}</td>
                    <td className="px-3 py-3">{truck.capacity}</td>
                    <td className="px-3 py-3">{STATUS_EMOJI[truck.status]}</td>
                    <td className="px-3 py-3">{truck.destination}</td>
                    <td className="px-3 py-3">{truck.eta}</td>
                    <td className="px-3 py-3">
                      <RowActions
                        onView={() => setOpen(truck)}
                        onTrack={() => {
                          setSelectedTruckId(truck.id);
                          setSection("dashboard");
                        }}
                        onRoute={() => {
                          setSelectedTruckId(truck.id);
                          setSection("routes");
                        }}
                        onEmergency={() => {
                          setSelectedTruckId(truck.id);
                          setSection("emergency");
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 p-3 md:hidden">
            {filtered.map((truck) => (
              <article key={truck.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{truck.id}</p>
                  <p className="text-xs">{STATUS_EMOJI[truck.status]}</p>
                </div>
                <p className="text-sm text-muted">
                  {truck.driver} · {truck.location}
                </p>
                <p className="text-sm">
                  {truck.load}/{truck.capacity} t · {truck.destination}
                </p>
                <div className="mt-2">
                  <RowActions
                    onView={() => setOpen(truck)}
                    onTrack={() => {
                      setSelectedTruckId(truck.id);
                      setSection("dashboard");
                    }}
                    onRoute={() => {
                      setSelectedTruckId(truck.id);
                      setSection("routes");
                    }}
                    onEmergency={() => {
                      setSelectedTruckId(truck.id);
                      setSection("emergency");
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      {open && (
        <TruckDetailsModal
          truck={open}
          onClose={() => {
            setOpen(null);
            setSelectedTruckId(null);
          }}
        />
      )}
    </section>
  );
}

function RowActions({
  onView,
  onTrack,
  onRoute,
  onEmergency,
}: {
  onView: () => void;
  onTrack: () => void;
  onRoute: () => void;
  onEmergency: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <Mini onClick={onView}>View</Mini>
      <Mini onClick={onTrack}>Track</Mini>
      <Mini onClick={onRoute}>Route</Mini>
      <Mini onClick={onEmergency} danger>
        Emergency
      </Mini>
    </div>
  );
}

function Mini({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      className={`rounded-lg px-2 py-1 text-xs font-medium ${danger ? "bg-red-600 text-white" : "border border-line"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
