import { createFileRoute, Link } from "@tanstack/react-router";
import { useDashboardMetrics } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, ListChecks, CheckCircle2, CalendarClock } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { focusMinutes, sessionCount, completedTasks, upcoming } = useDashboardMetrics();
  const sessions = useAppStore((s) => s.sessions);
  const tasks = useAppStore((s) => s.tasks);
  const profile = useAppStore((s) => s.profile);

  const recent = [...sessions]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1">
          Hi, {profile.displayName}
        </h1>
        <p className="text-muted-foreground mt-2">Here's your real progress today.</p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Today's metrics">
        <StatCard icon={<Timer className="h-5 w-5" />} label="Focus minutes" value={focusMinutes} />
        <StatCard icon={<ListChecks className="h-5 w-5" />} label="Sessions" value={sessionCount} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Tasks done" value={completedTasks} />
        <StatCard icon={<CalendarClock className="h-5 w-5" />} label="Deadlines (7d)" value={upcoming.length} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent sessions</CardTitle>
            <Button asChild size="sm" className="bg-accent hover:bg-accent/90">
              <Link to="/focus">Start focus</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState text="No sessions yet. Start your first Pomodoro." />
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((s) => {
                  const t = tasks.find((x) => x.id === s.taskId);
                  return (
                    <li key={s.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t?.title ?? "Untitled session"}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(s.durationSec / 60)} min · {s.mode} · {format(new Date(s.completedAt), "MMM d, HH:mm")}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground capitalize">
                        {s.mode}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-lg">Upcoming deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState text="No deadlines in the next 7 days." />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((t) => (
                  <li key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(t.deadline!), "EEE, MMM d HH:mm")}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground capitalize">
                      {t.priority}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="bg-surface border-border">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs uppercase tracking-wider">{label}</span>
        </div>
        <p className="mt-3 text-3xl font-bold font-display tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center text-sm text-muted-foreground py-10 border border-dashed border-border rounded-lg">
      {text}
    </div>
  );
}
