import { Link, useLocation } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { LayoutDashboard, ListChecks, Timer, Calendar, BookOpen, Settings as Cog } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "Planner", icon: ListChecks },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/schedule", label: "Schedule", icon: Calendar },
  { to: "/curriculum", label: "Curriculum", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Cog },
] as const;

export function AppNav() {
  const settings = useAppStore((s) => s.settings);
  const location = useLocation();

  const alignClass =
    settings.navAlignment === "left"
      ? "justify-start pl-6"
      : settings.navAlignment === "right"
        ? "justify-end pr-6"
        : "justify-center";

  const wrapperClass = settings.floatingNav
    ? "fixed bottom-6 left-0 right-0 z-50 no-print"
    : "sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur no-print";

  return (
    <nav className={cn(wrapperClass, "flex", alignClass)} aria-label="Primary">
      <div
        className={cn(
          "flex items-center gap-1 rounded-2xl border border-border bg-surface-elevated/90 backdrop-blur px-2 py-2 shadow-xl",
          !settings.floatingNav && "rounded-none border-0 bg-transparent shadow-none my-1",
        )}
      >
        {items.map((it) => {
          const Icon = it.icon;
          const active = location.pathname === it.to;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {settings.showNavLabels && <span>{it.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
