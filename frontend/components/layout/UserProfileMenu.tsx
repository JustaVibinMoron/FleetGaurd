"use client";

import { useAuth } from "@/context/AuthContext";
import { useFleet } from "@/context/FleetContext";
import type { DashboardSection } from "@/lib/types";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function UserProfileMenu() {
  const { user, logout } = useAuth();
  const { setSection } = useFleet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  function go(section: DashboardSection) {
    setSection(section);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="hidden sm:block">
          <span className="block text-sm font-medium text-ink">{user.fullName}</span>
          <span className="block text-xs text-muted">{user.companyName}</span>
        </span>
        <ChevronDown size={16} className="text-muted" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          <MenuItem icon={<UserRound size={16} />} onClick={() => go("profile")}>
            Profile
          </MenuItem>
          <MenuItem icon={<Settings size={16} />} onClick={() => go("settings")}>
            Account Settings
          </MenuItem>
          <MenuItem icon={<LogOut size={16} />} onClick={logout}>
            Sign Out
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-2" onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}
