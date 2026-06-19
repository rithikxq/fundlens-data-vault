import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NavPoint } from "@/lib/mfapi";
import { rollingCagrSeries, rollingStats, formatPct } from "@/lib/finance";

const PERIODS = [1, 3, 5, 7] as const;

export function RollingReturnsChart({ data }: { data: NavPoint[] }) {
  const [years, setYears] = useState<(typeof PERIODS)[number]>(3);
  const series = useMemo(() => rollingCagrSeries(data, years), [data, years]);
  const stats = useMemo(() => rollingStats(series), [series]);
  const chart = useMemo(() => series.map((s) => ({ ts: s.ts, pct: +(s.cagr * 100).toFixed(2) })), [series]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setYears(p)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                years === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {p}-Year
            </button>
          ))}
        </div>
        {stats && (
          <div className="text-xs text-muted-foreground">
            {stats.count} windows · {formatPct(stats.negativeShare)} negative
          </div>
        )}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={(t: number) =>
                new Date(t).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
              }
              fontSize={11}
              stroke="var(--color-muted-foreground)"
            />
            <YAxis
              fontSize={11}
              stroke="var(--color-muted-foreground)"
              width={50}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v.toFixed(2)}%`, `${years}Y CAGR`]}
              labelFormatter={(t) => new Date(t as number).toLocaleDateString("en-IN")}
            />
            <ReferenceLine y={0} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="pct" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="Min CAGR" value={formatPct(stats.min)} accent={stats.min < 0 ? "text-red-400" : ""} />
          <Mini label="Avg CAGR" value={formatPct(stats.avg)} />
          <Mini label="Max CAGR" value={formatPct(stats.max)} accent="text-emerald-400" />
          <Mini
            label="Probability of loss"
            value={formatPct(stats.negativeShare)}
            accent={stats.negativeShare > 0 ? "text-red-400" : "text-emerald-400"}
          />
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
