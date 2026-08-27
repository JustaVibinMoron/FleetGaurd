"use client";

import { useFleet } from "@/context/FleetContext";
import { unreadCount } from "@/lib/notifications";
import type { NotificationSeverity } from "@/lib/types";
import { useMemo, useState } from "react";

const FILTERS: { id: "all" | NotificationSeverity; label: string }[] = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "warning", label: "Warning" },
  { id: "success", label: "Success" },
  { id: "info", label: "Info" },
];

export function NotificationPanel() {
  const { notifications, markRead, markAllRead, clearNotifications, setSection, setSelectedTruckId } = useFleet();
  const [filter, setFilter] = useState<"all" | NotificationSeverity>("all");
  const unread = unreadCount(notifications);
  const list = useMemo(
    () => notifications.filter((n) => filter === "all" || n.severity === filter),
    [notifications, filter],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-muted">{unread} unread</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl border border-line px-3 py-2 text-sm" onClick={markAllRead}>
            Mark as read
          </button>
          <button className="rounded-xl border border-line px-3 py-2 text-sm" onClick={clearNotifications}>
            Clear
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`rounded-full px-3 py-1.5 text-sm ${filter === f.id ? "bg-blue-700 text-white" : "border border-line"}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">No notifications in this filter.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((item) => (
            <li key={item.id} className={`card p-4 ${item.read ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm">{item.message}</p>
                  <p className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <button className="text-xs text-primary" onClick={() => markRead(item.id)}>
                  {item.read ? "Read" : "Mark read"}
                </button>
              </div>
              {item.truckId && (
                <button
                  className="mt-2 text-sm text-primary"
                  onClick={() => {
                    setSelectedTruckId(item.truckId!);
                    setSection("trucks");
                  }}
                >
                  View Truck
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
