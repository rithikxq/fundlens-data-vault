import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";

import { z } from "zod";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { X, Loader2 } from "lucide-react";
import { fetchScheme, type SchemeDetail } from "@/lib/mfapi";
import { formatPct, rollingReturns, sinceInception } from "@/lib/finance";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { SchemeSearch } from "@/components/scheme-search";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  a: z.string().optional(),
  b: z.string().optional(),
});

export const Route = createFileRoute("/compare")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Compare mutual funds — FundLens" },
      {
        name: "description",
        content: "Stack two Indian mutual funds side-by-side: normalised NAV, CAGRs, and category.",
      },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { a, b } = Route.useSearch();
  const navigate = useNavigate({ from: "/compare" });

  const queries = useQueries({
    queries: [a, b].map((code) => ({
      queryKey: ["scheme", code ?? ""],
      queryFn: () => fetchScheme(code as string),
      enabled: !!code,
      staleTime: 1000 * 60 * 10,
    })),
  });
  const [qa, qb] = queries;

  const setSlot = (slot: "a" | "b", code?: string) =>
    navigate({ search: (prev) => ({ ...prev, [slot]: code }) });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Compare funds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick two funds to see normalised NAV and side-by-side CAGRs.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Slot
            label="Fund A"
            scheme={qa.data}
            loading={qa.isLoading}
            onClear={() => setSlot("a", undefined)}
            onPick={(code) => setSlot("a", code)}
          />
          <Slot
            label="Fund B"
            scheme={qb.data}
            loading={qb.isLoading}
            onClear={() => setSlot("b", undefined)}
            onPick={(code) => setSlot("b", code)}
          />
        </div>

        {qa.data && qb.data && <ComparisonView a={qa.data} b={qb.data} />}
      </main>
      <SiteFooter />
    </div>
  );
}

function Slot({
  label,
  scheme,
  loading,
  onClear,
  onPick,
}: {
  label: string;
  scheme?: SchemeDetail;
  loading: boolean;
  onClear: () => void;
  onPick: (code: string) => void;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {scheme && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {loading ? (
        <div className="flex h-20 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : scheme ? (
        <div>
          <div className="font-semibold leading-snug">{scheme.meta.scheme_name}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{scheme.meta.fund_house}</Badge>
            <Badge variant="outline">{scheme.meta.scheme_category}</Badge>
          </div>
          {scheme.latest && (
            <div className="mt-3 text-sm text-muted-foreground">
              Latest NAV: ₹{scheme.latest.nav.toFixed(4)} ({scheme.latest.date})
            </div>
          )}
        </div>
      ) : (
        <SchemeSearch
          autoNavigate={false}
          onPick={(s) => onPick(String(s.schemeCode))}
          placeholder="Search a fund…"
        />
      )}
    </Card>
  );
}

function ComparisonView({ a, b }: { a: SchemeDetail; b: SchemeDetail }) {
  const chart = useMemo(() => {
    // Normalise to 100 on a common start
    const startTs = Math.max(a.data[0]?.ts ?? 0, b.data[0]?.ts ?? 0);
    const aFrom = a.data.find((d) => d.ts >= startTs);
    const bFrom = b.data.find((d) => d.ts >= startTs);
    if (!aFrom || !bFrom) return [];
    const aBase = aFrom.nav;
    const bBase = bFrom.nav;

    // Sample monthly
    const map = new Map<number, { ts: number; a?: number; b?: number }>();
    const monthKey = (ts: number) => {
      const d = new Date(ts);
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    };
    for (const p of a.data) {
      if (p.ts < startTs) continue;
      const k = monthKey(p.ts);
      const e = map.get(k) ?? { ts: k };
      e.a = (p.nav / aBase) * 100;
      map.set(k, e);
    }
    for (const p of b.data) {
      if (p.ts < startTs) continue;
      const k = monthKey(p.ts);
      const e = map.get(k) ?? { ts: k };
      e.b = (p.nav / bBase) * 100;
      map.set(k, e);
    }
    return Array.from(map.values()).sort((x, y) => x.ts - y.ts);
  }, [a, b]);

  const aLabel = shortName(a.meta.scheme_name);
  const bLabel = shortName(b.meta.scheme_name);

  const periods = ["1Y", "3Y", "5Y", "7Y", "10Y"] as const;

  return (
    <>
      <Card className="mt-6 p-4">
        <h2 className="mb-3 text-sm font-semibold">Growth of ₹100 (normalised)</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                tickFormatter={(t: number) =>
                  new Date(t).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
                }
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" width={50} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(t) => new Date(t as number).toLocaleDateString("en-IN")}
                formatter={(v: number, n) => [v?.toFixed(2), n === "a" ? aLabel : bLabel]}
              />
              <Legend
                formatter={(value) => (value === "a" ? aLabel : bLabel)}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Line type="monotone" dataKey="a" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="b" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mt-6 p-4">
        <h2 className="mb-3 text-sm font-semibold">CAGR comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Period</th>
                <th className="py-2">{aLabel}</th>
                <th className="py-2">{bLabel}</th>
                <th className="py-2">Delta</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => {
                const ra = rollingReturns(a.data, +p.replace("Y", ""));
                const rb = rollingReturns(b.data, +p.replace("Y", ""));
                const delta = ra && rb ? ra.cagr - rb.cagr : null;
                return (
                  <tr key={p} className="border-b last:border-0">
                    <td className="py-2 font-medium">{p}</td>
                    <td className="py-2">{ra ? formatPct(ra.cagr) : "—"}</td>
                    <td className="py-2">{rb ? formatPct(rb.cagr) : "—"}</td>
                    <td
                      className={`py-2 ${
                        delta == null
                          ? ""
                          : delta > 0
                            ? "text-emerald-600"
                            : "text-red-600"
                      }`}
                    >
                      {delta == null ? "—" : `${delta > 0 ? "+" : ""}${(delta * 100).toFixed(2)}%`}
                    </td>
                  </tr>
                );
              })}
              {(() => {
                const ia = sinceInception(a.data);
                const ib = sinceInception(b.data);
                return (
                  <tr>
                    <td className="py-2 font-medium">Since inception</td>
                    <td className="py-2">{ia ? formatPct(ia.cagr) : "—"}</td>
                    <td className="py-2">{ib ? formatPct(ib.cagr) : "—"}</td>
                    <td className="py-2 text-muted-foreground">—</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function shortName(name: string): string {
  return name.replace(/ - Direct Plan.*$/, "").replace(/ Fund$/, "");
}
