import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, Boxes, CalendarDays, LineChart, PieChart, Scale } from "lucide-react";
import { pageHead } from "@/lib/ecosort/head";
import { useEco } from "@/lib/ecosort/store";
import { daily, inRange, monthly, totals, weekly } from "@/lib/ecosort/analytics";
import { CATEGORIES, CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/ecosort/types";
import { Btn, DataSourceTag, PageHeader, Panel, Stat, inputCls } from "@/components/eco/ui";
import { Doughnut, SimpleBars, StackedBars, TrendLines } from "@/components/eco/charts";

export const Route = createFileRoute("/analytics")({
  head: pageHead("Waste Analytics", "Category distribution, daily, weekly and monthly waste collection trends."),
  component: Analytics,
});

const iso = (t: number) => new Date(t - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const PRESETS = [["7D", 7], ["30D", 30], ["90D", 90]] as const;

function Analytics() {
  const history = useEco((s) => s.history);
  const [from, setFrom] = useState(() => iso(Date.now() - 29 * 86_400_000));
  const [to, setTo] = useState(() => iso(Date.now()));
  const [gran, setGran] = useState<"daily" | "weekly" | "monthly">("daily");

  const f = new Date(from + "T00:00:00").getTime();
  const tt = new Date(to + "T23:59:59").getTime();
  const list = useMemo(() => inRange(history, f, tt), [history, f, tt]);
  const t = useMemo(() => totals(list), [list]);
  const series = useMemo(() => (gran === "daily" ? daily : gran === "weekly" ? weekly : monthly)(list, f, tt), [list, gran, f, tt]);
  const trend = series.map((r) => ({ label: r.label, recyclable: +(r.plastic + r.paper + r.metal).toFixed(2), biodegradable: r.biodegradable }));
  const byWeight = CATEGORIES.map((c) => ({ label: CATEGORY_LABEL[c], kg: +t.kg[c].toFixed(2) }));
  const recyclePct = t.totalKg ? ((t.kg.plastic + t.kg.paper + t.kg.metal) / t.totalKg) * 100 : 0;

  return (
    <>
      <PageHeader title="Waste Analytics" subtitle="Historical collection reports" action={<DataSourceTag />} />

      <div className="glass mb-4 flex flex-wrap items-end gap-3 p-3">
        <label className="text-xs text-muted-foreground">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputCls + " mt-1"} /></label>
        <label className="text-xs text-muted-foreground">To<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={inputCls + " mt-1"} /></label>
        <div className="flex gap-1">
          {PRESETS.map(([l, d]) => (
            <Btn key={l} variant="ghost" onClick={() => { setFrom(iso(Date.now() - (d - 1) * 86_400_000)); setTo(iso(Date.now())); }}>{l}</Btn>
          ))}
        </div>
        <div className="ml-auto flex rounded-lg border p-0.5">
          {(["daily", "weekly", "monthly"] as const).map((g) => (
            <button key={g} onClick={() => setGran(g)} className={`rounded-md px-3 py-1.5 text-xs capitalize ${gran === g ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{g}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Weight in range" value={t.totalKg.toFixed(2)} unit="kg" icon={Scale} />
        <Stat label="Objects processed" value={t.totalCount.toLocaleString()} icon={Boxes} tone="highlight" />
        <Stat label="Recyclable share" value={recyclePct.toFixed(1)} unit="%" icon={PieChart} tone="plastic" />
        <Stat label="Avg per day" value={(t.totalKg / Math.max(1, Math.round((tt - f) / 86_400_000))).toFixed(2)} unit="kg" icon={CalendarDays} tone="accent" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Category Distribution (kg)" icon={PieChart}><Doughnut data={t.kg} /></Panel>
        <Panel title={`${gran[0].toUpperCase() + gran.slice(1)} Collection by Category (kg)`} icon={BarChart3} className="lg:col-span-2"><StackedBars data={series} /></Panel>
        <Panel title="Total Weight by Category" icon={Scale}>
          <div className="space-y-3">
            {byWeight.map((r, i) => (
              <div key={r.label}>
                <div className="mb-1 flex justify-between text-xs"><span>{r.label}</span><span className="tabular-nums text-muted-foreground">{r.kg} kg</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${t.totalKg ? (r.kg / t.totalKg) * 100 : 0}%`, background: CATEGORY_COLOR[CATEGORIES[i]] }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-5"><Doughnut data={t.count} unit="objects" /></div>
        </Panel>
        <Panel title="Objects Processed" icon={Boxes}><SimpleBars data={series} dataKey="count" name="Objects" color="var(--highlight)" /></Panel>
        <Panel title="Recycling vs Biodegradable Trend (kg)" icon={LineChart}><TrendLines data={trend} /></Panel>
      </div>
    </>
  );
}
