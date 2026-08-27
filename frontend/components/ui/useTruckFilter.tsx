"use client";

import { SearchFilter } from "@/components/ui/SearchFilter";
import { useFleet } from "@/context/FleetContext";
import { filterTrucks } from "@/lib/trucks";
import type { TruckStatus } from "@/lib/types";
import { useMemo, useState } from "react";

export function SearchFilterBar({
  query,
  setQuery,
  status,
  setStatus,
}: {
  query: string;
  setQuery: (v: string) => void;
  status: "all" | TruckStatus;
  setStatus: (v: "all" | TruckStatus) => void;
}) {
  return (
    <SearchFilter
      query={query}
      onQuery={setQuery}
      status={status}
      onStatus={setStatus}
      placeholder="Search truck ID, driver, location, status, destination"
    />
  );
}

export function useTruckFilter() {
  const { trucks } = useFleet();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | TruckStatus>("all");
  const filtered = useMemo(() => filterTrucks(trucks, query, status), [trucks, query, status]);
  return { query, setQuery, status, setStatus, filtered };
}
