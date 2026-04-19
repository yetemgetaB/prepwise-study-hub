# Prepwise — V1 Build Plan

A focused study execution app for university students: Plan → Focus → Track, all in one loop.

## Visual Direction

- **Palette**: Custom dark — bg `#000000`, surface `#0B1220`, elevated `#111827`, border `#1F2937`, primary `#1D417B`, accent `#2563EB`, text `#F8FAFC`/`#94A3B8`, semantic success/warning/danger.
- **Typography**: Urbanist (headings) + Epilogue (body) via Google Fonts.
- **Feel**: Calm, focused, dark-first. No clutter, no fake stats, generous spacing.

## Project Structure

```
src/
  routes/
    __root.tsx              # Shell + global timer provider + nav
    index.tsx               # Dashboard
    planner.tsx             # Today's plan + AI assistant
    focus.tsx               # Pomodoro
    schedule.tsx            # Weekly class grid
    curriculum.tsx          # Courses + export
    settings.tsx
  components/
    nav/AppNav.tsx          # Floating/aligned nav with label toggle
    planner/                # TaskList, TaskItem, SubtaskRow, AIAssistantDialog
    focus/                  # TimerDisplay, ModeTabs, TaskPicker
    schedule/               # WeeklyGrid, ClassCell, ImportDialog
    curriculum/             # CourseTable, ExportMenu
    dashboard/              # StatCard, UpcomingDeadlines
    ui/                     # shadcn primitives
  store/
    useAppStore.ts          # Zustand + persist (single source of truth)
    selectors.ts            # Computed metrics
  lib/
    time.ts, export.ts (CSV/JSON/PDF), dnd.ts, ai.ts (gateway client)
  types/index.ts            # All data model types
```

## Data Model (typed, persisted to localStorage via Zustand)

- `UserProfile`, `Settings` (uiScale, navAlignment, floatingNav, showNavLabels, themeMode)
- `Course`, `ScheduleEntry` (day, startPeriod, duration → multi-row span)
- `Task` + `Subtask` (with startTime/endTime, status, priority, courseId)
- `FocusSession` (taskId, mode, durationSec, completedAt) — drives ALL dashboard metrics

## Key Logic

- **Global Pomodoro**: timer state lives in the Zustand store with a single `setInterval` started in `__root.tsx`. Persists across route changes; survives reloads using `startedAt` timestamps. Modes: work / short break / long break with configurable lengths.
- **Session → Progress**: completing a work session appends a `FocusSession`, increments task focus minutes, and re-renders dashboard via selectors.
- **Planner DnD**: `@dnd-kit` for task/subtask reorder with auto time-block recalculation; manual edits override and lock that block.
- **Schedule**: CSS grid, `gridRow: span duration` for multi-period classes — visually correct overlaps and spans.
- **AI Planner Assistant**: Lovable AI Gateway via edge function (`google/gemini-3-flash-preview`) with structured tool-calling → returns `{ tasks: [{title, subtasks, suggestedMinutes}] }`. User reviews in a dialog and confirms before commit.
- **AI Schedule Import**: same gateway, parses pasted text → `ScheduleEntry[]` preview → confirm.
- **Exports**: JSON (blob), CSV (papaparse-style join), PDF (print-friendly route opened in `window.print()`).

## Screens

1. **Dashboard** — 4 real metric cards (focus min today, sessions, tasks done, deadlines ≤7d), recent sessions list, "Start focus" CTA.
2. **Planner** — Today's tasks with subtasks, inline time editing, drag handles, AI Assistant button, end-of-day "Planned vs Completed" summary with carry-over.
3. **Focus** — Single big timer, mode tabs, task picker (linked to planner), start/pause/reset/skip — all keyboard accessible.
4. **Schedule** — 7-day × N-period grid, click cell to add/edit class (name, instructor, room, color), AI text import dialog.
5. **Curriculum** — Course table with credits + instructor + color, export menu (JSON / CSV / PDF).
6. **Settings** — Profile name, UI scale slider (CSS var on `<html>`), nav alignment radio, floating toggle, label toggle.

## UX Guarantees

- Loading + error toasts on every async (AI calls)
- Modal focus trap via Radix Dialog
- All controls keyboard reachable, visible focus rings
- AA contrast on the chosen palette
- No placeholder/fake data anywhere — empty states say "No sessions yet"

## Out of Scope (V1)

Calculator, math engine, custom icon uploads, top-level chatbot.

## Acceptance Checks Built-In

- TS strict passes
- Planner → Focus → Dashboard loop wired through one store
- Timer interval lives above route outlets → survives nav
- Schedule uses `gridRow: span` for multi-period correctness
- AI returns editable draft before commit
- Export buttons produce real downloadable files

&nbsp;

## Add-On: AI Curriculum Import + Auto Color Coding (V1)  
  
- Add an **AI Import** action in the Curriculum screen.  
- User can paste plain text (course list, syllabus block, registration sheet, or timetable notes).  
- Use Lovable AI Gateway to parse input into structured `Course[]` draft:  
  - `name`  
  - `code` (if available)  
  - `credits` (if available)  
  - `instructor` (if available)  
  - `color`  
- Apply automatic, readable color coding:  
  - Assign distinct colors from a fixed accessible palette.  
  - Avoid duplicate colors for adjacent/related courses when possible.  
  - Ensure text contrast is AA-safe on selected chip/background color.  
- Show a **review dialog** before save:  
  - Editable fields for every course.  
  - Color picker override per course.  
  - Remove/merge duplicates before commit.  
- On confirm, write to store and immediately sync colors to:  
  - Curriculum table  
  - Planner course badges  
  - Schedule class blocks (if mapped by courseId)  
- Error handling:  
  - If AI parse fails, show retry + “manual add” fallback.  
  - Never overwrite existing courses without explicit user confirmation.  
  
### Acceptance Criteria  
- AI import creates editable curriculum draft from plain English text.  
- Every imported course receives a valid, contrast-safe color.  
- User can override any color before saving.  
- Saved colors are reused consistently across Curriculum, Planner, and Schedule.