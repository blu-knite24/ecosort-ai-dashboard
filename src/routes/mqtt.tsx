import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Network, Radio, ShieldCheck } from "lucide-react";
import { pageHead } from "@/lib/ecosort/head";
import { useEco } from "@/lib/ecosort/store";
import { PageHeader, Panel, Pill } from "@/components/eco/ui";
import { LastSeen } from "@/components/eco/widgets";

export const Route = createFileRoute("/mqtt")({
  head: pageHead("MQTT Configuration", "MQTT broker connection, topic structure and message formats."),
  component: Mqtt,
});

const TOPICS = [
  ["ecosort/device01/telemetry", "Device → Backend", "Sensor readings, counts and conveyor state"],
  ["ecosort/device01/classification", "AI computer → Backend", "Each classified object (with eventId)"],
  ["ecosort/device01/bins", "Device → Backend", "Bin fill levels and weights"],
  ["ecosort/device01/status", "Device → Backend", "Heartbeat and machine state (retained)"],
  ["ecosort/device01/command", "Backend → Device", "start / pause / resume / stop"],
  ["ecosort/device01/ack", "Device → Backend", "Command acknowledgement"],
];

const EX = {
  classification: { eventId: "c-8f2a1", object: "tin food container", category: "metal", confidence: 0.96, weightGrams: 42 },
  telemetry: { eventId: "t-1029", totalWeightKg: 12.45, counts: { plastic: 12, paper: 8, metal: 4, organic: 10 }, moisturePercent: 63, metalDetected: true, objectDetected: true, conveyorState: "running" },
  command: { commandId: "cmd-7c1e", command: "pause", issuedAt: "2026-11-04T09:30:00Z" },
  ack: { commandId: "cmd-7c1e", success: true, machineState: "paused", message: "Conveyor paused" },
};

function Mqtt() {
  const conn = useEco((s) => s.connection);
  const s = useEco((s) => s.settings);
  return (
    <>
      <PageHeader title="MQTT Configuration" subtitle="Broker credentials stay on the backend — never in the browser" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Connection" icon={Radio}>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Data source</dt><dd>{s.mode!=="live" ? <Pill tone="warning">{s.mode==="mqtt_demo"?"MQTT simulation":"Demo simulation"}</Pill> : <Pill tone="info">Live backend</Pill>}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Backend URL</dt><dd className="truncate font-mono text-xs">{s.mode === "demo" ? "— (in-browser)" : s.backendUrl}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Socket.IO</dt><dd><Pill tone={conn.backend ? "success" : "danger"}>{conn.backend ? "Connected" : "Disconnected"}</Pill></dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">MQTT broker</dt><dd><Pill tone={conn.mqtt ? "success" : "danger"}>{conn.mqtt ? "Connected" : "Disconnected"}</Pill></dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Device heartbeat</dt><dd><Pill tone={conn.esp32 ? "success" : "danger"}>{conn.esp32 ? "Alive" : "Offline"}</Pill></dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Last message</dt><dd className="text-xs"><LastSeen ts={conn.lastDeviceMessage} /></dd></div>
            {conn.error && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{conn.error}</p>}
          </dl>
        </Panel>
        <Panel title="Data Flow" icon={Network} className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {["ESP32 + AI computer", "Mosquitto broker", "Node.js backend", "Socket.IO", "Dashboard"].map((n, i, a) => (
              <span key={n} className="flex items-center gap-2"><span className="rounded-md border bg-secondary/40 px-2.5 py-1.5">{n}</span>{i < a.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-primary" />}</span>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />MQTT username/password live in the backend .env only. The browser authenticates to the backend with an operator API token; commands are validated, logged, published at QoS 1 and only marked successful after the device ACK arrives.</p>
          <p className="mt-2 text-xs text-muted-foreground">QoS 1 for classification, command and ack · retained status · eventId deduplication · heartbeat timeout configurable.</p>
        </Panel>
        <Panel title="Topics" icon={Radio} className="lg:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2 font-medium">Topic</th><th className="pb-2 font-medium">Direction</th><th className="pb-2 font-medium">Purpose</th></tr></thead>
              <tbody className="divide-y divide-border">{TOPICS.map(([t, d, p]) => <tr key={t}><td className="py-2 font-mono text-xs text-primary">{t}</td><td className="py-2 text-xs">{d}</td><td className="py-2 text-xs text-muted-foreground">{p}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
        {Object.entries(EX).map(([k, v]) => (
          <Panel key={k} title={`${k} payload`} className="capitalize">
            <pre className="overflow-x-auto rounded-lg border bg-background/60 p-3 font-mono text-[11px] normal-case leading-relaxed text-muted-foreground">{JSON.stringify(v, null, 2)}</pre>
          </Panel>
        ))}
      </div>
    </>
  );
}
