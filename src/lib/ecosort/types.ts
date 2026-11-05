export const CATEGORIES = ["plastic", "paper", "metal", "biodegradable"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  plastic: "Plastic",
  paper: "Paper",
  metal: "Metal",
  biodegradable: "Biodegradable",
};
export const CATEGORY_COLOR: Record<Category, string> = {
  plastic: "var(--cat-plastic)",
  paper: "var(--cat-paper)",
  metal: "var(--cat-metal)",
  biodegradable: "var(--cat-biodegradable)",
};

export type DataMode = "demo" | "mqtt_demo" | "live";
export type MachineState = "running" | "paused" | "stopped" | "fault" | "unknown";
export type MachineCommand = "start" | "pause" | "resume" | "stop";

export interface Classification {
  id: string; // unique eventId
  ts: number;
  object: string;
  category: Category;
  confidence: number; // 0..1
  weightGrams: number;
  sortResult: "sorted" | "failed" | "pending";
  status: "confirmed" | "low_confidence" | "error";
  simulated: boolean;
}

export interface Telemetry {
  ts: number;
  totalWeightKg: number;
  counts: Record<Category, number>;
  moisturePercent: number | null;
  metalDetected: boolean | null;
  objectDetected: boolean | null;
  conveyorState: string | null;
  sorterState: string | null;
}

export interface BinState {
  category: Category;
  fillPercent: number;
  weightKg: number;
  capacityKg: number;
  updatedAt: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  kind: string;
  online: boolean;
  lastSeen: number | null;
  telemetry: Record<string, string | number | boolean>;
}

export interface CommandRecord {
  id: string;
  command: MachineCommand;
  sentAt: number;
  state: "sending" | "awaiting_ack" | "acknowledged" | "rejected" | "timeout" | "error";
  ackAt?: number;
  message?: string | undefined;
}

export interface Connection {
  backend: boolean;
  mqtt: boolean;
  esp32: boolean;
  lastDeviceMessage: number | null;
  error?: string | undefined;
}

export function normalizeCategory(raw: string): Category | null {
  const v = raw.toLowerCase().trim();
  if (v === "organic" || v === "bio" || v === "biodegradable") return "biodegradable";
  if (v === "plastic" || v === "paper" || v === "metal") return v;
  return null;
}

export function binLevel(fill: number): "ok" | "warning" | "critical" {
  if (fill >= 95) return "critical";
  if (fill >= 80) return "warning";
  return "ok";
}
