import { useState } from "react";
import { CheckCircle2, Clock, Loader2, Pause, Play, Power, RotateCcw, XCircle, AlertTriangle } from "lucide-react";
import { sendCommand, useEco } from "@/lib/ecosort/store";
import type { CommandRecord } from "@/lib/ecosort/types";
import { Btn, Panel, Pill } from "./ui";

function CmdState({ c }: { c: CommandRecord }) {
  switch (c.state) {
    case "sending": return <Pill tone="muted">Sending…</Pill>;
    case "awaiting_ack": return <Pill tone="info">Sent · awaiting device ACK</Pill>;
    case "acknowledged": return <Pill tone="success">Acknowledged by device</Pill>;
    case "rejected": return <Pill tone="danger">Rejected by device</Pill>;
    case "timeout": return <Pill tone="warning">No ACK (timeout)</Pill>;
    default: return <Pill tone="danger">Failed to send</Pill>;
  }
}
const ICON = { sending: Loader2, awaiting_ack: Clock, acknowledged: CheckCircle2, rejected: XCircle, timeout: AlertTriangle, error: XCircle };

export function MachineControls() {
  const machine = useEco((s) => s.machine);
  const commands = useEco((s) => s.commands);
  const mode = useEco((s) => s.settings.mode);
  const backend = useEco((s) => s.connection.backend);
  const mqtt=useEco(s=>s.connection.mqtt);
  const esp32=useEco(s=>s.connection.esp32);
  const [confirm, setConfirm] = useState(false);
  const pending = commands.some((c) => c.state === "sending" || c.state === "awaiting_ack");
  const disabled = pending || (mode!=="demo" && (!backend || !mqtt || !esp32));

  return (
    <Panel title="Machine Controls" icon={Power} action={<span className="text-xs text-muted-foreground">State: <span className="font-medium text-foreground">{machine}</span></span>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Btn variant="primary" disabled={disabled || machine === "running"} onClick={() => sendCommand("start")}><Play className="h-4 w-4" />Start</Btn>
        <Btn disabled={disabled || machine !== "running"} onClick={() => sendCommand("pause")}><Pause className="h-4 w-4" />Pause</Btn>
        <Btn disabled={disabled || machine !== "paused"} onClick={() => sendCommand("resume")}><RotateCcw className="h-4 w-4" />Resume</Btn>
        <Btn variant="danger" disabled={disabled || machine === "stopped"} onClick={() => setConfirm(true)}><Power className="h-4 w-4" />Stop</Btn>
      </div>
      {mode!=="demo" && (!backend || !mqtt || !esp32) && <p className="mt-3 text-xs text-destructive">Backend or device offline — commands unavailable.</p>}
      {mode === "demo" && <p className="mt-3 text-xs text-muted-foreground">Demo mode: acknowledgements come from the simulated device.</p>}

      <div className="mt-4 space-y-2">
        {commands.slice(0, 4).map((c) => {
          const I = ICON[c.state];
          return (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-secondary/30 px-3 py-2 text-xs">
              <span className="flex items-center gap-2">
                <I className={`h-3.5 w-3.5 ${c.state === "sending" ? "animate-spin" : ""}`} />
                <span className="font-mono uppercase">{c.command}</span>
                <span className="text-muted-foreground">{new Date(c.sentAt).toLocaleTimeString()}</span>
              </span>
              <span className="flex items-center gap-2">
                {c.message && <span className="text-muted-foreground">{c.message}</span>}
                <CmdState c={c} />
              </span>
            </div>
          );
        })}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Stop the machine?">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setConfirm(false)} />
          <div className="glass relative w-full max-w-sm bg-popover p-5">
            <div className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /><h3 className="font-semibold">Stop the machine?</h3></div>
            <p className="mt-2 text-sm text-muted-foreground">The conveyor and sorting mechanism will halt. Objects on the belt will remain unsorted until restarted.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setConfirm(false)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => { setConfirm(false); sendCommand("stop"); }}>Stop machine</Btn>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
