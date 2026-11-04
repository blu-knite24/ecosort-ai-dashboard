import { createFileRoute } from "@tanstack/react-router";
import { AlertOctagon, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { pageHead } from "@/lib/ecosort/head";
import { useEco } from "@/lib/ecosort/store";
import { binLevel, CATEGORIES, CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/ecosort/types";
import { DataSourceTag, Empty, PageHeader, Pill } from "@/components/eco/ui";

export const Route = createFileRoute("/bins")({
  head: pageHead("Bin Management", "Fill level, collected weight and capacity alerts for each waste bin."),
  component: Bins,
});

function Bins() {
  const bins = useEco((s) => s.bins);
  const alerts = bins.filter((b) => binLevel(b.fillPercent) !== "ok");
  return (
    <>
      <PageHeader title="Bin Management" subtitle="Warning at 80% · critical at 95%" action={<DataSourceTag />} />
      {alerts.map((b) => {
        const crit = binLevel(b.fillPercent) === "critical";
        return (
          <div key={b.category} className={`mb-3 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${crit ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-warning/40 bg-warning/10 text-warning"}`}>
            {crit ? <AlertOctagon className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span><b>{CATEGORY_LABEL[b.category]} bin {crit ? "critical" : "nearly full"}</b> — {b.fillPercent.toFixed(0)}% capacity. {crit ? "Empty immediately to avoid overflow." : "Schedule collection soon."}</span>
          </div>
        );
      })}
      {!bins.length ? <Empty>No bin level data received from the device.</Empty> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((c) => {
            const b = bins.find((x) => x.category === c);
            if (!b) return <div key={c} className="glass p-4"><Empty>{CATEGORY_LABEL[c]}: no data</Empty></div>;
            const lvl = binLevel(b.fillPercent);
            const fill = lvl === "critical" ? "var(--destructive)" : lvl === "warning" ? "var(--warning)" : CATEGORY_COLOR[c];
            return (
              <div key={c} className="glass p-4">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 font-medium"><Trash2 className="h-4 w-4" style={{ color: CATEGORY_COLOR[c] }} />{CATEGORY_LABEL[c]} Bin</p>
                  <Pill tone={lvl === "critical" ? "danger" : lvl === "warning" ? "warning" : "success"}>{lvl === "critical" ? "Critical" : lvl === "warning" ? "Warning" : "Normal"}</Pill>
                </div>
                <div className="mx-auto my-5 flex h-44 w-28 items-end overflow-hidden rounded-b-2xl rounded-t-md border-2 bg-muted/30">
                  <div className="w-full transition-[height] duration-700" style={{ height: `${b.fillPercent}%`, background: `color-mix(in oklab, ${fill} 70%, transparent)` }} />
                </div>
                <p className="text-center text-3xl font-semibold tabular-nums">{b.fillPercent.toFixed(0)}%</p>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border bg-secondary/30 px-2.5 py-1.5"><dt className="text-[10px] uppercase text-muted-foreground">Collected</dt><dd className="tabular-nums">{b.weightKg.toFixed(2)} kg</dd></div>
                  <div className="rounded-md border bg-secondary/30 px-2.5 py-1.5"><dt className="text-[10px] uppercase text-muted-foreground">Capacity</dt><dd className="tabular-nums">{b.capacityKg} kg</dd></div>
                </dl>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {lvl === "ok" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <AlertTriangle className="h-3.5 w-3.5" style={{ color: fill }} />}
                  {lvl === "ok" ? "Capacity available" : lvl === "warning" ? "Full-bin warning" : "Bin full — empty now"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
