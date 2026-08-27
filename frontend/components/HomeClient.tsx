"use client";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { ProtectedDashboard } from "@/components/layout/ProtectedDashboard";
import { useAuth } from "@/context/AuthContext";

export function HomeClient() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-muted" role="status">
        Loading FleetGuard…
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  return <ProtectedDashboard />;
}
