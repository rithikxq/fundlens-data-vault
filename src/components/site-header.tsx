import { Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight">FundLens</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground"
          >
            Search
          </Link>
          <Link
            to="/compare"
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground"
          >
            Compare
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t py-6 text-center text-xs text-muted-foreground">
      Data from{" "}
      <a className="underline" href="https://mfapi.in" target="_blank" rel="noreferrer">
        MFAPI.in
      </a>{" "}
      · For analytical purposes only · Not investment advice
    </footer>
  );
}
