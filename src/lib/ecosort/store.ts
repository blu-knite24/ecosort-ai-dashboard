import { useSyncExternalStore } from "react";
import { io, type Socket } from "socket.io-client";
import { binLevel } from "./types";
import type {
  BinState,
  Classification,
  CommandRecord,
  Connection,
  DataMode,
  DeviceInfo,
  MachineCommand,
  MachineState,
  Telemetry,
} from "./types";
import { demoDevices, makeClassification, seedBins, seedHistory } from "./demo-simulator";

export interface Settings {
  mode: DataMode;
  backendUrl: string;
  apiToken: string;
  heartbeatTimeoutSec: number;
  ackTimeoutSec: number;
}

export interface AppState {
  settings: Settings;
  connection: Connection;
  machine: MachineState;
  telemetry: Telemetry | null;
  latest: Classification | null;
  history: Classification[];
  bins: BinState[];
  devices: DeviceInfo[];
  commands: CommandRecord[];
  historyLoaded: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  mode: "demo",
  backendUrl: (import.meta.env.VITE_ECOSORT_BACKEND_URL as string) || "http://localhost:4000",
  apiToken: "",
  heartbeatTimeoutSec: 15,
  ackTimeoutSec: 10,
};

const emptyConn: Connection = { backend: false, mqtt: false, esp32: false, lastDeviceMessage: null };

let state: AppState = {
  settings: DEFAULT_SETTINGS,
  connection: emptyConn,
  machine: "unknown",
  telemetry: null,
  latest: null,
  history: [],
  bins: [],
  devices: [],
  commands: [],
  historyLoaded: false,
};
const initial = state;
const listeners = new Set<() => void>();

function set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  listeners.forEach((l) => l());
}

export function useEco<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
    () => sel(initial),
  );
}
export const getState = () => state;

// ---------- shared ingest (dedupe by eventId) ----------
const seen = new Set<string>();
function ingestClassification(c: Classification) {
  if (seen.has(c.id)) return;
  seen.add(c.id);
  set((s) => ({ latest: c, history: [c, ...s.history].slice(0, 20000) }));
}
function updateCommand(id: string, patch: Partial<CommandRecord>) {
  set((s) => ({ commands: s.commands.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
}

// ---------- engines ----------
let stopEngine: (() => void) | null = null;

function startDemo() {
  seen.clear();
  const history = seedHistory();
  history.forEach((h) => seen.add(h.id));
  let machine: MachineState = "running";
  let bins = seedBins();
  let moisture = 48;
  set({
    connection: { backend: true, mqtt: true, esp32: true, lastDeviceMessage: Date.now() },
    machine,
    history,
    historyLoaded: true,
    latest: history[0] ?? null,
    bins,
    commands: [],
  });

  const tick = setInterval(() => {
    const now = Date.now();
    machine = state.machine;
    const running = machine === "running";
    let obj = false;
    let metal = false;
    if (running && Math.random() < 0.55) {
      const c = makeClassification(now);
      obj = true;
      metal = c.category === "metal";
      moisture = c.category === "biodegradable" ? Math.round(55 + Math.random() * 30) : Math.round(10 + Math.random() * 25);
      ingestClassification(c);
      bins = bins.map((b) =>
        b.category === c.category
          ? {
              ...b,
              weightKg: +(b.weightKg + c.weightGrams / 1000).toFixed(3),
              fillPercent: Math.min(100, +(((b.weightKg + c.weightGrams / 1000) / b.capacityKg) * 100).toFixed(1)),
              updatedAt: now,
            }
          : b,
      );
    }
    const counts = { plastic: 0, paper: 0, metal: 0, biodegradable: 0 };
    let kg = 0;
    for (const h of state.history) {
      counts[h.category]++;
      kg += h.weightGrams / 1000;
    }
    const conveyor = running ? "running" : machine === "paused" ? "paused" : "stopped";
    set({
      bins,
      connection: { backend: true, mqtt: true, esp32: true, lastDeviceMessage: now },
      telemetry: {
        ts: now,
        totalWeightKg: +kg.toFixed(2),
        counts,
        moisturePercent: moisture,
        metalDetected: metal,
        objectDetected: obj,
        conveyorState: conveyor,
        sorterState: obj ? "actuating" : "idle",
      },
      devices: demoDevices(now, { moisture, metal, obj, conveyor }),
    });
  }, 2500);
  return () => clearInterval(tick);
}

let socket: Socket | null = null;

function mapClassification(r: any): Classification {
  return { ...r, ts: typeof r.ts === "number" ? r.ts : Date.parse(r.ts), simulated: !!r.simulated };
}

function startLive(settings: Settings) {
  seen.clear();
  set({
    connection: { ...emptyConn },
    machine: "unknown",
    telemetry: null,
    latest: null,
    history: [],
    bins: [],
    devices: [],
    commands: [],
    historyLoaded: false,
  });

  const headers = { Authorization: `Bearer ${settings.apiToken}` };
  fetch(`${settings.backendUrl}/api/classifications?limit=20000`, { headers })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((rows: any[]) => {
      const list = rows.map(mapClassification);
      list.forEach((c) => seen.add(c.id));
      set((s) => ({ history: [...s.history, ...list].sort((a, b) => b.ts - a.ts), historyLoaded: true, latest: s.latest ?? list[0] ?? null }));
    })
    .catch((e) => set((s) => ({ historyLoaded: true, connection: { ...s.connection, error: `History: ${e.message}` } })));

  socket = io(settings.backendUrl, { auth: { token: settings.apiToken }, reconnection: true, reconnectionDelayMax: 10000 });
  socket.on("connect", () => set((s) => ({ connection: { ...s.connection, backend: true, error: undefined } })));
  socket.on("disconnect", () => set((s) => ({ connection: { ...s.connection, backend: false, mqtt: false } })));
  socket.on("connect_error", (e) => set((s) => ({ connection: { ...s.connection, backend: false, error: e.message } })));
  socket.on("snapshot", (snap: any) =>
    set({
      connection: { backend: true, mqtt: !!snap.mqttConnected, esp32: !!snap.deviceOnline, lastDeviceMessage: snap.lastDeviceMessage ?? null },
      machine: snap.machineState ?? "unknown",
      telemetry: snap.telemetry ?? null,
      bins: snap.bins ?? [],
      devices: snap.devices ?? [],
    }),
  );
  socket.on("connection", (c: any) =>
    set((s) => ({ connection: { ...s.connection, mqtt: !!c.mqttConnected, esp32: !!c.deviceOnline, lastDeviceMessage: c.lastDeviceMessage ?? s.connection.lastDeviceMessage } })),
  );
  socket.on("classification", (c: any) => ingestClassification(mapClassification(c)));
  socket.on("telemetry", (t: Telemetry) => set({ telemetry: t }));
  socket.on("bins", (b: BinState[]) => set({ bins: b }));
  socket.on("devices", (d: DeviceInfo[]) => set({ devices: d }));
  socket.on("status", (st: { machineState: MachineState }) => set({ machine: st.machineState }));
  socket.on("ack", (a: { commandId: string; success: boolean; message?: string; machineState?: MachineState }) => {
    updateCommand(a.commandId, { state: a.success ? "acknowledged" : "rejected", ackAt: Date.now(), message: a.message });
    if (a.machineState) set({ machine: a.machineState });
  });
  socket.on("command_timeout", (a: { commandId: string }) =>
    updateCommand(a.commandId, { state: "timeout", message: "No acknowledgement from device" }),
  );

  return () => {
    socket?.disconnect();
    socket = null;
  };
}

// ---------- public API ----------
const KEY = "ecosort.settings.v1";

export function initEcoSort() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) set({ settings: { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } });
  } catch {}
  restart();
  // heartbeat watchdog (live): mark ESP32 offline if silent too long
  const hb = setInterval(() => {
    const s = state;
    if (s.settings.mode !== "live") return;
    const last = s.connection.lastDeviceMessage;
    const offline = !last || Date.now() - last > s.settings.heartbeatTimeoutSec * 1000;
    if (offline && s.connection.esp32) set({ connection: { ...s.connection, esp32: false } });
  }, 2000);
  return () => {
    clearInterval(hb);
    stopEngine?.();
  };
}

function restart() {
  stopEngine?.();
  stopEngine = state.settings.mode === "demo" ? startDemo() : startLive(state.settings);
}

export function saveSettings(patch: Partial<Settings>) {
  const prevMode = state.settings.mode;
  const prev = state.settings;
  set({ settings: { ...state.settings, ...patch } });
  localStorage.setItem(KEY, JSON.stringify(state.settings));
  if (prevMode !== state.settings.mode || prev.backendUrl !== state.settings.backendUrl || prev.apiToken !== state.settings.apiToken) restart();
}

const NEXT_STATE: Record<MachineCommand, MachineState> = { start: "running", resume: "running", pause: "paused", stop: "stopped" };

export async function sendCommand(command: MachineCommand) {
  const s = state;
  const localId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  set((st) => ({ commands: [{ id: localId, command, sentAt: Date.now(), state: "sending" as const }, ...st.commands].slice(0, 30) }));

  if (s.settings.mode === "demo") {
    updateCommand(localId, { state: "awaiting_ack" });
    setTimeout(() => {
      updateCommand(localId, { state: "acknowledged", ackAt: Date.now(), message: "Simulated device ACK" });
      set({ machine: NEXT_STATE[command] });
    }, 700 + Math.random() * 900);
    return;
  }

  try {
    const res = await fetch(`${s.settings.backendUrl}/api/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.settings.apiToken}` },
      body: JSON.stringify({ command }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    // Swap local id for the server-issued commandId so the ACK can be matched.
    set((st) => ({ commands: st.commands.map((c) => (c.id === localId ? { ...c, id: body.commandId, state: "awaiting_ack" as const } : c)) }));
    const serverId = body.commandId as string;
    setTimeout(() => {
      const c = state.commands.find((x) => x.id === serverId);
      if (c && c.state === "awaiting_ack") updateCommand(serverId, { state: "timeout", message: "No acknowledgement from device" });
    }, s.settings.ackTimeoutSec * 1000);
  } catch (e: any) {
    updateCommand(localId, { state: "error", message: e.message });
  }
}

export function alertsFor(bins: BinState[]) {
  return bins.filter((b) => binLevel(b.fillPercent) !== "ok");
}
