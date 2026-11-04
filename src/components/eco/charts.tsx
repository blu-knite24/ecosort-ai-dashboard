import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORIES, CATEGORY_COLOR, CATEGORY_LABEL, type Category } from "@/lib/ecosort/types";

const tip = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" },
  labelStyle: { color: "var(--muted-foreground)" },
  cursor: { fill: "color-mix(in oklab, var(--primary) 6%, transparent)" },
};
const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;

export function Doughnut({ data, unit = "kg" }: { data: Record<Category, number>; unit?: string }) {
  const rows = CATEGORIES.map((c) => ({ name: CATEGORY_LABEL[c], value: +data[c].toFixed(2), c }));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey="value" innerRadius="66%" outerRadius="100%" paddingAngle={2} stroke="none">
              {rows.map((r) => <Cell key={r.c} fill={CATEGORY_COLOR[r.c]} />)}
            </Pie>
            <Tooltip {...tip} formatter={(v: number) => `${v} ${unit}`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><p className="text-lg font-semibold tabular-nums">{total.toFixed(unit === "kg" ? 1 : 0)}</p><p className="text-[11px] text-muted-foreground">{unit} total</p></div>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.c} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[r.c] }} />{r.name}</span>
            <span className="tabular-nums text-muted-foreground">{r.value} {unit} · {total ? Math.round((r.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StackedBars({ data, height = 260 }: { data: any[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -18, right: 4, top: 4 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...axis} minTickGap={12} />
          <YAxis {...axis} />
          <Tooltip {...tip} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {CATEGORIES.map((c, i) => (
            <Bar key={c} dataKey={c} name={CATEGORY_LABEL[c]} stackId="a" fill={CATEGORY_COLOR[c]} radius={i === 3 ? [3, 3, 0, 0] : 0} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleBars({ data, dataKey, name, color = "var(--primary)", height = 240 }: { data: any[]; dataKey: string; name: string; color?: string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -18, right: 4, top: 4 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...axis} minTickGap={12} />
          <YAxis {...axis} />
          <Tooltip {...tip} />
          <Bar dataKey={dataKey} name={name} fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLines({ data, height = 260 }: { data: any[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -18, right: 8, top: 4 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...axis} minTickGap={12} />
          <YAxis {...axis} />
          <Tooltip {...tip} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="recyclable" name="Recyclable (plastic+paper+metal)" stroke="var(--primary)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="biodegradable" name="Biodegradable" stroke="var(--cat-biodegradable)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
