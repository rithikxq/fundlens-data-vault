import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronDown, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { SchemeSearch } from "@/components/scheme-search";

const FEATURED = [
  { code: 122639, name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth" },
  { code: 120828, name: "Quant Small Cap Fund - Direct Plan - Growth" },
  { code: 119552, name: "HDFC Liquid Fund - Direct Plan - Growth" },
  { code: 118989, name: "Nippon India Index Fund Nifty 50 Plan - Direct Growth" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FundLens — Analyse any Indian mutual fund" },
      {
        name: "description",
        content:
          "Live NAV history, rolling CAGRs, expense-ratio-aware SIP & lumpsum calculator, and side-by-side fund comparison — all from public AMFI data.",
      },
      { property: "og:title", content: "FundLens — Analyse any Indian mutual fund" },
      {
        property: "og:description",
        content:
          "NAV history, rolling CAGRs, SIP & lumpsum calculator, fund comparison — from public AMFI data.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [howOpen, setHowOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pt-16 pb-12">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <TrendingUp className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Analyse any Indian mutual fund
          </h1>
          <p className="mt-4 max-w-xl text-balance text-muted-foreground">
            Live NAV history, rolling CAGRs, expense-ratio-aware SIP & lumpsum calculator,
            and side-by-side fund comparison — all from public AMFI data.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <SchemeSearch />
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <div className="mb-3 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Try one of these
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FEATURED.map((f) => (
              <Link
                key={f.code}
                to="/fund/$code"
                params={{ code: String(f.code) }}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <span className="line-clamp-1 font-medium">{f.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">#{f.code}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <button
            type="button"
            onClick={() => setHowOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left text-sm font-medium shadow-sm"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              How to use FundLens
            </span>
            <ChevronDown
              className={`h-4 w-4 transition ${howOpen ? "rotate-180" : ""}`}
            />
          </button>
          {howOpen && (
            <div className="mt-2 space-y-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">1. Search a fund</strong> — type at
                least 2 characters to filter the full AMFI scheme list.
              </p>
              <p>
                <strong className="text-foreground">2. Read the analysis</strong> — NAV
                chart, 1Y / 3Y / 5Y / since-inception CAGRs, and a returns table.
              </p>
              <p>
                <strong className="text-foreground">3. Run the calculator</strong> —
                project SIP or lumpsum returns using the fund's historical CAGR, net of
                your expense ratio.
              </p>
              <p>
                <strong className="text-foreground">4. Compare</strong> — open the Compare
                tab and stack two funds side-by-side.
              </p>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
