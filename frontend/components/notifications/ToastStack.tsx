"use client";

import { useFleet } from "@/context/FleetContext";
import { useEffect } from "react";

export function ToastStack() {
  const { toasts, dismissToast } = useFleet();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(100%-2rem,22rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} message={toast.message} severity={toast.severity} onDone={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  message,
  severity,
  onDone,
}: {
  message: string;
  severity: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 4200);
    return () => window.clearTimeout(id);
  }, [onDone]);

  const color =
    severity === "critical"
      ? "bg-red-600"
      : severity === "success"
        ? "bg-emerald-600"
        : severity === "warning"
          ? "bg-amber-500"
          : "bg-blue-700";

  return (
    <div className={`pointer-events-auto rounded-xl px-4 py-3 text-sm text-white shadow-lg ${color}`} role="status">
      {message}
    </div>
  );
}
