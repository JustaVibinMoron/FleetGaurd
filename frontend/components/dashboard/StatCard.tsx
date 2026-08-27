export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
}) {
  const tones = {
    blue: "from-blue-600 to-indigo-600",
    green: "from-emerald-600 to-teal-600",
    amber: "from-amber-500 to-orange-500",
    red: "from-red-600 to-rose-600",
    slate: "from-slate-600 to-slate-800",
  };

  return (
    <article className="card group p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} p-2.5 text-white`}>{icon}</div>
      </div>
    </article>
  );
}
