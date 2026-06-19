import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, GitCompare, Loader2, TrendingDown, TrendingUp as TrendUp } from "lucide-react";
import { fetchScheme } from "@/lib/mfapi";
import {
  bestWorstPeriods,
  formatPct,
  maxDrawdown,
  rollingReturns,
  sinceInception,
  volatility,
} from "@/lib/finance";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonthlyHeatmap } from "@/components/monthly-heatmap";
import { RollingReturnsChart } from "@/components/rolling-returns-chart";
import { FeeImpactCalculator } from "@/components/fee-impact";

function schemeQuery(code: string) {
  return queryOptions({
    queryKey: ["scheme", code],
    queryFn: () => fetchScheme(code),
    staleTime: 1000 * 60 * 10,
  });
}

export const Route = createFileRoute("/fund/$code")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(schemeQuery(params.code)),
  head: ({ params }) => ({
    meta: [
      { title: `Fund #${params.code} — FundLens` },
      { name: "description", content: `NAV history and analysis for scheme ${params.code}.` },
    ],
  }),
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h2 className="text-xl font-semibold">Couldn't load this fund</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                router.invalidate();
                reset();
              }}
            >
              Try again
            </Button>
            <Button asChild>
              <Link to="/">Back to search</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  },
  component: FundPage,
});

const RANGES = [
  { label: "1M", days: 30 },
  { label: "6M", days: 182 },
  { label: "1Y", days: 365 },
  { label: "3Y", days: 365 * 3 },
  { label: "5Y", days: 365 * 5 },
  { label: "Max", days: 0 },
];

function FundPage() {
  const { code } = Route.useParams();
  const { data: scheme } = useSuspenseQuery(schemeQuery(code));
  const [range, setRange] = useState("1Y");

  const filtered = useMemo(() => {
    if (!scheme.data.length) return [];
    const r = RANGES.find((x) => x.label === range)!;
    if (r.days === 0) return scheme.data;
    const cutoff = scheme.data[scheme.data.length - 1].ts - r.days * 86400000;
    return scheme.data.filter((d) => d.ts >= cutoff);
  }, [scheme.data, range]);

  const rolling = useMemo(
    () => ({
      "1Y": rollingReturns(scheme.data, 1),
      "3Y": rollingReturns(scheme.data, 3),
      "5Y": rollingReturns(scheme.data, 5),
      "7Y": rollingReturns(scheme.data, 7),
      "10Y": rollingReturns(scheme.data, 10),
    }),
    [scheme.data],
  );
  const inception = useMemo(() => sinceInception(scheme.data), [scheme.data]);
  const maxDD = useMemo(() => maxDrawdown(scheme.data), [scheme.data]);
  const vol = useMemo(() => volatility(scheme.data), [scheme.data]);
  const bestWorst1M = useMemo(() => bestWorstPeriods(scheme.data, 30), [scheme.data]);
  const bestWorst1Y = useMemo(() => bestWorstPeriods(scheme.data, 365), [scheme.data]);

  const navMin = filtered.length ? Math.min(...filtered.map((d) => d.nav)) : 0;
  const navMax = filtered.length ? Math.max(...filtered.map((d) => d.nav)) : 0;
  const yPad = (navMax - navMin) * 0.1 || 1;
  const ddOverlay = useMemo(() => {
    if (!maxDD || !filtered.length) return null;
    const startTs = parseDDate(maxDD.peakDate);
    const endTs = parseDDate(maxDD.troughDate);
    if (startTs < filtered[0].ts || endTs > filtered[filtered.length - 1].ts) return null;
    return { startTs, endTs };
  }, [maxDD, filtered]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{scheme.meta.fund_house}</Badge>
              <Badge variant="outline">{scheme.meta.scheme_category}</Badge>
              <span className="text-xs text-muted-foreground">#{scheme.meta.scheme_code}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {scheme.meta.scheme_name}
            </h1>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/compare" search={{ a: code, b: undefined }}>
              <GitCompare className="mr-1.5 h-4 w-4" /> Compare
            </Link>
          </Button>
        </div>

        {scheme.latest && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Latest NAV" value={`₹${scheme.latest.nav.toFixed(4)}`} sub={scheme.latest.date} />
            <Stat label="1Y CAGR" value={rolling["1Y"] ? formatPct(rolling["1Y"].cagr) : "—"} />
            <Stat label="3Y CAGR" value={rolling["3Y"] ? formatPct(rolling["3Y"].cagr) : "—"} />
            <Stat label="5Y CAGR" value={rolling["5Y"] ? formatPct(rolling["5Y"].cagr) : "—"} />
          </div>
        )}

        <Card className="mt-6 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">NAV history</h2>
            <div className="flex flex-wrap gap-1">
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setRange(r.label)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    range === r.label
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filtered} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="navfill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <YAxis
                  domain={[navMin - yPad, navMax + yPad]}
                  tickFormatter={(v: number) => v.toFixed(1)}
                  fontSize={11}
                  stroke="hsl(var(--muted-foreground))"
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(t) => new Date(t as number).toLocaleDateString("en-IN")}
                  formatter={(v: number) => [`₹${v.toFixed(4)}`, "NAV"]}
                />
                <Area
                  type="monotone"
                  dataKey="nav"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#navfill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="mt-6 p-4">
          <h2 className="mb-3 text-sm font-semibold">Rolling returns</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Period</th>
                  <th className="py-2">Absolute</th>
                  <th className="py-2">CAGR</th>
                  <th className="py-2">From</th>
                </tr>
              </thead>
              <tbody>
                {(["1Y", "3Y", "5Y", "7Y", "10Y"] as const).map((p) => {
                  const r = rolling[p];
                  return (
                    <tr key={p} className="border-b last:border-0">
                      <td className="py-2 font-medium">{p}</td>
                      <td className="py-2">{r ? formatPct(r.absolute) : "—"}</td>
                      <td className="py-2">{r ? formatPct(r.cagr) : "—"}</td>
                      <td className="py-2 text-muted-foreground">{r ? r.startDate : "—"}</td>
                    </tr>
                  );
                })}
                {inception && (
                  <tr>
                    <td className="py-2 font-medium">Since inception</td>
                    <td className="py-2">{formatPct(inception.absolute)}</td>
                    <td className="py-2">{formatPct(inception.cagr)}</td>
                    <td className="py-2 text-muted-foreground">
                      {scheme.data[0].date} ({inception.years.toFixed(1)}y)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Calculator
          defaultCagr={rolling["5Y"]?.cagr ?? rolling["3Y"]?.cagr ?? inception?.cagr ?? 0.12}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function Calculator({ defaultCagr }: { defaultCagr: number }) {
  const [years, setYears] = useState(10);
  const [expense, setExpense] = useState(0.5);
  const [cagrPct, setCagrPct] = useState(+(defaultCagr * 100).toFixed(2));
  const [sip, setSip] = useState(10000);
  const [lump, setLump] = useState(100000);

  const sipRes = sipProjection(sip, cagrPct / 100, years, expense);
  const lumpRes = lumpsumProjection(lump, cagrPct / 100, years, expense);

  return (
    <Card className="mt-6 p-4">
      <h2 className="mb-1 text-sm font-semibold">Returns calculator</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Projects future value using a CAGR you choose, net of the fund's expense ratio. Pre-filled
        with the 5Y historical CAGR.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs">Expected CAGR (%)</Label>
          <Input type="number" step="0.1" value={cagrPct} onChange={(e) => setCagrPct(+e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Expense ratio (%)</Label>
          <Input type="number" step="0.01" value={expense} onChange={(e) => setExpense(+e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Duration: {years} years</Label>
          <input
            type="range"
            min={1}
            max={30}
            value={years}
            onChange={(e) => setYears(+e.target.value)}
            className="mt-2 w-full accent-[hsl(var(--primary))]"
          />
        </div>
      </div>

      <Tabs defaultValue="sip" className="mt-5">
        <TabsList>
          <TabsTrigger value="sip">SIP</TabsTrigger>
          <TabsTrigger value="lump">Lumpsum</TabsTrigger>
        </TabsList>
        <TabsContent value="sip" className="mt-3">
          <div className="mb-3 max-w-xs">
            <Label className="text-xs">Monthly investment (₹)</Label>
            <Input type="number" step="500" value={sip} onChange={(e) => setSip(+e.target.value)} />
          </div>
          <Outcome
            invested={sipRes.invested}
            future={sipRes.future}
            gain={sipRes.gain}
          />
        </TabsContent>
        <TabsContent value="lump" className="mt-3">
          <div className="mb-3 max-w-xs">
            <Label className="text-xs">One-time investment (₹)</Label>
            <Input type="number" step="1000" value={lump} onChange={(e) => setLump(+e.target.value)} />
          </div>
          <Outcome
            invested={lumpRes.invested}
            future={lumpRes.future}
            gain={lumpRes.gain}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function Outcome({ invested, future, gain }: { invested: number; future: number; gain: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Stat label="Invested" value={formatINR(invested)} />
      <Stat label="Gain" value={formatINR(gain)} />
      <Stat label="Future value" value={formatINR(future)} />
    </div>
  );
}
