export type SchemeListItem = { schemeCode: number; schemeName: string };

export type NavPoint = { date: string; nav: number; ts: number };

export type SchemeMeta = {
  fund_house: string;
  scheme_type: string;
  scheme_category: string;
  scheme_code: number;
  scheme_name: string;
  scheme_start_date?: { date: string; nav: string };
};

export type SchemeDetail = {
  meta: SchemeMeta;
  data: NavPoint[];
  latest: NavPoint | null;
};

const BASE = "https://api.mfapi.in/mf";

// Parse "dd-mm-yyyy" to timestamp
function parseDate(d: string): number {
  const [dd, mm, yyyy] = d.split("-");
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`).getTime();
}

export async function fetchSchemeList(): Promise<SchemeListItem[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Failed to load scheme list");
  return res.json();
}

export async function fetchScheme(code: string | number): Promise<SchemeDetail> {
  const res = await fetch(`${BASE}/${code}`);
  if (!res.ok) throw new Error("Failed to load scheme");
  const json = await res.json();
  const data: NavPoint[] = (json.data ?? [])
    .map((d: { date: string; nav: string }) => ({
      date: d.date,
      nav: parseFloat(d.nav),
      ts: parseDate(d.date),
    }))
    .filter((p: NavPoint) => !Number.isNaN(p.nav) && !Number.isNaN(p.ts))
    .sort((a: NavPoint, b: NavPoint) => a.ts - b.ts);
  return {
    meta: json.meta,
    data,
    latest: data.length ? data[data.length - 1] : null,
  };
}
