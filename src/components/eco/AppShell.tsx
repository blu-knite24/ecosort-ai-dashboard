import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity, BarChart3, Cpu, History, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Radio, Recycle, Settings, Trash2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initEcoSort, useEco } from "@/lib/ecosort/store";
import { Pill } from "./ui";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/live", label: "Live Monitoring", icon: Activity },
  { to: "/analytics", label: "Waste Analytics", icon: BarChart3 },
  { to: "/history", label: "Classification History", icon: History },
  { to: "/devices", label: "Device Management", icon: Cpu },
  { to: "/bins", label: "Bin Management", icon: Trash2 },
  { to: "/mqtt", label: "MQTT Configuration", icon: Radio },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
        <Recycle className="h-5 w-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">EcoSort <span className="text-primary">AI</span></p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Waste Segregation</p>
        </div>
      )}
    </div>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            title={collapsed ? n.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <n.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{n.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function StatusBar() {
  const conn = useEco((s) => s.connection);
  const mode = useEco((s) => s.settings.mode);
  const machine = useEco((s) => s.machine);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {mode === "demo" ? <Pill tone="warning">Demo simulation</Pill> : <Pill tone="info">Live mode</Pill>}
      <Pill tone={conn.mqtt ? "success" : "danger"}>MQTT</Pill>
      <Pill tone={conn.esp32 ? "success" : "danger"}>ESP32</Pill>
      <Pill tone={machine === "running" ? "success" : machine === "paused" ? "warning" : machine === "unknown" ? "muted" : "danger"}>
        Machine: {machine}
      </Pill>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => initEcoSort(), []);

  return (
    <div className="flex min-h-screen w-full">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar p-3 backdrop-blur-xl transition-[width] duration-200 md:flex", collapsed ? "w-16" : "w-64")}>
        <div className={cn("mb-6 flex items-center px-1 pt-1", collapsed ? "justify-center" : "justify-between")}>
          <Logo compact={collapsed} />
        </div>
        <NavList collapsed={collapsed} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mt-auto flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r bg-sidebar p-3 backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between px-1 pt-1">
              <Logo />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavList onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/70 px-4 py-2.5 backdrop-blur-xl sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="md:hidden"><Logo compact /></div>
          <div className="ml-auto overflow-x-auto"><StatusBar /></div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
