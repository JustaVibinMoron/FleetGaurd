"use client";

import { Logo } from "@/components/layout/Logo";
import { useFleet } from "@/context/FleetContext";
import { unreadCount } from "@/lib/notifications";
import type { DashboardSection } from "@/lib/types";
import {
  Activity,
  Bell,
  LayoutDashboard,
  MapPinned,
  Route,
  Siren,
  Truck,
  Users,
} from "lucide-react";

const LINKS: { id: DashboardSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "trucks", label: "Trucks", icon: Truck },
  { id: "deliveries", label: "Deliveries", icon: Activity },
  { id: "routes", label: "Routes", icon: Route },
  { id: "emergency", label: "Emergency", icon: Siren },
  { id: "partners", label: "Partner Network", icon: Users },
  { id: "analytics", label: "Analytics", icon: MapPinned },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { section, setSection, notifications } = useFleet();
  const unread = unreadCount(notifications);

  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-4 p-4">
      <Logo />
      <ul className="space-y-1">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active = section === link.id;
          return (
            <li key={link.id}>
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-blue-700 text-white" : "text-ink hover:bg-surface-2"
                }`}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setSection(link.id);
                  onNavigate?.();
                }}
              >
                <span className="flex items-center gap-2">
                  <Icon size={18} />
                  {link.label}
                </span>
                {link.id === "notifications" && unread > 0 && (
                  <span className={`rounded-full px-2 text-xs ${active ? "bg-white text-blue-800" : "bg-red-600 text-white"}`}>
                    {unread}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
