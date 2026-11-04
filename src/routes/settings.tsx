import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FlaskConical, Plug, Save, Settings as Cog } from "lucide-react";
import { pageHead } from "@/lib/ecosort/head";
import { saveSettings, useEco, type Settings } from "@/lib/ecosort/store";
import { Btn, PageHeader, Panel, inputCls } from "@/components/eco/ui";

export const Route = createFileRoute("/settings")({
  head: pageHead("Settings", "Choose demo simulation or live hardware mode and configure the backend connection."),
  component: SettingsPage,
});

function SettingsPage() {
  const current = useEco((s) => s.settings);
  const [f, setF] = useState<Settings>(current);
  const [saved, setSaved] = useState(false);
  useEffect(() => setF(current), [current]);
  const up = (p: Partial<Settings>) => { setF({ ...f, ...p }); setSaved(false); };

  return (
    <>
      <PageHeader title="Settings" subtitle="Data source and backend connection" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Data Source" icon={FlaskConical}>
          <div className="grid gap-3 sm:grid-cols-2">
            {([["demo", "Demo simulation", "In-browser simulated device. All data labelled as simulated."], ["live", "Live hardware", "Connects to the EcoSort Node.js backend over Socket.IO. Shows only real device data."]] as const).map(([m, t, d]) => (
              <button key={m} onClick={() => up({ mode: m })} className={`rounded-lg border p-3 text-left transition-colors ${f.mode === m ? "border-primary/50 bg-primary/10" : "hover:bg-secondary/40"}`}>
                <p className="text-sm font-medium">{t}</p><p className="mt-1 text-xs text-muted-foreground">{d}</p>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Backend Connection" icon={Plug}>
          <div className="space-y-3">
            <label className="block text-xs text-muted-foreground">Backend URL<input className={inputCls + " mt-1 font-mono"} value={f.backendUrl} onChange={(e) => up({ backendUrl: e.target.value.trim() })} placeholder="https://ecosort-api.example.com" /></label>
            <label className="block text-xs text-muted-foreground">Operator API token<input type="password" className={inputCls + " mt-1 font-mono"} value={f.apiToken} onChange={(e) => up({ apiToken: e.target.value })} placeholder="Matches API_TOKEN in backend .env" /></label>
            <p className="text-[11px] text-muted-foreground">This token authorises dashboard requests to your backend. MQTT broker credentials are never entered here.</p>
          </div>
        </Panel>
        <Panel title="Timeouts" icon={Cog}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">Device heartbeat timeout (s)<input type="number" min={5} max={300} className={inputCls + " mt-1"} value={f.heartbeatTimeoutSec} onChange={(e) => up({ heartbeatTimeoutSec: Math.max(5, +e.target.value || 15) })} /></label>
            <label className="text-xs text-muted-foreground">Command ACK timeout (s)<input type="number" min={2} max={120} className={inputCls + " mt-1"} value={f.ackTimeoutSec} onChange={(e) => up({ ackTimeoutSec: Math.max(2, +e.target.value || 10) })} /></label>
          </div>
        </Panel>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-success">Saved — reconnected.</span>}
        <Btn variant="primary" onClick={() => { saveSettings(f); setSaved(true); }}><Save className="h-4 w-4" />Save settings</Btn>
      </div>
    </>
  );
}
