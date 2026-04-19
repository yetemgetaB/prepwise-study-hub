import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { aiAssist } from "@/server/ai.functions";
import { useAppStore } from "@/store/useAppStore";
import { todayISO, addMinutesToTime } from "@/lib/time";

interface DraftTask {
  title: string;
  priority: "low" | "medium" | "high";
  suggestedMinutes: number;
  subtasks: string[];
}

export function AIAssistantDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DraftTask[] | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const addTask = useAppStore((s) => s.addTask);
  const addSubtask = useAppStore((s) => s.addSubtask);

  const generate = async () => {
    if (!intent.trim()) return;
    setLoading(true);
    try {
      const res = await aiAssist({ data: { kind: "plan", input: intent } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDraft(res.data.tasks as DraftTask[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reach AI service.");
    } finally {
      setLoading(false);
    }
  };

  const commit = () => {
    if (!draft) return;
    const today = todayISO();
    let cursor = startTime;
    draft.forEach((d) => {
      const end = addMinutesToTime(cursor, d.suggestedMinutes);
      const t = addTask({
        title: d.title,
        date: today,
        priority: d.priority,
        startTime: cursor,
        endTime: end,
      });
      d.subtasks.forEach((s) => addSubtask(t.id, s));
      cursor = end;
    });
    toast.success(`${draft.length} tasks added to today's plan.`);
    setDraft(null);
    setIntent("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setDraft(null); } onOpenChange(o); }}>
      <DialogContent className="bg-surface border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> AI Planner Assistant
          </DialogTitle>
        </DialogHeader>

        {!draft ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Describe what you want to study today in plain English. Review the draft before saving.
            </p>
            <Textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. Prep for Calculus midterm — focus on integration techniques. Also review chapter 4 of Algorithms."
              rows={5}
              className="bg-surface-elevated border-border"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Start at</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-32 bg-surface-elevated border-border"
              />
            </div>
            <ul className="space-y-2 max-h-80 overflow-auto">
              {draft.map((d, i) => (
                <li key={i} className="rounded-lg border border-border bg-surface-elevated p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={d.title}
                      onChange={(e) => {
                        const c = [...draft]; c[i] = { ...d, title: e.target.value }; setDraft(c);
                      }}
                      className="bg-transparent border-0 px-0 font-medium focus-visible:ring-0"
                    />
                    <Input
                      type="number"
                      value={d.suggestedMinutes}
                      onChange={(e) => {
                        const c = [...draft]; c[i] = { ...d, suggestedMinutes: Number(e.target.value) }; setDraft(c);
                      }}
                      className="w-20 bg-surface border-border text-sm"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                  {d.subtasks.length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-xs text-muted-foreground space-y-1">
                      {d.subtasks.map((s, j) => <li key={j}>{s}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          {!draft ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={generate} disabled={loading || !intent.trim()} className="bg-accent hover:bg-accent/90">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</> : <><Sparkles className="h-4 w-4" /> Generate plan</>}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setDraft(null)}>Back</Button>
              <Button onClick={commit} className="bg-success hover:bg-success/90 text-background">
                Add {draft.length} tasks
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
