import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { useLiveTimer } from "@/store/selectors";
import { fmtTime } from "@/lib/time";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { todayISO } from "@/lib/time";

export const Route = createFileRoute("/focus")({
  component: FocusPage,
});

function FocusPage() {
  const { remaining, target } = useLiveTimer();
  const timer = useAppStore((s) => s.timer);
  const tasks = useAppStore((s) => s.tasks);
  const start = useAppStore((s) => s.startTimer);
  const pause = useAppStore((s) => s.pauseTimer);
  const reset = useAppStore((s) => s.resetTimer);
  const skip = useAppStore((s) => s.skipTimer);
  const setMode = useAppStore((s) => s.setTimerMode);
  const setTask = useAppStore((s) => s.setTimerTask);

  const today = todayISO();
  const todayTasks = tasks.filter((t) => t.date === today);
  const progress = ((target - remaining) / target) * 100;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Focus</h1>
        <p className="text-muted-foreground mt-2">One Pomodoro at a time. Timer keeps running across pages.</p>
      </header>

      <Card className="bg-surface border-border">
        <CardContent className="pt-8 pb-10">
          <div className="flex justify-center mb-6">
            <Tabs value={timer.mode} onValueChange={(v) => setMode(v as never)}>
              <TabsList className="bg-surface-elevated">
                <TabsTrigger value="work">Work</TabsTrigger>
                <TabsTrigger value="short">Short break</TabsTrigger>
                <TabsTrigger value="long">Long break</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="mx-auto max-w-md">
            <div
              className="relative aspect-square rounded-full border border-border bg-surface-elevated flex items-center justify-center"
              role="timer"
              aria-live="polite"
            >
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="var(--border)" strokeWidth="2" />
                <circle
                  cx="50" cy="50" r="46" fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={2 * Math.PI * 46 * (1 - progress / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <p className="text-6xl sm:text-7xl font-bold font-display tabular-nums">{fmtTime(remaining)}</p>
                <p className="text-sm text-muted-foreground mt-2 capitalize">{timer.mode === "work" ? "Focus" : timer.mode === "short" ? "Short break" : "Long break"}</p>
              </div>
            </div>

            <div className="mt-6">
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Linked task
              </label>
              <Select value={timer.taskId ?? "none"} onValueChange={(v) => setTask(v === "none" ? undefined : v)}>
                <SelectTrigger className="bg-surface-elevated border-border">
                  <SelectValue placeholder="No task linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No task</SelectItem>
                  {todayTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              {timer.isRunning ? (
                <Button onClick={pause} size="lg" className="bg-accent hover:bg-accent/90 min-w-32" aria-label="Pause">
                  <Pause className="h-4 w-4" /> Pause
                </Button>
              ) : (
                <Button onClick={() => start()} size="lg" className="bg-accent hover:bg-accent/90 min-w-32" aria-label="Start">
                  <Play className="h-4 w-4" /> Start
                </Button>
              )}
              <Button onClick={reset} size="lg" variant="secondary" aria-label="Reset">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
              <Button onClick={skip} size="lg" variant="ghost" aria-label="Skip">
                <SkipForward className="h-4 w-4" /> Skip
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
