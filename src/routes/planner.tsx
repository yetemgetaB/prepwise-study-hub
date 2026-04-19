import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { todayISO, addMinutesToTime } from "@/lib/time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Trash2, GripVertical, Check } from "lucide-react";
import { AIAssistantDialog } from "@/components/planner/AIAssistantDialog";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planner")({
  component: Planner,
});

function Planner() {
  const tasks = useAppStore((s) => s.tasks);
  const subtasks = useAppStore((s) => s.subtasks);
  const courses = useAppStore((s) => s.courses);
  const addTask = useAppStore((s) => s.addTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const reorderTasks = useAppStore((s) => s.reorderTasks);
  const recalc = useAppStore((s) => s.recalcTaskTimes);
  const addSubtask = useAppStore((s) => s.addSubtask);
  const updateSubtask = useAppStore((s) => s.updateSubtask);
  const deleteSubtask = useAppStore((s) => s.deleteSubtask);

  const [aiOpen, setAiOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const today = todayISO();
  const todayTasks = tasks.filter((t) => t.date === today);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = todayTasks.findIndex((t) => t.id === active.id);
    const newIndex = todayTasks.findIndex((t) => t.id === over.id);
    const ids = arrayMove(todayTasks, oldIndex, newIndex).map((t) => t.id);
    reorderTasks(today, ids);
    recalc(today);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const last = todayTasks[todayTasks.length - 1];
    const start = last?.endTime ?? "09:00";
    addTask({
      title: newTitle.trim(),
      date: today,
      priority: "medium",
      startTime: start,
      endTime: addMinutesToTime(start, 30),
    });
    setNewTitle("");
  };

  const completed = todayTasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Today's plan</h1>
          <p className="text-muted-foreground mt-2">
            {completed} of {todayTasks.length} done · drag to reorder, times auto-recalculate.
          </p>
        </div>
        <Button onClick={() => setAiOpen(true)} className="bg-accent hover:bg-accent/90">
          <Sparkles className="h-4 w-4" /> AI Assistant
        </Button>
      </header>

      <Card className="bg-surface border-border">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Add a task for today…"
              className="bg-surface-elevated border-border"
            />
            <Button onClick={handleAdd} disabled={!newTitle.trim()}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {todayTasks.length === 0 ? (
        <Card className="bg-surface border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            No tasks for today yet. Add one above or use the AI Assistant.
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={todayTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {todayTasks.map((t) => (
                <SortableTaskItem
                  key={t.id}
                  task={t}
                  subtasks={subtasks.filter((s) => s.taskId === t.id)}
                  course={courses.find((c) => c.id === t.courseId)}
                  onUpdate={(patch) => updateTask(t.id, patch)}
                  onDelete={() => deleteTask(t.id)}
                  onAddSub={(title) => addSubtask(t.id, title)}
                  onUpdateSub={updateSubtask}
                  onDeleteSub={deleteSubtask}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {todayTasks.length > 0 && (
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-lg">End of day summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Planned: <strong className="text-foreground">{todayTasks.length}</strong> ·
              {" "}Completed: <strong className="text-success">{completed}</strong> ·
              {" "}Carry over: <strong className="text-warning">{todayTasks.length - completed}</strong>
            </p>
            <div className="mt-3">
              <Button asChild size="sm" variant="secondary">
                <Link to="/focus">Start a focus session →</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AIAssistantDialog open={aiOpen} onOpenChange={setAiOpen} />
    </div>
  );
}

function SortableTaskItem({
  task, subtasks, course, onUpdate, onDelete, onAddSub, onUpdateSub, onDeleteSub,
}: {
  task: Task;
  subtasks: { id: string; title: string; status: string }[];
  course?: { name: string; color: string };
  onUpdate: (p: Partial<Task>) => void;
  onDelete: () => void;
  onAddSub: (title: string) => void;
  onUpdateSub: (id: string, p: { status?: "done" | "pending" | "in_progress"; title?: string }) => void;
  onDeleteSub: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [subTitle, setSubTitle] = useState("");
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-border bg-surface p-4",
        isDragging && "opacity-60",
        task.status === "done" && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => onUpdate({ status: task.status === "done" ? "pending" : "done" })}
          className={cn(
            "mt-1 h-5 w-5 rounded-md border border-border flex items-center justify-center",
            task.status === "done" ? "bg-success border-success" : "bg-surface-elevated",
          )}
          aria-label="Toggle complete"
        >
          {task.status === "done" && <Check className="h-3 w-3 text-background" />}
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <Input
            value={task.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="bg-transparent border-0 px-0 text-base font-medium focus-visible:ring-0"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="time"
              value={task.startTime ?? ""}
              onChange={(e) => onUpdate({ startTime: e.target.value, manualOverride: true })}
              className="bg-surface-elevated border border-border rounded px-2 py-1"
              aria-label="Start time"
            />
            <span className="text-muted-foreground">→</span>
            <input
              type="time"
              value={task.endTime ?? ""}
              onChange={(e) => onUpdate({ endTime: e.target.value, manualOverride: true })}
              className="bg-surface-elevated border border-border rounded px-2 py-1"
              aria-label="End time"
            />
            <select
              value={task.priority}
              onChange={(e) => onUpdate({ priority: e.target.value as never })}
              className="bg-surface-elevated border border-border rounded px-2 py-1"
              aria-label="Priority"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            {course && (
              <Badge style={{ backgroundColor: course.color, color: "#F8FAFC" }}>
                {course.name}
              </Badge>
            )}
          </div>

          {subtasks.length > 0 && (
            <ul className="space-y-1 pt-2">
              {subtasks.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => onUpdateSub(s.id, { status: s.status === "done" ? "pending" : "done" })}
                    className={cn(
                      "h-4 w-4 rounded border border-border flex items-center justify-center",
                      s.status === "done" ? "bg-success border-success" : "bg-surface-elevated",
                    )}
                    aria-label="Toggle subtask"
                  >
                    {s.status === "done" && <Check className="h-2.5 w-2.5 text-background" />}
                  </button>
                  <span className={cn("flex-1", s.status === "done" && "line-through text-muted-foreground")}>{s.title}</span>
                  <button onClick={() => onDeleteSub(s.id)} className="text-muted-foreground hover:text-danger" aria-label="Remove subtask">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 pt-1">
            <Input
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && subTitle.trim()) {
                  onAddSub(subTitle.trim());
                  setSubTitle("");
                }
              }}
              placeholder="Add subtask…"
              className="h-8 bg-surface-elevated border-border text-sm"
            />
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete task">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
