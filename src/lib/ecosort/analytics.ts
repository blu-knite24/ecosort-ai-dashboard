import { CATEGORIES, type Category, type Classification } from "./types";

const DAY = 86_400_000;

export function totals(list: Classification[]) {
  const kg = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  const count = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const r of list) {
    kg[r.category] += r.weightGrams / 1000;
    count[r.category] += 1;
  }
  const totalKg = CATEGORIES.reduce((s, c) => s + kg[c], 0);
  return { kg, count, totalKg, totalCount: list.length };
}

export function inRange(list: Classification[], from: number, to: number) {
  return list.filter((r) => r.ts >= from && r.ts <= to);
}

type Row = { label: string; total: number; count: number } & Record<Category, number>;

function bucket(list: Classification[], keyOf: (d: Date) => string, keys: string[], labels: string[]): Row[] {
  const map = new Map<string, Row>();
  keys.forEach((k, i) =>
    map.set(k, { label: labels[i] ?? k, total: 0, count: 0, plastic: 0, paper: 0, metal: 0, biodegradable: 0 }),
  );
  for (const r of list) {
    const row = map.get(keyOf(new Date(r.ts)));
    if (!row) continue;
    const kg = r.weightGrams / 1000;
    row[r.category] += kg;
    row.total += kg;
    row.count += 1;
  }
  return [...map.values()].map((r) => ({
    ...r,
    total: +r.total.toFixed(2),
    plastic: +r.plastic.toFixed(2),
    paper: +r.paper.toFixed(2),
    metal: +r.metal.toFixed(2),
    biodegradable: +r.biodegradable.toFixed(2),
  }));
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function daily(list: Classification[], from: number, to: number) {
  const keys: string[] = [];
  const labels: string[] = [];
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  for (let t = start.getTime(); t <= to; t += DAY) {
    const d = new Date(t);
    keys.push(dayKey(d));
    labels.push(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  }
  return bucket(list, dayKey, keys, labels);
}

function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function weekly(list: Classification[], from: number, to: number) {
  const keys: string[] = [];
  const labels: string[] = [];
  for (let t = weekStart(new Date(from)).getTime(); t <= to; t += 7 * DAY) {
    const d = new Date(t);
    keys.push(dayKey(d));
    labels.push("Wk " + d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  }
  return bucket(list, (d) => dayKey(weekStart(d)), keys, labels);
}

export function monthly(list: Classification[], from: number, to: number) {
  const keys: string[] = [];
  const labels: string[] = [];
  const d = new Date(from);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  while (d.getTime() <= to) {
    keys.push(`${d.getFullYear()}-${d.getMonth()}`);
    labels.push(d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }));
    d.setMonth(d.getMonth() + 1);
  }
  return bucket(list, (x) => `${x.getFullYear()}-${x.getMonth()}`, keys, labels);
}

export function timeAgo(ts: number | null | undefined, now = Date.now()) {
  if (!ts) return "never";
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
