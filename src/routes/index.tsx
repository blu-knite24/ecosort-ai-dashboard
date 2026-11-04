import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Activity, Boxes, Clock, Cpu, Gauge, Leaf, Newspaper, PieChart, Radio, Recycle, Scale, Trash2, Wrench } from "lucide-react";
import { pageHead } from "@/lib/ecosort/head";
import { useEco } from "@/lib/ecosort/store";
import { daily, totals } from "@/lib/ecosort/analytics";
import { DataSourceTag, Empty, PageHeader, Panel, Pill, Stat } from "@/components/eco/ui";
import { Doughnut, StackedBars } from "@/components/eco/charts";
import { ActivityFeed, BinBar, LastSeen } from "@/components/eco/widgets";
import { MachineControls } from "@/components/eco/MachineControls";

export const Route = createFileRoute("/")({
  head: pageHead("Overview", "Waste processed, category totals, machine and device status for EcoSort AI."),
  component: Overview,
});

function Overview() {
  const history = useEco((s) => s.history);
  const bins = useEco((s) => s.bins);
  const devices = useEco((s) => s.devices);
  const conn = useEco((s) => s.connection);
  const machine = useEco((s) => s.machine);
  const t = useMemo(() => totals(history), [history]);
  const week = useMemo(() => daily(history, Date.now() - 13 * 86_400_000, Date.now()), [history]);
  const online = devices.filter((d) => d.online).length;

  return (
    <>
      <PageHeader title="Overview" subtitle="Machine performance and waste segregation summary" action={<DataSourceTag />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total processed" value={t.totalKg.toFixed(2)} unit="kg" icon={Scale} />
        <Stat label="Objects classified" value={t.totalCount.toLocaleString()} icon={Boxes} tone="highlight" />
        <Stat label="Plastic" value={t.kg.plastic.toFixed(2)} unit="kg" icon={Recycle} tone="plastic" />
        <Stat label="Paper" value={t.kg.paper.toFixed(2)} unit="kg" icon={Newspaper} tone="paper" />
        <Stat label="Metal" value={t.kg.metal.toFixed(2)} unit="kg" icon={Wrench} tone="metal" />
        <Stat label="Biodegradable" value={t.kg.biodegradable.toFixed(2)} unit="kg" icon={Leaf} tone="biodegradable" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Machine status" value={<span className="capitalize">{machine}</span>} icon={Gauge} tone="accent" />
        <Stat label="MQTT broker" value={conn.mqtt ? "Connected" : "Disconnected"} icon={Radio} tone={conn.mqtt ? "accent" : "highlight"} />
        <Stat label="ESP32 controller" value={conn.esp32 ? "Online" : "Offline"} icon={Cpu} tone={conn.esp32 ? "accent" : "highlight"} />
        <Stat label="Last communication" value={<span className="text-sm"><LastSeen ts={conn.lastDeviceMessage} /></span>} icon={Clock} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Category Distribution" icon={PieChart}>
          {t.totalCount ? <Doughnut data={t.kg} /> : <Empty>No data yet.</Empty>}
        </Panel>
        <Panel title="Daily Waste Collection (14 days, kg)" icon={Activity} className="lg:col-span-2">
          <StackedBars data={week} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Recent Activity" icon={Activity} action={<Link to="/history" className="text-xs text-primary hover:underline">View all</Link>}>
          <ActivityFeed items={history} limit={7} />
        </Panel>
        <div className="space-y-4">
          <Panel title="Bin Capacity" icon={Trash2} action={<Link to="/bins" className="text-xs text-primary hover:underline">Manage</Link>}>
            {bins.length ? <div className="space-y-3.5">{bins.map((b) => <BinBar key={b.category} b={b} />)}</div> : <Empty>No bin data received.</Empty>}
          </Panel>
          <Panel title="Device Health" icon={Cpu} action={<span className="text-xs text-muted-foreground">{online}/{devices.length} online</span>}>
            {devices.length ? (
              <ul className="space-y-2 text-sm">
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">{d.name}</span>
                    <Pill tone={d.online ? "success" : "danger"}>{d.online ? "Online" : "Offline"}</Pill>
                  </li>
                ))}
              </ul>
            ) : <Empty>No devices reporting.</Empty>}
          </Panel>
        </div>
        <MachineControls />
      </div>
    </>
  );
}
