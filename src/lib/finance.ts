import type { NavPoint } from "./mfapi";

const MS_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export function findNavOnOrBefore(data: NavPoint[], ts: number): NavPoint | null {
  // data sorted asc by ts
  if (!data.length) return null;
  let lo = 0;
  let hi = data.length - 1;
  let res: NavPoint | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (data[mid].ts <= ts) {
      res = data[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return res;
}

export function cagr(startNav: number, endNav: number, years: number): number {
  if (startNav <= 0 || years <= 0) return 0;
  return Math.pow(endNav / startNav, 1 / years) - 1;
}

export function rollingReturns(
  data: NavPoint[],
  years: number,
): { absolute: number; cagr: number; startDate: string; endDate: string } | null {
  if (data.length < 2) return null;
  const last = data[data.length - 1];
  const targetTs = last.ts - years * MS_YEAR;
  const start = findNavOnOrBefore(data, targetTs);
  if (!start) return null;
  const yearsActual = (last.ts - start.ts) / MS_YEAR;
  return {
    absolute: (last.nav - start.nav) / start.nav,
    cagr: cagr(start.nav, last.nav, yearsActual),
    startDate: start.date,
    endDate: last.date,
  };
}

export function sinceInception(
  data: NavPoint[],
): { absolute: number; cagr: number; years: number } | null {
  if (data.length < 2) return null;
  const start = data[0];
  const end = data[data.length - 1];
  const years = (end.ts - start.ts) / MS_YEAR;
  return {
    absolute: (end.nav - start.nav) / start.nav,
    cagr: cagr(start.nav, end.nav, years),
    years,
  };
}

// Lumpsum: invest at start, hold to end. Expense ratio reduces effective CAGR.
export function lumpsumProjection(
  amount: number,
  cagrRate: number,
  years: number,
  expenseRatio: number,
) {
  const net = cagrRate - expenseRatio / 100;
  const future = amount * Math.pow(1 + net, years);
  return { future, gain: future - amount, invested: amount };
}

// SIP: monthly contribution at start of month.
export function sipProjection(
  monthly: number,
  cagrRate: number,
  years: number,
  expenseRatio: number,
) {
  const net = cagrRate - expenseRatio / 100;
  const r = Math.pow(1 + net, 1 / 12) - 1;
  const n = Math.round(years * 12);
  // future value of annuity due
  const future = monthly * ((Math.pow(1 + r, n) - 1) / (r || 1e-9)) * (1 + r);
  const invested = monthly * n;
  return { future, gain: future - invested, invested };
}

export function formatINR(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPct(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}
