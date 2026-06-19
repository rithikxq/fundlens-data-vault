import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Filter, ExternalLink } from "lucide-react";
import { fetchScheme } from "@/lib/mfapi";
import { cagr, maxDrawdown, sinceInception, volatility, formatPct } from "@/lib/finance";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Curated universe of widely-tracked direct-growth schemes (mfapi.in codes).
// Kept ~60 funds across categories to keep the screener responsive.
const UNIVERSE: { code: number; name: string; category: string }[] = [
  { code: 122639, name: "Parag Parikh Flexi Cap", category: "Flexi Cap" },
  { code: 120503, name: "Mirae Asset Large Cap", category: "Large Cap" },
  { code: 120586, name: "Mirae Asset Emerging Bluechip", category: "Large & Mid Cap" },
  { code: 118989, name: "Nippon India Index Nifty 50", category: "Index" },
  { code: 120828, name: "Quant Small Cap", category: "Small Cap" },
  { code: 125354, name: "Quant Active", category: "Multi Cap" },
  { code: 120505, name: "Axis Bluechip", category: "Large Cap" },
  { code: 120465, name: "Axis Long Term Equity", category: "ELSS" },
  { code: 120822, name: "Canara Robeco Bluechip", category: "Large Cap" },
  { code: 119598, name: "Canara Robeco Emerging Equities", category: "Large & Mid Cap" },
  { code: 118550, name: "HDFC Mid-Cap Opportunities", category: "Mid Cap" },
  { code: 118473, name: "HDFC Small Cap", category: "Small Cap" },
  { code: 119226, name: "HDFC Flexi Cap", category: "Flexi Cap" },
  { code: 118269, name: "HDFC Top 100", category: "Large Cap" },
  { code: 119242, name: "Kotak Emerging Equity", category: "Mid Cap" },
  { code: 112090, name: "Kotak Bluechip", category: "Large Cap" },
  { code: 118533, name: "Kotak Flexicap", category: "Flexi Cap" },
  { code: 100356, name: "SBI Bluechip", category: "Large Cap" },
  { code: 125497, name: "SBI Small Cap", category: "Small Cap" },
  { code: 119723, name: "SBI Magnum Midcap", category: "Mid Cap" },
  { code: 119775, name: "SBI Focused Equity", category: "Focused" },
  { code: 100177, name: "ICICI Prudential Bluechip", category: "Large Cap" },
  { code: 120587, name: "ICICI Prudential Value Discovery", category: "Value" },
  { code: 120484, name: "ICICI Prudential Equity & Debt", category: "Hybrid" },
  { code: 120601, name: "ICICI Prudential Smallcap", category: "Small Cap" },
  { code: 118825, name: "Nippon India Small Cap", category: "Small Cap" },
  { code: 113177, name: "Nippon India Large Cap", category: "Large Cap" },
  { code: 118527, name: "DSP Small Cap", category: "Small Cap" },
  { code: 119196, name: "DSP Midcap", category: "Mid Cap" },
  { code: 118533, name: "Kotak Flexicap", category: "Flexi Cap" },
  { code: 120251, name: "UTI Nifty 50 Index", category: "Index" },
  { code: 120716, name: "UTI Flexi Cap", category: "Flexi Cap" },
  { code: 120484, name: "ICICI Pru Equity & Debt", category: "Hybrid" },
  { code: 118989, name: "Nippon India Nifty 50 Index", category: "Index" },
  { code: 120822, name: "Canara Robeco Bluechip", category: "Large Cap" },
  { code: 118474, name: "Franklin India Smaller Cos", category: "Small Cap" },
  { code: 100471, name: "Franklin India Bluechip", category: "Large Cap" },
  { code: 100520, name: "Franklin India Prima", category: "Mid Cap" },
  { code: 120822, name: "Canara Robeco Bluechip", category: "Large Cap" },
  { code: 119551, name: "Tata Digital India", category: "Sectoral" },
  { code: 120484, name: "ICICI Pru Equity & Debt", category: "Hybrid" },
  { code: 119609, name: "Aditya Birla SL Frontline Equity", category: "Large Cap" },
  { code: 103174, name: "Aditya Birla SL Flexi Cap", category: "Flexi Cap" },
  { code: 120484, name: "ICICI Pru Equity & Debt", category: "Hybrid" },
  { code: 120218, name: "Edelweiss Large Cap", category: "Large Cap" },
  { code: 118989, name: "Nippon Nifty 50 Index", category: "Index" },
  { code: 120251, name: "UTI Nifty 50 Index", category: "Index" },
  { code: 147625, name: "Motilal Oswal Nasdaq 100 FOF", category: "International" },
  { code: 145454, name: "Mirae Asset NYSE FANG+", category: "International" },
];

// De-dup
const UNIQUE_UNIVERSE = Array.from(new Map(UNIVERSE.map((u) => [u.code, u])).values());

const MS_YEAR = 365.25 * 24 * 60 * 60 * 1000;

type Row = {
  code: number;
  name: string;
  category: string;
  fundHouse: string;
  ageYears: number;
  cagr5y: number | null;
  cagr10y: number | null;
  inceptionCagr: number;
  maxDD: number;
  vol: number | null;
  latestNav: number;
};

export const Route = createFileRoute("/screener")({
  head: () => ({
    meta: [
      { title: "Screener — FundLens" },
      {
        name: "description",
        content:
          "Filter Indian mutual funds by minimum annualised returns, maximum drawdown, and minimum age.",
      },
    ],
  }),
  component: ScreenerPage,
});

function ScreenerPage() {
  const [minCagr, setMinCagr] = useState(15);
  const [maxDD, setMaxDD] = useState(40);
  const [minAge, setMinAge] = useState(7);

  const queries = useQueries({
    queries: UNIQUE_UNIVERSE.map((u) => ({
      queryKey: ["scheme", String(u.code)],
      queryFn: () => fetchScheme(u.code),
      staleTime: 1000 * 60 * 60,
    })),
  });

  const loaded = queries.filter((q) => q.data).length;
  const total = queries.length;

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      const meta = UNIQUE_UNIVERSE[i];
      if (!q.data || q.data.data.length < 30) continue;
      const inc = sinceInception(q.data.data);
      if (!inc) continue;
      const dd = maxDrawdown(q.data.data);
      const c5 = trailingCagr(q.data.data, 5);
      const c10 = trailingCagr(q.data.data, 10);
      const v = volatility(q.data.data);
      out.push({
        code: meta.code,
        name: q.data.meta.scheme_name,
        category: q.data.meta.scheme_category || meta.category,
        fundHouse: q.data.meta.fund_house,
        ageYears: inc.years,
        cagr5y: c5,
        cagr10y: c10,
        inceptionCagr: inc.cagr,
        maxDD: dd ? Math.abs(dd.drawdown) : 0,
        vol: v,
        latestNav: q.data.latest?.nav ?? 0,
      });
    }
    return out;
  }, [queries]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => r.ageYears >= minAge)
      .filter((r) => (r.cagr5y ?? r.inceptionCagr) * 100 >= minCagr)
      .filter((r) => r.maxDD * 100 <= maxDD)
      .sort((a, b) => (b.cagr5y ?? b.inceptionCagr) - (a.cagr5y ?? a.inceptionCagr));
  }, [rows, minCagr, maxDD, minAge]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Fund screener</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter a curated universe of {UNIQUE_UNIVERSE.length} popular schemes by historical
          performance and risk. Data live from mfapi.in / AMFI.
        </p>

        <Card className="mt-6 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-xs">Min 5Y CAGR (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={minCagr}
                onChange={(e) => setMinCagr(+e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Max drawdown (%)</Label>
              <Input
                type="number"
                step="1"
                value={maxDD}
                onChange={(e) => setMaxDD(+e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Min age (years)</Label>
              <Input
                type="number"
                step="1"
                value={minAge}
                onChange={(e) => setMinAge(+e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {loaded < total ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading {loaded}/{total} funds…
                </span>
              ) : (
                <>Showing {filtered.length} of {rows.length} eligible funds</>
              )}
            </span>
          </div>
        </Card>

        <Card className="mt-6 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Fund</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">5Y CAGR</th>
                  <th className="px-4 py-3 text-right">10Y CAGR</th>
                  <th className="px-4 py-3 text-right">Max DD</th>
                  <th className="px-4 py-3 text-right">Vol</th>
                  <th className="px-4 py-3 text-right">Age</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.code} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{shortName(r.name)}</div>
                      <div className="text-[11px] text-muted-foreground">{r.fundHouse}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.category}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-400">
                      {r.cagr5y != null ? formatPct(r.cagr5y) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {r.cagr10y != null ? formatPct(r.cagr10y) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-red-400">
                      -{(r.maxDD * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {r.vol != null ? formatPct(r.vol, 1) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                      {r.ageYears.toFixed(1)}y
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/fund/$code" params={{ code: String(r.code) }}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {loaded === total && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No funds match these filters. Try loosening them.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}

function trailingCagr(data: { ts: number; nav: number }[], years: number): number | null {
  if (data.length < 2) return null;
  const last = data[data.length - 1];
  const target = last.ts - years * MS_YEAR;
  // binary search would be nicer but linear is fine on monthly-ish ranges here
  let start = null;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].ts <= target) {
      start = data[i];
      break;
    }
  }
  if (!start) return null;
  const yrs = (last.ts - start.ts) / MS_YEAR;
  if (yrs < years * 0.9) return null;
  return cagr(start.nav, last.nav, yrs);
}

function shortName(name: string): string {
  return name.replace(/ - Direct Plan.*$/i, "").replace(/ - Growth$/i, "").replace(/Fund$/, "Fund");
}
