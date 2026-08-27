import Image from "next/image";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Image src="/logo.svg" alt="" width={36} height={36} className="rounded-lg" />
      {!compact && (
        <div>
          <p className="text-sm font-semibold tracking-tight text-ink">FleetGuard</p>
          <p className="text-[11px] text-muted">Emergency Logistics</p>
        </div>
      )}
    </div>
  );
}
