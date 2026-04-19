import { useAppStore, currentElapsedSec, targetSec } from "./useAppStore";
import { todayISO } from "@/lib/time";
import { useEffect, useState } from "react";

export function useDashboardMetrics() {
  const sessions = useAppStore((s) => s.sessions);
  const tasks = useAppStore((s) => s.tasks);
  const today = todayISO();

  const todaySessions = sessions.filter(
    (s) => s.completedAt.slice(0, 10) === today && s.mode === "work",
  );
  const focusMinutes = Math.round(
    todaySessions.reduce((acc, s) => acc + s.durationSec, 0) / 60,
  );
  const completedTasks = tasks.filter((t) => t.date === today && t.status === "done").length;
  const upcoming = tasks
    .filter((t) => t.deadline)
    .filter((t) => {
      const d = new Date(t.deadline!).getTime();
      const now = Date.now();
      return d >= now && d - now <= 7 * 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

  return {
    focusMinutes,
    sessionCount: todaySessions.length,
    completedTasks,
    upcoming,
  };
}

// Live timer hook: re-renders every second while running
export function useLiveTimer() {
  const timer = useAppStore((s) => s.timer);
  const settings = useAppStore((s) => s.settings);
  const tickComplete = useAppStore((s) => s.tickComplete);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!timer.isRunning) return;
    const id = setInterval(() => {
      const elapsed = currentElapsedSec(useAppStore.getState().timer);
      const tgt = targetSec(useAppStore.getState().timer.mode, useAppStore.getState().settings);
      if (elapsed >= tgt) {
        tickComplete();
      } else {
        setTick((n) => n + 1);
      }
    }, 250);
    return () => clearInterval(id);
  }, [timer.isRunning, tickComplete]);

  const elapsed = currentElapsedSec(timer);
  const target = targetSec(timer.mode, settings);
  const remaining = Math.max(0, target - elapsed);
  return { elapsed, target, remaining, timer };
}
