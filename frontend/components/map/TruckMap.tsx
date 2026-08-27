"use client";

import dynamic from "next/dynamic";

const TruckMapInner = dynamic(() => import("@/components/map/TruckMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-line bg-surface-2 text-sm text-muted">
      Loading live map…
    </div>
  ),
});

export function TruckMap() {
  return <TruckMapInner />;
}
