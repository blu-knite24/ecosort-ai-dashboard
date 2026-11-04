import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { pageHead } from "@/lib/ecosort/head";
import { useEco } from "@/lib/ecosort/store";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/ecosort/types";
import { Btn, CategoryBadge, DataSourceTag, Empty, PageHeader, Pill, inputCls } from "@/components/eco/ui";

export const Route = createFileRoute("/history")({
  head: pageHead("Classification History", "Searchable log of every classified and sorted waste object."),
  component: HistoryPage,
});

const PAGE = 25;

function HistoryPage() {
  const history = useEco((s) => s.history);
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const f = from ? new Date(from + "T00:00:00").getTime() : -Infinity;
    const t = to ? new Date(to + "T23:59:59").getTime() : Infinity;
    const qq = q.toLowerCase();
    return history.filter((r) => r.ts >= f && r.ts <= t && (!cats.length || cats.includes(r.category)) && (status === "all" || r.status === status) && (!qq || r.object.toLowerCase().includes(qq) || r.id.toLowerCase().includes(qq)));
  }, [history, q, cats, status, from, to]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages - 1);

  const exportCsv = () => {
    const head = "eventId,timestamp,object,category,confidence,weightGrams,sortResult,status,simulated";
    const body = rows.map((r) => [r.id, new Date(r.ts).toISOString(), `"${r.object}"`, r.category, r.confidence, r.weightGrams, r.sortResult, r.status, r.simulated].join(","));
    const url = URL.createObjectURL(new Blob([[head, ...body].join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "ecosort-history.csv" }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Classification History" subtitle={`${rows.length.toLocaleString()} records`} action={<div className="flex items-center gap-2"><DataSourceTag /><Btn onClick={exportCsv}><Download className="h-4 w-4" />CSV</Btn></div>} />
      <div className="glass mb-4 space-y-3 p-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search object or event ID…" className={inputCls + " pl-9"} />
          </div>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className={inputCls + " w-auto"} aria-label="From date" />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className={inputCls + " w-auto"} aria-label="To date" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={inputCls + " w-auto"} aria-label="Status">
            <option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="low_confidence">Low confidence</option><option value="error">Error</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const on = cats.includes(c);
            return <button key={c} onClick={() => { setCats(on ? cats.filter((x) => x !== c) : [...cats, c]); setPage(0); }} className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-primary/40 bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{CATEGORY_LABEL[c]}</button>;
          })}
          {(cats.length > 0 || q || from || to || status !== "all") && <button onClick={() => { setCats([]); setQ(""); setFrom(""); setTo(""); setStatus("all"); }} className="text-xs text-muted-foreground underline">Clear</button>}
        </div>
      </div>

      <div className="glass overflow-x-auto">
        {rows.length === 0 ? <div className="p-4"><Empty>No records match the filters.</Empty></div> : (
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>{["Timestamp", "Object", "Category", "Confidence", "Weight", "Sorting", "Status"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.slice(p * PAGE, p * PAGE + PAGE).map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted-foreground">{new Date(r.ts).toLocaleString()}</td>
                  <td className="px-4 py-2.5 capitalize">{r.object}{r.simulated && <span className="ml-2 text-[10px] text-warning">SIM</span>}</td>
                  <td className="px-4 py-2.5"><CategoryBadge c={r.category} /></td>
                  <td className="px-4 py-2.5 tabular-nums">{(r.confidence * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2.5 tabular-nums">{r.weightGrams} g</td>
                  <td className="px-4 py-2.5"><Pill tone={r.sortResult === "sorted" ? "success" : r.sortResult === "pending" ? "muted" : "danger"}>{r.sortResult}</Pill></td>
                  <td className="px-4 py-2.5"><Pill tone={r.status === "confirmed" ? "info" : r.status === "low_confidence" ? "warning" : "danger"} dot={false}>{r.status.replace("_", " ")}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
        Page {p + 1} of {pages}
        <Btn variant="ghost" disabled={p === 0} onClick={() => setPage(p - 1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Btn>
        <Btn variant="ghost" disabled={p >= pages - 1} onClick={() => setPage(p + 1)} aria-label="Next"><ChevronRight className="h-4 w-4" /></Btn>
      </div>
    </>
  );
}
