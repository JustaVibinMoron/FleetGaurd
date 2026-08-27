"use client";

import type { TruckStatus } from "@/lib/types";

const FILTERS: { id: "all" | TruckStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "on-route", label: "Active" },
  { id: "delayed", label: "Delayed" },
  { id: "emergency", label: "Emergency" },
  { id: "available", label: "Available" },
  { id: "offline", label: "Offline" },
];

export function SearchFilter({
  query,
  onQuery,
  status,
  onStatus,
  placeholder,
}: {
  query: string;
  onQuery: (v: string) => void;
  status: "all" | TruckStatus;
  onStatus: (v: "all" | TruckStatus) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="sr-only" htmlFor="fleet-search">
        Search fleet
      </label>
      <input
        id="fleet-search"
        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink lg:max-w-md"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Status filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm ${
              status === f.id ? "bg-blue-700 text-white" : "border border-line bg-surface text-ink"
            }`}
            onClick={() => onStatus(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
