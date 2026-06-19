import type { NavPoint } from "@/lib/mfapi";
import { monthlyReturnsMatrix } from "@/lib/finance";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function cellColor(v: number | null): string {
  if (v == null) return "bg-muted/30 text-muted-foreground";
  const pct = v * 100;
  if (pct >= 8) return "bg-emerald-500/80 text-white";
  if (pct >= 4) return "bg-emerald-500/55 text-white";
  if (pct >= 1) return "bg-emerald-500/30 text-emerald-100";
  if (pct > -1) return "bg-muted text-foreground";
  if (pct > -4) return "bg-red-500/30 text-red-100";
  if (pct > -8) return "bg-red-500/55 text-white";
  return "bg-red-600/80 text-white";
}

export function MonthlyHeatmap({ data }: { data: NavPoint[] }) {
  const { years, matrix, yearTotals } = monthlyReturnsMatrix(data);
  if (!years.length) return <div className="text-sm text-muted-foreground">No data.</div>;
  const recent = years.slice(-12);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-1 text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="px-2 py-1 text-left font-medium">Year</th>
            {MONTHS.map((m) => (
              <th key={m} className="px-2 py-1 font-medium">
                {m}
              </th>
            ))}
            <th className="px-2 py-1 font-semibold">YTD</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((y) => (
            <tr key={y}>
              <td className="px-2 py-1 font-mono text-muted-foreground">{y}</td>
              {matrix[y].map((v, i) => (
                <td
                  key={i}
                  className={`rounded-md px-2 py-1.5 text-center font-mono tabular-nums ${cellColor(v)}`}
                  title={v == null ? "" : `${(v * 100).toFixed(2)}%`}
                >
                  {v == null ? "·" : `${(v * 100).toFixed(1)}`}
                </td>
              ))}
              <td
                className={`rounded-md px-2 py-1.5 text-center font-mono font-semibold tabular-nums ${cellColor(
                  yearTotals[y],
                )}`}
              >
                {yearTotals[y] == null ? "·" : `${((yearTotals[y] as number) * 100).toFixed(1)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">Values shown as percent return for the month.</p>
    </div>
  );
}
