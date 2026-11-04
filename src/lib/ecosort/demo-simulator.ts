// Browser-side DEMO data generator. Every record it produces is flagged
// `simulated: true` and the UI labels it as demonstration data.
import { CATEGORIES, type BinState, type Category, type Classification, type DeviceInfo } from "./types";

const OBJECTS: Record<Category, string[]> = {
  plastic: ["PET water bottle", "yogurt cup", "shampoo bottle", "plastic bag", "food tray"],
  paper: ["newspaper sheet", "cardboard box", "paper cup", "notebook page", "egg carton"],
  metal: ["tin food container", "aluminium can", "bottle cap", "foil tray", "steel spoon"],
  biodegradable: ["banana peel", "apple core", "vegetable scraps", "tea leaves", "eggshell"],
};
const WEIGHT: Record<Category, [number, number]> = {
  plastic: [8, 45],
  paper: [5, 120],
  metal: [12, 60],
  biodegradable: [15, 180],
};

let seq = 0;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function makeClassification(ts = Date.now()): Classification {
  const r = Math.random();
  const category: Category = r < 0.34 ? "plastic" : r < 0.58 ? "paper" : r < 0.72 ? "metal" : "biodegradable";
  const confidence = +Math.min(0.995, rnd(0.62, 1)).toFixed(3);
  const low = confidence < 0.75;
  const failed = !low && Math.random() < 0.02;
  return {
    id: `sim-${ts}-${seq++}`,
    ts,
    object: pick(OBJECTS[category]),
    category,
    confidence,
    weightGrams: Math.round(rnd(...WEIGHT[category])),
    sortResult: failed ? "failed" : "sorted",
    status: low ? "low_confidence" : failed ? "error" : "confirmed",
    simulated: true,
  };
}

export function seedHistory(days = 90): Classification[] {
  const out: Classification[] = [];
  const now = Date.now();
  for (let d = days; d >= 0; d--) {
    const n = Math.round(rnd(25, 70) * (d % 7 === 0 || d % 7 === 6 ? 0.5 : 1));
    for (let i = 0; i < n; i++) {
      const ts = now - d * 86_400_000 - Math.floor(rnd(0, 10 * 3_600_000));
      if (ts < now) out.push(makeClassification(ts));
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

export const BIN_CAPACITY_KG: Record<Category, number> = {
  plastic: 8,
  paper: 10,
  metal: 12,
  biodegradable: 15,
};

export function seedBins(): BinState[] {
  const fills: Record<Category, number> = { plastic: 62, paper: 83, metal: 34, biodegradable: 96 };
  return CATEGORIES.map((c) => ({
    category: c,
    fillPercent: fills[c],
    weightKg: +((fills[c] / 100) * BIN_CAPACITY_KG[c]).toFixed(2),
    capacityKg: BIN_CAPACITY_KG[c],
    updatedAt: Date.now(),
  }));
}

export function demoDevices(now: number, extra: { moisture: number; metal: boolean; obj: boolean; conveyor: string }): DeviceInfo[] {
  return [
    { id: "esp32", name: "ESP32 Controller", kind: "controller", online: true, lastSeen: now, telemetry: { firmware: "1.4.2", rssi: `${Math.round(rnd(-68, -52))} dBm`, uptime: "6h 12m", freeHeap: `${Math.round(rnd(140, 180))} KB` } },
    { id: "camera", name: "Camera & AI Processor", kind: "vision", online: true, lastSeen: now, telemetry: { model: "EcoNet-v2 (TFLite)", inferenceMs: Math.round(rnd(38, 72)), fps: Math.round(rnd(14, 20)), gpuTemp: `${Math.round(rnd(48, 61))} °C` } },
    { id: "metal", name: "Metal Detection Sensor", kind: "sensor", online: true, lastSeen: now, telemetry: { detected: extra.metal, signal: `${Math.round(rnd(2, 98))}%` } },
    { id: "moisture", name: "Moisture Sensor", kind: "sensor", online: true, lastSeen: now, telemetry: { moisture: `${extra.moisture}%`, raw: Math.round(extra.moisture * 40.95) } },
    { id: "ir", name: "IR Object Detection", kind: "sensor", online: true, lastSeen: now, telemetry: { objectDetected: extra.obj, distance: `${Math.round(rnd(3, 18))} cm` } },
    { id: "conveyor", name: "Conveyor Motor", kind: "actuator", online: true, lastSeen: now, telemetry: { state: extra.conveyor, speed: extra.conveyor === "running" ? "0.18 m/s" : "0 m/s", current: extra.conveyor === "running" ? `${rnd(0.8, 1.2).toFixed(2)} A` : "0.00 A" } },
    { id: "servo", name: "Servo Sorting Mechanism", kind: "actuator", online: true, lastSeen: now, telemetry: { position: `${Math.round(rnd(0, 180))}°`, cycles: 1200 + seq } },
  ];
}
