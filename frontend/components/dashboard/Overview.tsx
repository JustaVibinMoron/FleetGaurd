"use client";

import { AIAssistant } from "@/components/ai/AIAssistant";
import { StatCard } from "@/components/dashboard/StatCard";
import { TruckMap } from "@/components/map/TruckMap";
import { useFleet } from "@/context/FleetContext";
import { getDashboardStats } from "@/lib/trucks";
import { Activity, AlertTriangle, Bell, Truck, Users, Timer } from "lucide-react";
import { useMemo } from "react";

export function Overview() {
  const { trucks, partnerTrucks, deliveries } = useFleet();
  const stats = useMemo(() => getDashboardStats(trucks, partnerTrucks), [trucks, partnerTrucks]);
  const deliveryCount = deliveries.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Trucks" value={stats.totalTrucks} icon={<Truck size={18} />} tone="blue" />
        <StatCard label="Active Trucks" value={stats.activeTrucks} icon={<Activity size={18} />} tone="green" />
        <StatCard label="Deliveries" value={deliveryCount} icon={<Timer size={18} />} tone="slate" />
        <StatCard label="Delayed" value={stats.delayed} icon={<Bell size={18} />} tone="amber" />
        <StatCard label="Emergency Alerts" value={stats.emergencyAlerts} icon={<AlertTriangle size={18} />} tone="red" />
        <StatCard label="Available Partner Trucks" value={stats.availablePartners} icon={<Users size={18} />} tone="blue" />
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Live truck tracking</h2>
        <TruckMap />
      </div>
      <AIAssistant />
    </div>
  );
}
