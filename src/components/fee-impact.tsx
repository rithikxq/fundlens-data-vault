import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatINR, formatPct, lumpsumProjection, sipProjection } from "@/lib/finance";

type Mode = "sip" | "lump";

export function FeeImpactCalculator({ defaultCagr }: { defaultCagr: number }) {
  const [mode, setMode] = useState<Mode>("sip");
  const [years, setYears] = useState(20);
  const [cagrPct, setCagrPct] = useState(+(defaultCagr * 100 || 12).toFixed(2));
  const [sip, setSip] = useState(10000);
  const [lump, setLump] = useState(100000);
  const [directExp, setDirectExp] = useState(0.5);
  const [regularExp, setRegularExp] = useState(1.5);

  const series = useMemo(() => {
    const points: { year: number; direct: number; regular: number; invested: number }[] = [];
    for (let y = 1; y <= years; y++) {
      if (mode === "sip") {
        const d = sipProjection(sip, cagrPct / 100, y, directExp);
        const r = sipProjection(sip, cagrPct / 100, y, regularExp);
        points.push({ year: y, direct: Math.round(d.future), regular: Math.round(r.future), invested: Math.round(d.invested) });
      } else {
        const d = lumpsumProjection(lump, cagrPct / 100, y, directExp);
        const r = lumpsumProjection(lump, cagrPct / 100, y, regularExp);
        points.push({ year: y, direct: Math.round(d.future), regular: Math.round(r.future), invested: lump });
      }
    }
    return points;
  }, [mode, years, cagrPct, sip, lump, directExp, regularExp]);

  const last = series[series.length - 1];
  const lost = last ? last.direct - last.regular : 0;

  return (
    <Card className="mt-6 p-4">
      <h2 className="text-sm font-semibold">Direct vs Regular — fee impact</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Both plans target the same gross CAGR. Direct plans skip distributor commissions, so the
        expense-ratio gap compounds into a real wealth gap.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <div>
          <Label className="text-xs">Gross CAGR %</Label>
          <Input type="number" step="0.1" value={cagrPct} onChange={(e) => setCagrPct(+e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Direct exp %</Label>
          <Input type="number" step="0.05" value={directExp} onChange={(e) => setDirectExp(+e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Regular exp %</Label>
          <Input type="number" step="0.05" value={regularExp} onChange={(e) => setRegularExp(+e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Duration: {years} years</Label>
          <input
            type="range"
            min={1}
            max={40}
            value={years}
            onChange={(e) => setYears(+e.target.value)}
            className="mt-2 w-full accent-[var(--color-primary)]"
          />
        </div>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-4">
        <TabsList>
          <TabsTrigger value="sip">SIP</TabsTrigger>
          <TabsTrigger value="lump">Lumpsum</TabsTrigger>
        </TabsList>
        <TabsContent value="sip" className="mt-3">
          <div className="max-w-xs">
            <Label className="text-xs">Monthly investment ₹</Label>
            <Input type="number" step="500" value={sip} onChange={(e) => setSip(+e.target.value)} />
          </div>
        </TabsContent>
        <TabsContent value="lump" className="mt-3">
          <div className="max-w-xs">
            <Label className="text-xs">One-time investment ₹</Label>
            <Input type="number" step="1000" value={lump} onChange={(e) => setLump(+e.target.value)} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="direct" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="regular" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" fontSize={11} stroke="var(--color-muted-foreground)" tickFormatter={(y) => `${y}y`} />
            <YAxis
              fontSize={11}
              stroke="var(--color-muted-foreground)"
              width={70}
              tickFormatter={(v: number) =>
                v >= 1e7 ? `${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : `${(v / 1000).toFixed(0)}k`
              }
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, n) => [formatINR(v), n === "direct" ? "Direct" : n === "regular" ? "Regular" : "Invested"]}
              labelFormatter={(y) => `Year ${y}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="invested" stroke="var(--color-muted-foreground)" strokeDasharray="4 3" fill="none" />
            <Area type="monotone" dataKey="direct" stroke="#34d399" strokeWidth={2} fill="url(#direct)" />
            <Area type="monotone" dataKey="regular" stroke="#f87171" strokeWidth={2} fill="url(#regular)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {last && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="Invested" value={formatINR(last.invested)} />
          <Mini label="Direct corpus" value={formatINR(last.direct)} accent="text-emerald-400" />
          <Mini label="Regular corpus" value={formatINR(last.regular)} accent="text-red-400" />
          <Mini
            label={`Lost to commissions (${years}y)`}
            value={formatINR(lost)}
            sub={`≈ ${formatPct(lost / (last.regular || 1))} of regular corpus`}
            accent="text-red-400"
          />
        </div>
      )}
    </Card>
  );
}

function Mini({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold ${accent ?? ""}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
