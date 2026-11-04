import { createFileRoute } from "@tanstack/react-router";
import { Activity, Camera, Cog, Droplets, Magnet, Radar, ScanLine, Scale, Target, Workflow } from "lucide-react";
import { pageHead } from "@/lib/ecosort/head";
import { useEco } from "@/lib/ecosort/store";
import { CATEGORY_COLOR } from "@/lib/ecosort/types";
import { CategoryBadge, DataSourceTag, Empty, PageHeader, Panel, Pill } from "@/components/eco/ui";
import { ActivityFeed } from "@/components/eco/widgets";
import { MachineControls } from "@/components/eco/MachineControls";

export const Route = createFileRoute("/live")({
  head: pageHead("Live Monitoring", "Real-time object detection, AI classification and sensor readings."),
  component: Live,
});

function Reading({ icon: I, label, value, tone }: { icon: any; label: string; value: React.ReactNode; tone?: "success" | "warning" | "danger" | "muted" | "info" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-secondary/30 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-muted-foreground"><I className="h-4 w-4 text-primary" />{label}</span>
      {tone ? <Pill tone={tone}>{value}</Pill> : <span className="text-sm font-medium tabular-nums">{value}</span>}
    </div>
  );
}

const na = "No data";

function Live() {
  const latest = useEco((s) => s.latest);
  const t = useEco((s) => s.telemetry);
  const history = useEco((s) => s.history);
  const machine = useEco((s) => s.machine);

  return (
    <>
      <PageHeader title="Live Monitoring" subtitle="Real-time stream from the segregation line" action={<DataSourceTag />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Latest Detected Object" icon={ScanLine} className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative grid aspect-video place-items-center overflow-hidden rounded-lg border bg-muted/40">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              {latest && <div className="absolute inset-[18%] rounded-md border-2" style={{ borderColor: CATEGORY_COLOR[latest.category] }} />}
              <div className="relative text-center text-xs text-muted-foreground">
                <Camera className="mx-auto mb-2 h-6 w-6" />
                Camera preview<br />stream not attached
              </div>
              <span className="absolute left-2 top-2"><Pill tone={machine === "running" ? "danger" : "muted"}>{machine === "running" ? "REC" : "IDLE"}</Pill></span>
            </div>
            {latest ? (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Object</p>
                  <p className="text-lg font-semibold capitalize">{latest.object}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(latest.ts).toLocaleString()} {latest.simulated && "· simulated"}</p>
                </div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Predicted category</span><CategoryBadge c={latest.category} /></div>
                <div>
                  <div className="mb-1 flex justify-between text-sm"><span className="text-muted-foreground">AI confidence</span><span className="font-semibold tabular-nums">{(latest.confidence * 100).toFixed(1)}%</span></div>
                  <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${latest.confidence * 100}%` }} /></div>
                </div>
                <Reading icon={Scale} label="Weight" value={`${latest.weightGrams} g`} />
                <Reading icon={Target} label="Sorting result" value={latest.sortResult} tone={latest.sortResult === "sorted" ? "success" : "danger"} />
              </div>
            ) : <Empty>Waiting for first classification event…</Empty>}
          </div>
        </Panel>

        <Panel title="Sensor Readings" icon={Radar}>
          {t ? (
            <div className="space-y-2">
              <Reading icon={Magnet} label="Metal sensor" value={t.metalDetected == null ? na : t.metalDetected ? "Metal detected" : "Clear"} tone={t.metalDetected ? "warning" : "muted"} />
              <Reading icon={Droplets} label="Moisture" value={t.moisturePercent == null ? na : `${t.moisturePercent}%`} />
              <Reading icon={ScanLine} label="Object detection" value={t.objectDetected == null ? na : t.objectDetected ? "Object present" : "No object"} tone={t.objectDetected ? "info" : "muted"} />
              <Reading icon={Workflow} label="Conveyor" value={t.conveyorState ?? na} tone={t.conveyorState === "running" ? "success" : t.conveyorState ? "warning" : "muted"} />
              <Reading icon={Cog} label="Sorting mechanism" value={t.sorterState ?? na} tone={t.sorterState === "actuating" ? "info" : "muted"} />
              <p className="pt-1 text-[11px] text-muted-foreground">Updated {new Date(t.ts).toLocaleTimeString()}</p>
            </div>
          ) : <Empty>No telemetry received from device.</Empty>}
        </Panel>

        <Panel title="Activity Feed" icon={Activity} className="lg:col-span-2">
          <ActivityFeed items={history} limit={12} />
        </Panel>
        <MachineControls />
      </div>
    </>
  );
}
