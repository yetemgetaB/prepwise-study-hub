import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Sparkles, Download, Trash2, Loader2 } from "lucide-react";
import { COURSE_PALETTE, pickCourseColor, readableTextOn } from "@/lib/colors";
import { downloadBlob, toCSV, printPDF } from "@/lib/export";
import { toast } from "sonner";
import { aiAssist } from "@/server/ai.functions";
import type { Course } from "@/types";

export const Route = createFileRoute("/curriculum")({
  component: CurriculumPage,
});

function CurriculumPage() {
  const courses = useAppStore((s) => s.courses);
  const addCourse = useAppStore((s) => s.addCourse);
  const updateCourse = useAppStore((s) => s.updateCourse);
  const deleteCourse = useAppStore((s) => s.deleteCourse);
  const upsertCourses = useAppStore((s) => s.upsertCourses);

  const [aiOpen, setAiOpen] = useState(false);

  const onAdd = () => {
    addCourse({
      name: "New course",
      credits: 3,
      color: pickCourseColor(courses.map((c) => c.color)),
    });
  };

  const exportJSON = () => downloadBlob("prepwise-curriculum.json", JSON.stringify(courses, null, 2), "application/json");
  const exportCSV = () => downloadBlob("prepwise-curriculum.csv", toCSV(courses as unknown as Record<string, unknown>[]), "text/csv");
  const exportPDF = () => printPDF("Prepwise — Curriculum");

  const totalCredits = courses.reduce((s, c) => s + (c.credits ?? 0), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Curriculum</h1>
          <p className="text-muted-foreground mt-2">{courses.length} courses · {totalCredits} credits</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="secondary" onClick={onAdd}><Plus className="h-4 w-4" /> Add</Button>
          <Button onClick={() => setAiOpen(true)} className="bg-accent hover:bg-accent/90"><Sparkles className="h-4 w-4" /> AI Import</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="h-4 w-4" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-surface-elevated border-border">
              <DropdownMenuItem onClick={exportJSON}>JSON</DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF}>Print / PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Card className="bg-surface border-border">
        <CardContent className="p-0">
          {courses.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">No courses yet. Add one or use AI Import.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left p-3">Color</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Credits</th>
                  <th className="text-left p-3">Instructor</th>
                  <th className="p-3 no-print" />
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 rounded-md border border-border" style={{ backgroundColor: c.color, color: readableTextOn(c.color) }} aria-label="Pick color" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-surface-elevated border-border p-2">
                          <div className="grid grid-cols-6 gap-2 w-48">
                            {COURSE_PALETTE.map((p) => (
                              <button key={p} type="button" onClick={() => updateCourse(c.id, { color: p })} className="h-6 w-6 rounded" style={{ backgroundColor: p }} aria-label={p} />
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="p-3"><Input value={c.name} onChange={(e) => updateCourse(c.id, { name: e.target.value })} className="bg-transparent border-0 px-0 focus-visible:ring-0" /></td>
                    <td className="p-3"><Input value={c.code ?? ""} onChange={(e) => updateCourse(c.id, { code: e.target.value })} className="bg-transparent border-0 px-0 focus-visible:ring-0 w-24" /></td>
                    <td className="p-3"><Input type="number" value={c.credits ?? 0} onChange={(e) => updateCourse(c.id, { credits: Number(e.target.value) })} className="bg-transparent border-0 px-0 focus-visible:ring-0 w-16" /></td>
                    <td className="p-3"><Input value={c.instructor ?? ""} onChange={(e) => updateCourse(c.id, { instructor: e.target.value })} className="bg-transparent border-0 px-0 focus-visible:ring-0" /></td>
                    <td className="p-3 no-print text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteCourse(c.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <AICurriculumImport open={aiOpen} onOpenChange={setAiOpen} existing={courses} onImport={upsertCourses} />
    </div>
  );
}

function AICurriculumImport({
  open, onOpenChange, existing, onImport,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  existing: Course[];
  onImport: (cs: Course[]) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Course[] | null>(null);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await aiAssist({ data: { kind: "curriculum", input: text } });
      if (!res.ok) { toast.error(res.error); return; }
      const used = existing.map((c) => c.color);
      const courses = (res.data.courses as Array<Omit<Course, "id" | "color">>).map((c) => {
        const color = pickCourseColor(used); used.push(color);
        return { ...c, id: crypto.randomUUID(), color } as Course;
      });
      setDraft(courses);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally { setLoading(false); }
  };

  const commit = () => {
    if (!draft) return;
    onImport(draft);
    toast.success(`${draft.length} courses imported.`);
    setDraft(null); setText(""); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setDraft(null); onOpenChange(o); }}>
      <DialogContent className="bg-surface border-border max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" /> Import courses</DialogTitle></DialogHeader>
        {!draft ? (
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Paste your course list, syllabus block, or registration sheet…" className="bg-surface-elevated border-border" />
        ) : (
          <ul className="space-y-2 max-h-80 overflow-auto">
            {draft.map((c, i) => (
              <li key={c.id} className="rounded border border-border bg-surface-elevated p-3 flex items-center gap-3">
                <button className="h-6 w-6 rounded shrink-0" style={{ backgroundColor: c.color }} onClick={() => {
                  const idx = COURSE_PALETTE.indexOf(c.color);
                  const next = COURSE_PALETTE[(idx + 1) % COURSE_PALETTE.length];
                  const cp = [...draft]; cp[i] = { ...c, color: next }; setDraft(cp);
                }} aria-label="Cycle color" />
                <Input value={c.name} onChange={(e) => { const cp = [...draft]; cp[i] = { ...c, name: e.target.value }; setDraft(cp); }} className="bg-transparent border-0 px-0 focus-visible:ring-0 font-medium" />
                <Input value={c.code ?? ""} onChange={(e) => { const cp = [...draft]; cp[i] = { ...c, code: e.target.value }; setDraft(cp); }} className="w-24 bg-surface border-border text-xs" />
                <Input type="number" value={c.credits ?? 0} onChange={(e) => { const cp = [...draft]; cp[i] = { ...c, credits: Number(e.target.value) }; setDraft(cp); }} className="w-16 bg-surface border-border text-xs" />
                <button onClick={() => setDraft(draft.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-danger" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          {!draft ? (
            <Button onClick={run} disabled={loading || !text.trim()} className="bg-accent hover:bg-accent/90">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Parsing…</> : <>Generate</>}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setDraft(null)}>Back</Button>
              <Button onClick={commit} className="bg-success hover:bg-success/90 text-background">Save {draft.length}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
