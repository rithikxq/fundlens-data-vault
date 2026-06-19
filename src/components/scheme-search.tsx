import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { fetchSchemeList, type SchemeListItem } from "@/lib/mfapi";
import { Input } from "@/components/ui/input";

export function schemeListQuery() {
  return {
    queryKey: ["scheme-list"],
    queryFn: fetchSchemeList,
    staleTime: 1000 * 60 * 60,
  };
}

type Props = {
  onPick?: (item: SchemeListItem) => void;
  placeholder?: string;
  autoNavigate?: boolean;
};

export function SchemeSearch({ onPick, placeholder, autoNavigate = true }: Props) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(schemeListQuery());
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    if (!data || q.trim().length < 2) return [];
    const needle = q.toLowerCase();
    const out: SchemeListItem[] = [];
    for (const s of data) {
      if (s.schemeName.toLowerCase().includes(needle)) {
        out.push(s);
        if (out.length >= 30) break;
      }
    }
    return out;
  }, [data, q]);

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder ?? (isLoading ? "Loading scheme list…" : "Search any mutual fund…")}
          className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          disabled={isLoading}
        />
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {focused && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-96 overflow-y-auto rounded-xl border bg-popover shadow-lg">
          {results.map((s) => (
            <button
              key={s.schemeCode}
              type="button"
              onClick={() => {
                if (onPick) onPick(s);
                if (autoNavigate)
                  navigate({ to: "/fund/$code", params: { code: String(s.schemeCode) } });
              }}
              className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-accent"
            >
              <span className="line-clamp-1">{s.schemeName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">#{s.schemeCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
