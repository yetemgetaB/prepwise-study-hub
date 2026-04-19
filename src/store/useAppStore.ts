import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Course, FocusSession, ScheduleEntry, Settings, Subtask, Task, TimerState, UserProfile,
} from "@/types";
import { uid, todayISO } from "@/lib/time";

interface AppState {
  profile: UserProfile;
  settings: Settings;
  courses: Course[];
  schedule: ScheduleEntry[];
  tasks: Task[];
  subtasks: Subtask[];
  sessions: FocusSession[];
  timer: TimerState;

  // profile / settings
  setDisplayName: (n: string) => void;
  updateSettings: (s: Partial<Settings>) => void;

  // courses
  addCourse: (c: Omit<Course, "id">) => Course;
  upsertCourses: (cs: Course[]) => void;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string) => void;

  // schedule
  addScheduleEntry: (e: Omit<ScheduleEntry, "id">) => void;
  updateScheduleEntry: (id: string, patch: Partial<ScheduleEntry>) => void;
  deleteScheduleEntry: (id: string) => void;
  bulkAddSchedule: (entries: Omit<ScheduleEntry, "id">[]) => void;

  // tasks
  addTask: (t: Omit<Task, "id" | "status"> & { status?: Task["status"] }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (date: string, ids: string[]) => void;
  recalcTaskTimes: (date: string, startAt?: string) => void;

  // subtasks
  addSubtask: (taskId: string, title: string) => void;
  updateSubtask: (id: string, patch: Partial<Subtask>) => void;
  deleteSubtask: (id: string) => void;

  // sessions
  recordSession: (s: Omit<FocusSession, "id" | "completedAt">) => void;

  // timer
  startTimer: (taskId?: string) => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipTimer: () => void;
  setTimerMode: (m: TimerState["mode"]) => void;
  setTimerTask: (taskId?: string) => void;
  tickComplete: () => void; // called when target reached
}

const defaultSettings: Settings = {
  uiScale: 1,
  navAlignment: "center",
  floatingNav: true,
  showNavLabels: true,
  themeMode: "dark",
  workMin: 25,
  shortMin: 5,
  longMin: 15,
};

const defaultTimer: TimerState = {
  mode: "work",
  isRunning: false,
  startedAt: null,
  elapsedBeforeStart: 0,
  taskId: undefined,
  cycleCount: 0,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: { id: "local", displayName: "Student" },
      settings: defaultSettings,
      courses: [],
      schedule: [],
      tasks: [],
      subtasks: [],
      sessions: [],
      timer: defaultTimer,

      setDisplayName: (n) => set((s) => ({ profile: { ...s.profile, displayName: n } })),
      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),

      addCourse: (c) => {
        const course = { ...c, id: uid() };
        set((s) => ({ courses: [...s.courses, course] }));
        return course;
      },
      upsertCourses: (cs) => set((s) => {
        const map = new Map(s.courses.map((c) => [c.id, c]));
        cs.forEach((c) => map.set(c.id, c));
        return { courses: Array.from(map.values()) };
      }),
      updateCourse: (id, patch) =>
        set((s) => ({ courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCourse: (id) => set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),

      addScheduleEntry: (e) => set((s) => ({ schedule: [...s.schedule, { ...e, id: uid() }] })),
      updateScheduleEntry: (id, patch) =>
        set((s) => ({ schedule: s.schedule.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteScheduleEntry: (id) =>
        set((s) => ({ schedule: s.schedule.filter((e) => e.id !== id) })),
      bulkAddSchedule: (entries) =>
        set((s) => ({ schedule: [...s.schedule, ...entries.map((e) => ({ ...e, id: uid() }))] })),

      addTask: (t) => {
        const task: Task = { status: "pending", ...t, id: uid() };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return task;
      },
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          subtasks: s.subtasks.filter((st) => st.taskId !== id),
        })),
      reorderTasks: (date, ids) =>
        set((s) => {
          const dayTasks = ids
            .map((id) => s.tasks.find((t) => t.id === id))
            .filter(Boolean) as Task[];
          const others = s.tasks.filter((t) => t.date !== date);
          return { tasks: [...others, ...dayTasks] };
        }),
      recalcTaskTimes: (date, startAt = "09:00") => {
        const s = get();
        const dayTasks = s.tasks.filter((t) => t.date === date);
        let cursor = startAt;
        const updated = dayTasks.map((t) => {
          if (t.manualOverride && t.startTime && t.endTime) {
            cursor = t.endTime;
            return t;
          }
          const dur = t.startTime && t.endTime
            ? Math.max(15, minutesBetween(t.startTime, t.endTime))
            : 30;
          const start = cursor;
          const end = addMin(start, dur);
          cursor = end;
          return { ...t, startTime: start, endTime: end };
        });
        const others = s.tasks.filter((t) => t.date !== date);
        set({ tasks: [...others, ...updated] });
      },

      addSubtask: (taskId, title) =>
        set((s) => ({ subtasks: [...s.subtasks, { id: uid(), taskId, title, status: "pending" }] })),
      updateSubtask: (id, patch) =>
        set((s) => ({ subtasks: s.subtasks.map((st) => (st.id === id ? { ...st, ...patch } : st)) })),
      deleteSubtask: (id) => set((s) => ({ subtasks: s.subtasks.filter((st) => st.id !== id) })),

      recordSession: (sess) =>
        set((s) => ({
          sessions: [
            ...s.sessions,
            { ...sess, id: uid(), completedAt: new Date().toISOString() },
          ],
        })),

      startTimer: (taskId) =>
        set((s) => ({
          timer: {
            ...s.timer,
            isRunning: true,
            startedAt: Date.now(),
            taskId: taskId ?? s.timer.taskId,
          },
        })),
      pauseTimer: () =>
        set((s) => {
          if (!s.timer.isRunning || !s.timer.startedAt) return {};
          const elapsed = s.timer.elapsedBeforeStart + Math.floor((Date.now() - s.timer.startedAt) / 1000);
          return { timer: { ...s.timer, isRunning: false, startedAt: null, elapsedBeforeStart: elapsed } };
        }),
      resetTimer: () =>
        set((s) => ({
          timer: { ...s.timer, isRunning: false, startedAt: null, elapsedBeforeStart: 0 },
        })),
      skipTimer: () =>
        set((s) => {
          const next = nextMode(s.timer.mode, s.timer.cycleCount);
          return {
            timer: {
              ...s.timer,
              mode: next.mode,
              cycleCount: next.cycle,
              isRunning: false,
              startedAt: null,
              elapsedBeforeStart: 0,
            },
          };
        }),
      setTimerMode: (m) =>
        set((s) => ({
          timer: { ...s.timer, mode: m, isRunning: false, startedAt: null, elapsedBeforeStart: 0 },
        })),
      setTimerTask: (taskId) => set((s) => ({ timer: { ...s.timer, taskId } })),

      tickComplete: () => {
        const s = get();
        const target = targetSec(s.timer.mode, s.settings);
        // record session
        get().recordSession({
          mode: s.timer.mode,
          durationSec: target,
          taskId: s.timer.taskId,
        });
        const next = nextMode(s.timer.mode, s.timer.cycleCount);
        set({
          timer: {
            ...s.timer,
            mode: next.mode,
            cycleCount: next.cycle,
            isRunning: false,
            startedAt: null,
            elapsedBeforeStart: 0,
          },
        });
      },
    }),
    {
      name: "prepwise-store-v1",
    },
  ),
);

// helpers
function minutesBetween(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return Math.max(0, bh * 60 + bm - (ah * 60 + am));
}
function addMin(t: string, m: number) {
  const [h, mm] = t.split(":").map(Number);
  const total = h * 60 + mm + m;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function nextMode(mode: TimerState["mode"], cycle: number): { mode: TimerState["mode"]; cycle: number } {
  if (mode === "work") {
    const newCycle = cycle + 1;
    return { mode: newCycle % 4 === 0 ? "long" : "short", cycle: newCycle };
  }
  return { mode: "work", cycle };
}
export function targetSec(mode: TimerState["mode"], settings: Settings): number {
  if (mode === "work") return settings.workMin * 60;
  if (mode === "short") return settings.shortMin * 60;
  return settings.longMin * 60;
}

export function currentElapsedSec(timer: TimerState): number {
  if (!timer.isRunning || !timer.startedAt) return timer.elapsedBeforeStart;
  return timer.elapsedBeforeStart + Math.floor((Date.now() - timer.startedAt) / 1000);
}

export function todaysTasks(tasks: Task[]): Task[] {
  const t = todayISO();
  return tasks.filter((x) => x.date === t);
}
