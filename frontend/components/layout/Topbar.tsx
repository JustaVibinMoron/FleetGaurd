"use client";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { useFleet } from "@/context/FleetContext";
import { unreadCount } from "@/lib/notifications";
import { Bell, Menu } from "lucide-react";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { notifications, setSection } = useFleet();
  const unread = unreadCount(notifications);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-xl border border-line p-2 lg:hidden"
          aria-label="Open navigation menu"
          onClick={onMenu}
        >
          <Menu size={18} />
        </button>
        <div>
          <p className="text-sm font-semibold text-ink">FleetGuard Command</p>
          <p className="text-xs text-muted">Live operations · East India corridor</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative rounded-xl border border-line p-2"
          aria-label="Open notifications"
          onClick={() => setSection("notifications")}
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{unread}</span>
          )}
        </button>
        <ThemeToggle />
        <UserProfileMenu />
      </div>
    </header>
  );
}
