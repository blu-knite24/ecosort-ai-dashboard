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
import { z } from "zod";
import { ackInput, binsInput, classificationInput, machineInput, mergeHistory, telemetryInput } from "./validation";

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
  backendUrl: (import.meta.env["VITE_ECOSORT_BACKEND_URL"] as string) || "http://localhost:4000",
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
let generation = 0;
const timers = new Set<ReturnType<typeof setTimeout>>();
function later(fn: () => void, ms: number) {
  const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms);
  timers.add(timer);
}

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
    telemetry: null,
    devices: [],
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

function startLive(settings: Settings) {
  const activeGeneration = generation;
  const isCurrent = () => activeGeneration === generation;
  const simulated = settings.mode === "mqtt_demo";
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
  const abort = new AbortController();
  later(() => abort.abort(), 15000);
  fetch(`${settings.backendUrl}/api/classifications?limit=20000&simulated=${simulated}`, { headers, signal: abort.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((rows: unknown) => {
      if (!isCurrent()) return;
      const list = z.array(classificationInput).parse(rows).filter(c => c.simulated === simulated);
      list.forEach((c) => seen.add(c.id));
      set((s) => ({ history: mergeHistory(s.history, list), historyLoaded: true, latest: s.latest ?? list[0] ?? null }));
    })
    .catch((e: Error) => { if (isCurrent()) set((s) => ({ historyLoaded: true, connection: { ...s.connection, error: `History: ${e.message}` } })); });

  socket = io(settings.backendUrl, { auth: { token: settings.apiToken, simulated }, reconnection: true, reconnectionDelayMax: 10000 });
  const currentSocket = socket;
  socket.on("connect", () => set((s) => ({ connection: { ...s.connection, backend: true, error: undefined } })));
  socket.on("disconnect", () => set((s) => ({ machine: "unknown", connection: { ...s.connection, backend: false, mqtt: false, esp32: false } })));
  socket.on("connect_error", (e) => set((s) => ({ connection: { ...s.connection, backend: false, error: e.message } })));
  socket.on("snapshot", (snap: any) =>
    set({
      connection: { backend: true, mqtt: !!snap.mqttConnected, esp32: !!snap.deviceOnline, lastDeviceMessage: snap.lastDeviceMessage ?? null },
      machine: machineInput.safeParse(snap.machineState).data ?? "unknown",
      telemetry: telemetryInput.safeParse(snap.telemetry).data ?? null,
      bins: binsInput.safeParse(snap.bins).data ?? [],
      devices: snap.devices ?? [],
    }),
  );
  socket.on("connection", (c: any) =>
    set((s) => ({ connection: { ...s.connection, mqtt: !!c.mqttConnected, esp32: !!c.deviceOnline, lastDeviceMessage: c.lastDeviceMessage ?? s.connection.lastDeviceMessage } })),
  );
  socket.on("classification", (raw: unknown) => {const c=classificationInput.safeParse(raw);if(c.success && c.data.simulated===simulated)ingestClassification(c.data);});
  socket.on("telemetry", (raw: unknown) => {const t=telemetryInput.safeParse(raw);if(t.success)set({telemetry:t.data});});
  socket.on("bins", (raw: unknown) => {const b=binsInput.safeParse(raw);if(b.success)set({bins:b.data});});
  socket.on("devices", (d: DeviceInfo[]) => set({ devices: d }));
  socket.on("status", (st: { machineState: unknown }) => {const m=machineInput.safeParse(st.machineState);if(m.success)set({machine:m.data});});
  socket.on("ack", (raw: unknown) => {
    const parsed=ackInput.safeParse(raw);if(!parsed.success)return;
    const a=parsed.data;
    earlyAcks.set(a.commandId,a);
    if(earlyAcks.size>100)earlyAcks.delete(earlyAcks.keys().next().value ?? "");
    updateCommand(a.commandId, { state: a.success ? "acknowledged" : "rejected", ackAt: Date.now(), message: a.message });
    if (a.success && a.machineState) set({ machine: a.machineState });
  });
  socket.on("command_timeout", (a: { commandId: string }) =>
    updateCommand(a.commandId, { state: "timeout", message: "No acknowledgement from device" }),
  );

  return () => {
    abort.abort();
    currentSocket.disconnect();
    if(socket===currentSocket)socket=null;
  };
}

// ---------- public API ----------
const KEY = "ecosort.settings.v1";
const earlyAcks = new Map<string,z.infer<typeof ackInput>>();

export function initEcoSort() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) set({ settings: { ...DEFAULT_SETTINGS, ...JSON.parse(raw), apiToken:sessionStorage.getItem("ecosort.operatorToken") ?? "" } });
  } catch {}
  restart();
  // heartbeat watchdog (live): mark ESP32 offline if silent too long
  const hb = setInterval(() => {
    const s = state;
    if (s.settings.mode === "demo") return;
    const last = s.connection.lastDeviceMessage;
    const offline = !last || Date.now() - last > s.settings.heartbeatTimeoutSec * 1000;
    if (offline && s.connection.esp32) set({machine:"unknown",devices:s.devices.map(d=>({...d,online:false})), connection: { ...s.connection, esp32: false } });
  }, 2000);
  return () => {
    clearInterval(hb);
    generation++;
    timers.forEach(clearTimeout);timers.clear();
    stopEngine?.();
  };
}

function restart() {
  generation++;
  timers.forEach(clearTimeout);timers.clear();earlyAcks.clear();
  stopEngine?.();
  stopEngine = state.settings.mode === "demo" ? startDemo() : startLive(state.settings);
}

export function saveSettings(patch: Partial<Settings>) {
  const next={...state.settings,...patch};
  const url=new URL(next.backendUrl);
  if(!["http:","https:"].includes(url.protocol))throw new Error("Use an HTTP or HTTPS backend URL.");
  if(next.mode!=="demo" && window.location.protocol==="https:" && url.protocol!=="https:" && !["localhost","127.0.0.1"].includes(url.hostname))throw new Error("A secure page requires an HTTPS backend URL.");
  if(next.mode!=="demo" && !next.apiToken.trim())throw new Error("Enter your operator API token.");
  next.backendUrl=next.backendUrl.replace(/\/+$/,"");
  next.heartbeatTimeoutSec=Math.min(300,Math.max(5,next.heartbeatTimeoutSec || 15));
  next.ackTimeoutSec=Math.min(120,Math.max(2,next.ackTimeoutSec || 10));
  const prevMode = state.settings.mode;
  const prev = state.settings;
  set({ settings: next });
  localStorage.setItem(KEY, JSON.stringify({...state.settings,apiToken:""}));
  sessionStorage.setItem("ecosort.operatorToken",state.settings.apiToken);
  if (prevMode !== state.settings.mode || prev.backendUrl !== state.settings.backendUrl || prev.apiToken !== state.settings.apiToken) restart();
}

const NEXT_STATE: Record<MachineCommand, MachineState> = { start: "running", resume: "running", pause: "paused", stop: "stopped" };

export async function sendCommand(command: MachineCommand) {
  const s = state;
  const activeGeneration=generation;
  const localId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  set((st) => ({ commands: [{ id: localId, command, sentAt: Date.now(), state: "sending" as const }, ...st.commands].slice(0, 30) }));

  if (s.settings.mode === "demo") {
    updateCommand(localId, { state: "awaiting_ack" });
    later(() => {
      updateCommand(localId, { state: "acknowledged", ackAt: Date.now(), message: "Simulated device ACK" });
      set({ machine: NEXT_STATE[command] });
    }, 700 + Math.random() * 900);
    return;
  }

  try {
    const res = await fetch(`${s.settings.backendUrl}/api/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.settings.apiToken}` },
      body: JSON.stringify({command,simulated:s.settings.mode==="mqtt_demo"}),
      signal:AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    if(activeGeneration!==generation)return;
    if(typeof body.commandId!=="string" || !body.commandId)throw new Error("Backend returned no command ID");
    // Swap local id for the server-issued commandId so the ACK can be matched.
    set((st) => ({ commands: st.commands.map((c) => (c.id === localId ? { ...c, id: body.commandId, state: "awaiting_ack" as const } : c)) }));
    const serverId = body.commandId as string;
    const early=earlyAcks.get(serverId);
    if(early){updateCommand(serverId,{state:early.success?"acknowledged":"rejected",ackAt:Date.now(),message:early.message});earlyAcks.delete(serverId);}
    later(() => {
      const c = state.commands.find((x) => x.id === serverId);
      if (c && c.state === "awaiting_ack") updateCommand(serverId, { state: "timeout", message: "No acknowledgement from device" });
    }, s.settings.ackTimeoutSec * 1000);
  } catch (e: any) {
    if(activeGeneration===generation)updateCommand(localId, { state: "error", message: e.message });
  }
}

export function alertsFor(bins: BinState[]) {
  return bins.filter((b) => binLevel(b.fillPercent) !== "ok");
}
