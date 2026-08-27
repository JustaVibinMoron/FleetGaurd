"use client";

import { Modal } from "@/components/ui/Modal";
import { COMPANY_NAME } from "@/data/mock";
import { useFleet } from "@/context/FleetContext";
import { useEffect, useRef, useState } from "react";

export function TruckRequestModal() {
  const { request, setRequestStatus, clearRequest, pushNotification } = useFleet();
  const [error, setError] = useState("");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  if (!request) return null;

  function send() {
    const current = request;
    if (!current) return;
    setError("");
    setRequestStatus("sending");
    timer.current = window.setTimeout(() => {
      setRequestStatus("sent");
      timer.current = window.setTimeout(() => {
        const fail = Math.random() < 0.08;
        if (fail) {
          setRequestStatus("rejected");
          setError("Partner network timed out. Try another truck.");
          pushNotification("Request failed", "Partner did not accept in time.", "warning");
        } else {
          setRequestStatus("accepted");
          pushNotification("Partner accepted", `${current.partnerCompany} accepted your request.`, "success", current.partnerTruckId);
        }
      }, 2200);
    }, 900);
  }

  return (
    <Modal title="Replacement Truck Request" onClose={clearRequest}>
      <dl className="space-y-2 text-sm">
        <Row label="Requesting Company" value={COMPANY_NAME} />
        <Row label="Partner Company" value={request.partnerCompany} />
        <Row label="Required Capacity" value={`${request.requiredCapacity} tons`} />
        <Row label="Pickup Location" value={request.pickup} />
        <Row label="Destination" value={request.destination} />
        <Row label="Expected Usage" value="Emergency delivery replacement" />
      </dl>

      {request.status === "sending" && <p className="mt-4 text-sm text-muted">Sending request…</p>}
      {request.status === "sent" && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          🟢 Request Sent — Waiting for partner company response.
        </p>
      )}
      {request.status === "accepted" && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {request.partnerCompany} accepted your request.
        </p>
      )}
      {(request.status === "rejected" || error) && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex gap-2">
        {request.status === "idle" && (
          <button type="button" className="rounded-xl bg-blue-700 px-4 py-2 text-white" onClick={send}>
            Send Request
          </button>
        )}
        <button type="button" className="rounded-xl border border-line px-4 py-2" onClick={clearRequest}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
