import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR, CATEGORY_LABEL, type Category } from "@/lib/ecosort/types";
import { useEco } from "@/lib/ecosort/store";

export function Panel({ title, icon: Icon, action, children, className }: { title?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("glass p-4 sm:p-5", className)}>
      {title && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, unit, icon: Icon, tone = "primary", hint }: { label: string; value: ReactNode; unit?: string; icon: LucideIcon; tone?: "primary" | "accent" | "highlight" | Category; hint?: string }) {
  const color = tone in CATEGORY_COLOR ? CATEGORY_COLOR[tone as Category] : `var(--${tone})`;
  return (
    <div className="glass flex items-start gap-3 p-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border" style={{ color, background: `color-mix(in oklab, ${color} 12%, transparent)` }}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">
          {value}
          {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
        </p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

type Tone = "success" | "warning" | "danger" | "muted" | "info";
const toneCls: Record<Tone, string> = {
  success: "text-success border-success/30 bg-success/10",
  warning: "text-warning border-warning/30 bg-warning/10",
  danger: "text-destructive border-destructive/30 bg-destructive/10",
  muted: "text-muted-foreground border-border bg-muted/40",
  info: "text-primary border-primary/30 bg-primary/10",
};
export function Pill({ tone, children, dot = true }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", toneCls[tone])}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full bg-current", tone === "success" && "pulse-dot")} />}
      {children}
    </span>
  );
}

export function CategoryBadge({ c }: { c: Category }) {
  const color = CATEGORY_COLOR[c];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium" style={{ color, borderColor: `color-mix(in oklab, ${color} 35%, transparent)`, background: `color-mix(in oklab, ${color} 10%, transparent)` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {CATEGORY_LABEL[c]}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="grid min-h-24 place-items-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</div>;
}

export function DataSourceTag() {
  const mode = useEco((s) => s.settings.mode);
  return mode!=="live" ? <Pill tone="warning">{mode==="mqtt_demo"?"Simulated MQTT data":"Simulated demo data"}</Pill> : <Pill tone="info">Live hardware data</Pill>;
}

export function Btn({ variant = "default", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "danger" | "ghost" }) {
  const v = {
    default: "border bg-secondary/60 hover:bg-secondary text-foreground",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary",
    danger: "border border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25",
    ghost: "hover:bg-secondary/60 text-muted-foreground hover:text-foreground",
  }[variant];
  return <button {...p} className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40", v, className)} />;
}

export const inputCls = "w-full rounded-lg border bg-input/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
