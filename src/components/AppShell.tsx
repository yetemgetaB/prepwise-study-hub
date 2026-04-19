import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function AppShell({ children }: { children: React.ReactNode }) {
  const uiScale = useAppStore((s) => s.settings.uiScale);
  const floatingNav = useAppStore((s) => s.settings.floatingNav);

  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(uiScale));
    document.documentElement.classList.add("dark");
  }, [uiScale]);

  return (
    <div className={floatingNav ? "min-h-screen pb-28" : "min-h-screen"}>
      {children}
    </div>
  );
}
