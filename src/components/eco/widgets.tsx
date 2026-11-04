import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { binLevel, CATEGORY_COLOR, CATEGORY_LABEL, type BinState, type Classification } from "@/lib/ecosort/types";
import { timeAgo } from "@/lib/ecosort/analytics";
import { CategoryBadge, Empty, Pill } from "./ui";

export function BinBar({ b }: { b: BinState }) {
  const lvl = binLevel(b.fillPercent);
  const color = lvl === "critical" ? "var(--destructive)" : lvl === "warning" ? "var(--warning)" : CATEGORY_COLOR[b.category];
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-foreground">{CATEGORY_LABEL[b.category]}</span>
        <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
          {lvl !== "ok" && <AlertTriangle className="h-3.5 w-3.5" style={{ color }} />}
          {b.fillPercent.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${b.fillPercent}%`, background: color }} />
      </div>
    </div>
  );
}

export function ActivityFeed({ items, limit = 8 }: { items: Classification[]; limit?: number }) {
  if (!items.length) return <Empty>No classification events received yet.</Empty>;
  return (
    <ul className="divide-y divide-border">
      {items.slice(0, limit).map((r) => (
        <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
          {r.sortResult === "sorted" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
          <div className="min-w-0 flex-1">
            <p className="truncate capitalize">{r.object}</p>
            <p className="text-[11px] text-muted-foreground">{new Date(r.ts).toLocaleTimeString()} · {r.weightGrams} g · {(r.confidence * 100).toFixed(1)}%</p>
          </div>
          <CategoryBadge c={r.category} />
          {r.simulated && <span className="hidden sm:inline"><Pill tone="warning" dot={false}>SIM</Pill></span>}
        </li>
      ))}
    </ul>
  );
}

export function LastSeen({ ts }: { ts: number | null }) {
  return <span className="tabular-nums">{ts ? `${new Date(ts).toLocaleTimeString()} (${timeAgo(ts)})` : "never"}</span>;
}
