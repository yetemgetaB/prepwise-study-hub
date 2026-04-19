export type TimerMode = "work" | "short" | "long";
export type TaskStatus = "pending" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";
export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  startTime?: string; // HH:MM
  endTime?: string;
  status: TaskStatus;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  status: TaskStatus;
  priority: Priority;
  courseId?: string;
  manualOverride?: boolean;
  deadline?: string; // ISO
}

export interface FocusSession {
  id: string;
  taskId?: string;
  mode: TimerMode;
  durationSec: number;
  completedAt: string; // ISO
}

export interface Course {
  id: string;
  name: string;
  code?: string;
  credits?: number;
  instructor?: string;
  color: string; // hex
}

export interface ScheduleEntry {
  id: string;
  day: Day;
  startPeriod: number; // 1..N
  duration: number; // periods
  courseId?: string;
  className: string;
  instructor?: string;
  room?: string;
  color: string;
}

export type NavAlignment = "left" | "center" | "right";

export interface Settings {
  uiScale: number;            // 0.85 - 1.25
  navAlignment: NavAlignment;
  floatingNav: boolean;
  showNavLabels: boolean;
  themeMode: "dark";
  workMin: number;
  shortMin: number;
  longMin: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
}

export interface TimerState {
  mode: TimerMode;
  isRunning: boolean;
  startedAt: number | null;   // epoch ms when started
  elapsedBeforeStart: number; // seconds accumulated while paused
  taskId?: string;
  cycleCount: number;
}
