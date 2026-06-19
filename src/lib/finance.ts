import type { NavPoint } from "./mfapi";

const MS_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const MS_DAY = 86400000;

export function findNavOnOrBefore(data: NavPoint[], ts: number): NavPoint | null {
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
  if (!start || start.ts === last.ts) return null;
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

export function lumpsumProjection(amount: number, cagrRate: number, years: number, expenseRatio: number) {
  const net = cagrRate - expenseRatio / 100;
  const future = amount * Math.pow(1 + net, years);
  return { future, gain: future - amount, invested: amount };
}

export function sipProjection(monthly: number, cagrRate: number, years: number, expenseRatio: number) {
  const net = cagrRate - expenseRatio / 100;
  const r = Math.pow(1 + net, 1 / 12) - 1;
  const n = Math.round(years * 12);
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

// Maximum drawdown over the whole series. Returns peak/trough info.
export function maxDrawdown(data: NavPoint[]): {
  drawdown: number;
  peakDate: string;
  troughDate: string;
  recoveryDate: string | null;
  recoveryDays: number | null;
} | null {
  if (data.length < 2) return null;
  let peak = data[0].nav;
  let peakIdx = 0;
  let maxDd = 0;
  let ddPeakIdx = 0;
  let ddTroughIdx = 0;
  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    if (p.nav > peak) {
      peak = p.nav;
      peakIdx = i;
    }
    const dd = (p.nav - peak) / peak;
    if (dd < maxDd) {
      maxDd = dd;
      ddPeakIdx = peakIdx;
      ddTroughIdx = i;
    }
  }
  // Recovery: first point after trough that reaches the prior peak
  const peakNav = data[ddPeakIdx].nav;
  let recoveryIdx: number | null = null;
  for (let i = ddTroughIdx + 1; i < data.length; i++) {
    if (data[i].nav >= peakNav) {
      recoveryIdx = i;
      break;
    }
  }
  return {
    drawdown: maxDd,
    peakDate: data[ddPeakIdx].date,
    troughDate: data[ddTroughIdx].date,
    recoveryDate: recoveryIdx != null ? data[recoveryIdx].date : null,
    recoveryDays:
      recoveryIdx != null
        ? Math.round((data[recoveryIdx].ts - data[ddTroughIdx].ts) / MS_DAY)
        : null,
  };
}

// Annualised volatility based on daily log returns.
export function volatility(data: NavPoint[]): number | null {
  if (data.length < 30) return null;
  const rets: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const r = Math.log(data[i].nav / data[i - 1].nav);
    if (Number.isFinite(r)) rets.push(r);
  }
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const variance = rets.reduce((s, x) => s + (x - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

// Rolling CAGR series: for each NAV point sampled monthly, compute the
// trailing N-year CAGR ending at that point.
export function rollingCagrSeries(
  data: NavPoint[],
  years: number,
): { ts: number; date: string; cagr: number }[] {
  if (data.length < 2) return [];
  const out: { ts: number; date: string; cagr: number }[] = [];
  // Sample monthly to keep chart light
  const seen = new Set<string>();
  for (const p of data) {
    const d = new Date(p.ts);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const startTs = p.ts - years * MS_YEAR;
    const start = findNavOnOrBefore(data, startTs);
    if (!start || start.ts >= p.ts) continue;
    const yrs = (p.ts - start.ts) / MS_YEAR;
    if (yrs < years * 0.9) continue;
    out.push({ ts: p.ts, date: p.date, cagr: cagr(start.nav, p.nav, yrs) });
  }
  return out;
}

export function rollingStats(series: { cagr: number }[]): {
  count: number;
  min: number;
  max: number;
  avg: number;
  negativeShare: number;
} | null {
  if (!series.length) return null;
  const cs = series.map((s) => s.cagr);
  const sum = cs.reduce((a, b) => a + b, 0);
  const negatives = cs.filter((c) => c < 0).length;
  return {
    count: cs.length,
    min: Math.min(...cs),
    max: Math.max(...cs),
    avg: sum / cs.length,
    negativeShare: negatives / cs.length,
  };
}

// Monthly returns matrix [year][month 0..11] using first/last NAV in each month.
export function monthlyReturnsMatrix(data: NavPoint[]): {
  years: number[];
  matrix: Record<number, (number | null)[]>;
  yearTotals: Record<number, number | null>;
} {
  if (!data.length) return { years: [], matrix: {}, yearTotals: {} };
  type Bucket = { firstNav: number; lastNav: number; firstTs: number; lastTs: number };
  const buckets: Record<number, Record<number, Bucket>> = {};
  for (const p of data) {
    const d = new Date(p.ts);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    buckets[y] = buckets[y] ?? {};
    const b = buckets[y][m];
    if (!b) {
      buckets[y][m] = { firstNav: p.nav, lastNav: p.nav, firstTs: p.ts, lastTs: p.ts };
    } else {
      if (p.ts < b.firstTs) {
        b.firstTs = p.ts;
        b.firstNav = p.nav;
      }
      if (p.ts > b.lastTs) {
        b.lastTs = p.ts;
        b.lastNav = p.nav;
      }
    }
  }
  const years = Object.keys(buckets)
    .map((y) => +y)
    .sort((a, b) => a - b);
  const matrix: Record<number, (number | null)[]> = {};
  const yearTotals: Record<number, number | null> = {};
  for (const y of years) {
    const row: (number | null)[] = Array(12).fill(null);
    let yearStart: number | null = null;
    let yearEnd: number | null = null;
    let yearStartTs = Infinity;
    let yearEndTs = -Infinity;
    for (let m = 0; m < 12; m++) {
      const b = buckets[y][m];
      if (!b) continue;
      row[m] = (b.lastNav - b.firstNav) / b.firstNav;
      if (b.firstTs < yearStartTs) {
        yearStartTs = b.firstTs;
        yearStart = b.firstNav;
      }
      if (b.lastTs > yearEndTs) {
        yearEndTs = b.lastTs;
        yearEnd = b.lastNav;
      }
    }
    matrix[y] = row;
    yearTotals[y] = yearStart != null && yearEnd != null ? (yearEnd - yearStart) / yearStart : null;
  }
  return { years, matrix, yearTotals };
}

// Best & worst fixed-window periods (e.g. 30-day, 90-day, 365-day).
export function bestWorstPeriods(
  data: NavPoint[],
  windowDays: number,
): {
  best: { startDate: string; endDate: string; pct: number } | null;
  worst: { startDate: string; endDate: string; pct: number } | null;
} {
  if (data.length < 2) return { best: null, worst: null };
  let best: { startDate: string; endDate: string; pct: number } | null = null;
  let worst: { startDate: string; endDate: string; pct: number } | null = null;
  // Sample weekly starting points
  const stepMs = 7 * MS_DAY;
  let cursor = data[0].ts;
  const lastTs = data[data.length - 1].ts;
  while (cursor + windowDays * MS_DAY <= lastTs) {
    const a = findNavOnOrBefore(data, cursor);
    const b = findNavOnOrBefore(data, cursor + windowDays * MS_DAY);
    if (a && b && a.ts !== b.ts) {
      const pct = (b.nav - a.nav) / a.nav;
      if (!best || pct > best.pct) best = { startDate: a.date, endDate: b.date, pct };
      if (!worst || pct < worst.pct) worst = { startDate: a.date, endDate: b.date, pct };
    }
    cursor += stepMs;
  }
  return { best, worst };
}
