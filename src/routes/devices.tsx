import { createFileRoute } from "@tanstack/react-router";
import { Camera, Cog, Cpu, Droplets, Magnet, ScanLine, Workflow } from "lucide-react";
import { pageHead } from "@/lib/ecosort/head";
import { useEco } from "@/lib/ecosort/store";
import { DataSourceTag, Empty, PageHeader, Pill } from "@/components/eco/ui";
import { LastSeen } from "@/components/eco/widgets";

export const Route = createFileRoute("/devices")({
  head: pageHead("Device Management", "Connection status and telemetry for ESP32, camera, sensors and actuators."),
  component: Devices,
});

const ICONS: Record<string, any> = { esp32: Cpu, camera: Camera, metal: Magnet, moisture: Droplets, ir: ScanLine, conveyor: Workflow, servo: Cog };
const EXPECTED = [
  ["esp32", "ESP32 Controller"], ["camera", "Camera & AI Processor"], ["metal", "Metal Detection Sensor"], ["moisture", "Moisture Sensor"],
  ["ir", "IR Object Detection"], ["conveyor", "Conveyor Motor"], ["servo", "Servo Sorting Mechanism"],
];

function Devices() {
  const devices = useEco((s) => s.devices);
  const list = EXPECTED.map(([id, name]) => devices.find((d) => d.id === id) ?? { id, name, kind: "unknown", online: false, lastSeen: null, telemetry: {} });
  return (
    <>
      <PageHeader title="Device Management" subtitle={`${list.filter((d) => d.online).length} of ${list.length} devices online`} action={<DataSourceTag />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((d) => {
          const I = ICONS[d.id] ?? Cpu;
          const entries = Object.entries(d.telemetry);
          return (
            <div key={d.id} className="glass p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg border bg-primary/10 text-primary"><I className="h-5 w-5" /></div>
                  <div><p className="font-medium">{d.name}</p><p className="font-mono text-[11px] text-muted-foreground">{d.id}</p></div>
                </div>
                <Pill tone={d.online ? "success" : "danger"}>{d.online ? "Online" : "Offline"}</Pill>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Last communication: <LastSeen ts={d.lastSeen} /></p>
              <div className="mt-3">
                {entries.length ? (
                  <dl className="grid grid-cols-2 gap-2">
                    {entries.map(([k, v]) => (
                      <div key={k} className="rounded-md border bg-secondary/30 px-2.5 py-1.5">
                        <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
                        <dd className="truncate text-sm tabular-nums">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : <Empty>No telemetry reported.</Empty>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
