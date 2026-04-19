import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { DAYS, type Day, type ScheduleEntry } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { aiAssist } from "@/server/ai.functions";
import { COURSE_PALETTE, pickCourseColor, readableTextOn } from "@/lib/colors";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
});

const PERIODS = 12; // 08:00 - 20:00
const periodLabel = (p: number) => `${String(7 + p).padStart(2, "0")}:00`;

function SchedulePage() {
  const schedule = useAppStore((s) => s.schedule);
  const courses = useAppStore((s) => s.courses);
  const updateEntry = useAppStore((s) => s.updateScheduleEntry);
  const deleteEntry = useAppStore((s) => s.deleteScheduleEntry);
  const addEntry = useAppStore((s) => s.addScheduleEntry);
  const bulkAdd = useAppStore((s) => s.bulkAddSchedule);

  const [editing, setEditing] = useState<ScheduleEntry | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const handleCellClick = (day: Day, period: number) => {
    const existing = schedule.find(
      (e) => e.day === day && period >= e.startPeriod && period < e.startPeriod + e.duration,
    );
    if (existing) setEditing(existing);
    else {
      addEntry({
        day, startPeriod: period, duration: 1,
        className: "New class", color: pickCourseColor(schedule.map((s) => s.color)),
      });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Weekly schedule</h1>
          <p className="text-muted-foreground mt-2">Click a cell to add or edit a class.</p>
        </div>
        <Button onClick={() => setAiOpen(true)} className="bg-accent hover:bg-accent/90">
          <Sparkles className="h-4 w-4" /> AI Import
        </Button>
      </header>

      <Card className="bg-surface border-border overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <div
            className="grid min-w-[700px]"
            style={{ gridTemplateColumns: `64px repeat(${DAYS.length}, minmax(110px, 1fr))` }}
          >
            <div />
            {DAYS.map((d) => (
              <div key={d} className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                {d}
              </div>
            ))}

            {Array.from({ length: PERIODS }).map((_, idx) => {
              const period = idx + 1;
              return (
                <div key={period} className="contents">
                  <div className="px-2 py-3 text-xs text-muted-foreground border-b border-border">
                    {periodLabel(period)}
                  </div>
                  {DAYS.map((day) => {
                    const entry = schedule.find(
                      (e) => e.day === day && e.startPeriod === period,
                    );
                    const covered = schedule.find(
                      (e) => e.day === day && period > e.startPeriod && period < e.startPeriod + e.duration,
                    );
                    if (covered) return <div key={day + period} />;
                    return (
                      <button
                        key={day + period}
                        onClick={() => handleCellClick(day, period)}
                        className="border-b border-l border-border hover:bg-surface-elevated/60 transition-colors text-left p-1 min-h-[64px]"
                        style={entry ? { gridRow: `span ${entry.duration}` } : undefined}
                      >
                        {entry && (
                          <div
                            className="h-full rounded-md p-2 text-xs font-medium"
                            style={{ backgroundColor: entry.color, color: readableTextOn(entry.color) }}
                          >
                            <p className="font-semibold truncate">{entry.className}</p>
                            {entry.room && <p className="opacity-80 truncate">{entry.room}</p>}
                            {entry.instructor && <p className="opacity-70 text-[10px] truncate">{entry.instructor}</p>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {editing && (
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="bg-surface border-border">
            <DialogHeader>
              <DialogTitle>Edit class</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Class name</label>
                <Input value={editing.className} onChange={(e) => setEditing({ ...editing, className: e.target.value })} className="bg-surface-elevated border-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Instructor</label>
                  <Input value={editing.instructor ?? ""} onChange={(e) => setEditing({ ...editing, instructor: e.target.value })} className="bg-surface-elevated border-border" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Room</label>
                  <Input value={editing.room ?? ""} onChange={(e) => setEditing({ ...editing, room: e.target.value })} className="bg-surface-elevated border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Duration (periods)</label>
                  <Input type="number" min={1} max={6} value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: Math.max(1, Number(e.target.value)) })} className="bg-surface-elevated border-border" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Course link</label>
                  <select
                    value={editing.courseId ?? ""}
                    onChange={(e) => {
                      const cid = e.target.value || undefined;
                      const course = courses.find((c) => c.id === cid);
                      setEditing({ ...editing, courseId: cid, color: course?.color ?? editing.color });
                    }}
                    className="w-full bg-surface-elevated border border-border rounded px-2 py-2 text-sm"
                  >
                    <option value="">— none —</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COURSE_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditing({ ...editing, color: c })}
                      className="h-7 w-7 rounded-md border-2"
                      style={{ backgroundColor: c, borderColor: editing.color === c ? "#F8FAFC" : "transparent" }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="destructive" onClick={() => { deleteEntry(editing.id); setEditing(null); }}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              <Button onClick={() => { updateEntry(editing.id, editing); setEditing(null); }} className="bg-accent hover:bg-accent/90">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AIScheduleImport open={aiOpen} onOpenChange={setAiOpen} onImport={bulkAdd} existing={schedule} />
    </div>
  );
}

function AIScheduleImport({
  open, onOpenChange, onImport, existing,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onImport: (entries: Omit<ScheduleEntry, "id">[]) => void;
  existing: ScheduleEntry[];
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Omit<ScheduleEntry, "id">[] | null>(null);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await aiAssist({ data: { kind: "schedule", input: text } });
      if (!res.ok) { toast.error(res.error); return; }
      const used = existing.map((e) => e.color);
      const entries = (res.data.entries as Array<Omit<ScheduleEntry, "id" | "color">>).map((e) => {
        const color = pickCourseColor(used);
        used.push(color);
        return { ...e, color } as Omit<ScheduleEntry, "id">;
      });
      setDraft(entries);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally { setLoading(false); }
  };

  const commit = () => {
    if (!draft) return;
    onImport(draft);
    toast.success(`${draft.length} classes imported.`);
    setDraft(null); setText(""); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setDraft(null); onOpenChange(o); }}>
      <DialogContent className="bg-surface border-border max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" /> Import from text</DialogTitle></DialogHeader>
        {!draft ? (
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Paste your schedule, e.g. Mon 09-11 Calculus, Wed 14-16 Algorithms (Room A203)…" className="bg-surface-elevated border-border" />
        ) : (
          <ul className="space-y-2 max-h-80 overflow-auto">
            {draft.map((e, i) => (
              <li key={i} className="rounded border border-border bg-surface-elevated p-2 text-sm flex items-center gap-3">
                <span className="h-5 w-5 rounded" style={{ backgroundColor: e.color }} />
                <strong>{e.day}</strong> {periodLabel(e.startPeriod)}–{periodLabel(e.startPeriod + e.duration)} · {e.className}
                {e.room && <span className="text-muted-foreground">· {e.room}</span>}
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          {!draft ? (
            <Button onClick={run} disabled={loading || !text.trim()} className="bg-accent hover:bg-accent/90">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Parsing…</> : <><Plus className="h-4 w-4" /> Generate</>}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setDraft(null)}>Back</Button>
              <Button onClick={commit} className="bg-success hover:bg-success/90 text-background">Import {draft.length}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
