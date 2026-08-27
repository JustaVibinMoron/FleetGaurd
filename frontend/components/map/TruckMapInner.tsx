"use client";

import { useFleet } from "@/context/FleetContext";
import { statusLabel } from "@/lib/trucks";
import type { TruckStatus } from "@/lib/types";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const COLORS: Record<TruckStatus, string> = {
  "on-route": "#2563eb",
  delayed: "#ca8a04",
  emergency: "#dc2626",
  available: "#0f766e",
  offline: "#475569",
};

function iconFor(status: TruckStatus, id: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${COLORS[status]};color:white;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:700;box-shadow:0 6px 16px rgba(0,0,0,.25);white-space:nowrap">${id}</div>`,
    iconSize: [64, 24],
    iconAnchor: [32, 12],
  });
}

export default function TruckMapInner() {
  const { trucks, setSelectedTruckId, setSection } = useFleet();

  return (
    <div className="h-[420px] overflow-hidden rounded-2xl border border-line">
      <MapContainer center={[21.8, 86.6]} zoom={7} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {trucks.map((truck) => (
          <Marker key={truck.id} position={[truck.lat, truck.lng]} icon={iconFor(truck.status, truck.id)}>
            <Popup>
              <div className="min-w-48 text-slate-900">
                <p className="font-semibold">{truck.id}</p>
                <p>Driver: {truck.driver}</p>
                <p>Location: {truck.location}</p>
                <p>Speed: {truck.speed} km/h</p>
                <p>
                  Load: {truck.load} / {truck.capacity} t
                </p>
                <p>Destination: {truck.destination}</p>
                <p>Status: {statusLabel(truck.status)}</p>
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-blue-700 px-3 py-1 text-white"
                  onClick={() => {
                    setSelectedTruckId(truck.id);
                    setSection("trucks");
                  }}
                >
                  View truck
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
