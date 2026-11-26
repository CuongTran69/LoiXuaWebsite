import { dayNumberForDate } from './daily-picker';

export interface StreakState {
  lastDay: number | null;
  current: number;
  best: number;
  recentDays: number[];
}

export interface StreakSnapshot {
  current: number;
  best: number;
  week: boolean[];
}

export interface DailyTasksState {
  dayNumber: number;
  hasReadDaily: boolean;
  hasCompletedDailyQuiz: boolean;
  hasDoneOracleOrFavorite: boolean;
  completedDays: number[];
}

export function recordStreakVisit(state: StreakState, now: Date = new Date()): StreakState {
  const today = dayNumberForDate(now);
  if (state.lastDay !== null && today <= state.lastDay) {
    return state;
  }
  const current = state.lastDay !== null && today === state.lastDay + 1 ? state.current + 1 : 1;
  const best = Math.max(current, state.best);
  const recent = state.recentDays.filter((d) => d < today && d > today - 14);
  recent.push(today);
  return {
    lastDay: today,
    current,
    best,
    recentDays: recent,
  };
}

export function getStreakSnapshot(state: StreakState, now: Date = new Date()): StreakSnapshot {
  const today = dayNumberForDate(now);
  const alive = state.lastDay !== null && state.lastDay >= today - 1;
  const recent = new Set(state.recentDays);
  return {
    current: alive ? state.current : 0,
    best: state.best,
    week: Array.from({ length: 7 }, (_, i) => recent.has(today - 6 + i)),
  };
}

export function ensureTasksForToday(state: DailyTasksState | null, now: Date = new Date()): DailyTasksState {
  const today = dayNumberForDate(now);
  if (state && state.dayNumber === today) return state;
  return {
    dayNumber: today,
    hasReadDaily: false,
    hasCompletedDailyQuiz: false,
    hasDoneOracleOrFavorite: false,
    completedDays: state?.completedDays ?? [],
  };
}
