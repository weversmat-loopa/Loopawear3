"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type RevenueRow = {
  date: string; // ISO date string e.g. "2024-06-01"
  revenue: number; // euros (float)
  platformFee: number;
  creatorEarnings: number;
};

type Granularity = "day" | "week" | "month";

function groupBy(rows: RevenueRow[], gran: Granularity): RevenueRow[] {
  const map = new Map<string, RevenueRow>();

  for (const row of rows) {
    const d = new Date(row.date);
    let key: string;
    if (gran === "day") {
      key = row.date.slice(0, 10);
    } else if (gran === "week") {
      // Monday of the week
      const day = d.getDay(); // 0=Sun
      const diff = (day + 6) % 7;
      const mon = new Date(d);
      mon.setDate(d.getDate() - diff);
      key = mon.toISOString().slice(0, 10);
    } else {
      key = row.date.slice(0, 7); // "YYYY-MM"
    }

    const existing = map.get(key);
    if (existing) {
      existing.revenue += row.revenue;
      existing.platformFee += row.platformFee;
      existing.creatorEarnings += row.creatorEarnings;
    } else {
      map.set(key, { date: key, revenue: row.revenue, platformFee: row.platformFee, creatorEarnings: row.creatorEarnings });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function formatLabel(date: string, gran: Granularity) {
  const d = new Date(date + "T00:00:00");
  if (gran === "month") return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  if (gran === "week") return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function euroFormatter(value: number) {
  return `€${value.toFixed(2)}`;
}

// Custom tooltip styled to match Loopawear
function CustomTooltip({ active, payload, label, gran }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  gran: Granularity;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="ink-card rounded-xl bg-paper px-4 py-3 text-xs shadow-lg">
      <p className="mb-2 font-display text-sm text-ink">{formatLabel(label, gran)}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {euroFormatter(p.value)}
        </p>
      ))}
    </div>
  );
}

interface Props {
  rows: RevenueRow[];
}

export default function AdminDashboardCharts({ rows }: Props) {
  const [gran, setGran] = useState<Granularity>("day");

  const grouped = useMemo(() => groupBy(rows, gran), [rows, gran]);

  const displayData = useMemo(
    () =>
      grouped.map((r) => ({
        ...r,
        date: r.date,
        label: formatLabel(r.date, gran),
        revenue: parseFloat(r.revenue.toFixed(2)),
        platformFee: parseFloat(r.platformFee.toFixed(2)),
        creatorEarnings: parseFloat(r.creatorEarnings.toFixed(2)),
      })),
    [grouped, gran]
  );

  const isEmpty = rows.length === 0;

  return (
    <div className="space-y-8">
      {/* ── Revenue over time ─────────────────────────────────── */}
      <div className="ink-card rounded-xl bg-paper p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-hand text-base font-bold text-brand-blue">Sales</p>
            <h2 className="font-display text-xl text-ink">Revenue over time</h2>
          </div>
          <div className="flex gap-1 rounded-full border-2 border-ink bg-paper-2 p-1">
            {(["day", "week", "month"] as Granularity[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGran(g)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  gran === g
                    ? "bg-ink text-paper"
                    : "text-zinc-500 hover:text-ink"
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isEmpty ? (
          <EmptyChart label="No orders yet — revenue chart will appear here." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={displayData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e8631a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#e8631a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--color-zinc-200)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v) => formatLabel(v, gran)} tick={{ fontSize: 11, fill: "var(--color-zinc-500)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 11, fill: "var(--color-zinc-500)" }} axisLine={false} tickLine={false} width={54} />
              <Tooltip content={<CustomTooltipWrapper gran={gran} />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#e8631a" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: "#e8631a" }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Platform vs Creator split ─────────────────────────── */}
      <div className="ink-card rounded-xl bg-paper p-6">
        <div className="mb-4">
          <p className="font-hand text-base font-bold text-brand-blue">Earnings split</p>
          <h2 className="font-display text-xl text-ink">Platform profit vs creator payouts</h2>
        </div>

        {isEmpty ? (
          <EmptyChart label="No orders yet — earnings split will appear here." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={displayData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--color-zinc-200)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v) => formatLabel(v, gran)} tick={{ fontSize: 11, fill: "var(--color-zinc-500)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 11, fill: "var(--color-zinc-500)" }} axisLine={false} tickLine={false} width={54} />
              <Tooltip content={<CustomTooltipWrapper gran={gran} />} />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: "var(--color-zinc-600)" }}>{value}</span>
                )}
              />
              <Bar dataKey="platformFee" name="Platform profit" stackId="a" fill="#2b4bd6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="creatorEarnings" name="Creator payouts" stackId="a" fill="#2e9e4f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// Thin wrapper so we can pass `gran` into the custom tooltip
function CustomTooltipWrapper({ gran, ...rest }: { gran: Granularity; active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  return <CustomTooltip gran={gran} {...rest} />;
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700">
      <p className="text-sm text-zinc-400 dark:text-zinc-500">{label}</p>
    </div>
  );
}
