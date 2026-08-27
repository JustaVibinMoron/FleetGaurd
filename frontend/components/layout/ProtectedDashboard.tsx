"use client";

import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { Overview } from "@/components/dashboard/Overview";
import { EmergencyPanel } from "@/components/emergency/EmergencyPanel";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProfilePage, SettingsPage } from "@/components/layout/AccountPages";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { PartnerNetwork } from "@/components/partners/PartnerNetwork";
import { RoutePlanner } from "@/components/routes/RoutePlanner";
import { LoadMonitoring } from "@/components/trucks/LoadMonitoring";
import { TruckTable } from "@/components/trucks/TruckTable";
import { useFleet } from "@/context/FleetContext";
import { COMPANY_NAME } from "@/data/mock";

export function ProtectedDashboard() {
  const { section, deliveries } = useFleet();

  return (
    <DashboardLayout>
      {section === "dashboard" && <Overview />}
      {section === "trucks" && (
        <div className="space-y-8">
          <TruckTable />
          <LoadMonitoring />
        </div>
      )}
      {section === "deliveries" && (
        <section className="card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-2">
              <tr>
                {["ID", "Truck", "Origin", "Destination", "Cargo", "Status", "ETA (h)"].map((h) => (
                  <th key={h} className="px-3 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id} className="border-t border-line">
                  <td className="px-3 py-2">{d.id}</td>
                  <td className="px-3 py-2">{d.truckId}</td>
                  <td className="px-3 py-2">{d.origin}</td>
                  <td className="px-3 py-2">{d.destination}</td>
                  <td className="px-3 py-2">{d.cargo}</td>
                  <td className="px-3 py-2">{d.status}</td>
                  <td className="px-3 py-2">{d.etaHours}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-xs text-muted">{COMPANY_NAME} delivery board · {deliveries.length} records</p>
        </section>
      )}
      {section === "routes" && <RoutePlanner />}
      {section === "emergency" && <EmergencyPanel />}
      {section === "partners" && <PartnerNetwork />}
      {section === "analytics" && <AnalyticsCharts />}
      {section === "notifications" && <NotificationPanel />}
      {section === "profile" && <ProfilePage />}
      {section === "settings" && <SettingsPage />}
    </DashboardLayout>
  );
}
