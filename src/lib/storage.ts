import { dayNumberForDate } from '@/core/daily-picker';
import {
  ensureTasksForToday,
  getStreakSnapshot,
  recordStreakVisit,
  type DailyTasksState,
  type StreakState,
} from '@/core/streak';
import type { Saying } from '@/core/types';

export interface FavoriteEntry {
  id: string;
  savedAt: string;
}

export interface ReflectionEntry {
  dayNumber: number;
  sayingId: string;
  note: string;
  updatedAt: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type PoemFontChoice = 'newsreader' | 'georgia' | 'charter' | 'palatino' | 'rounded';
export type PoemAlignChoice = 'left' | 'center' | 'right';

const KEYS = {
  favorites: 'loixua.favorites.v1',
  notebook: 'loixua.notebook.v1',
  streak: 'loixua.streak.v1',
  tasks: 'loixua.daily_tasks.v1',
  reflections: 'loixua.reflections.v1',
  recentQueries: 'loixua.recent_queries.v1',
  quizHighScore: 'loixua.quiz.highscore.v1',
  dailyQuiz: 'loixua.daily_quiz.v1',
  poemFont: 'loixua.poem_font.v1',
  poemFontSizeOffset: 'loixua.poem_font_offset.v1',
  poemAlign: 'loixua.poem_align.v1',
  colorScheme: 'color-scheme',
} as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('loixua-storage-change', { detail: { key } }));
  } catch {
    // ignore storage quota / privacy block
  }
}

// MARK: - Favorites
export function getFavorites(): FavoriteEntry[] {
  return readJson<FavoriteEntry[]>(KEYS.favorites, []);
}

export function isFavorite(sayingId: string): boolean {
  return getFavorites().some((f) => f.id === sayingId);
}

export function toggleFavorite(sayingId: string): boolean {
  const list = getFavorites();
  const exists = list.some((f) => f.id === sayingId);
  const next = exists
    ? list.filter((f) => f.id !== sayingId)
    : [{ id: sayingId, savedAt: new Date().toISOString() }, ...list];
  writeJson(KEYS.favorites, next);
  if (!exists) {
    recordNotebookDiscovery(sayingId);
    markOracleOrFavoriteTaskDone();
  }
  return !exists;
}

// MARK: - Notebook
export function getNotebookIds(): string[] {
  return readJson<string[]>(KEYS.notebook, []);
}

export function recordNotebookDiscovery(sayingId: string) {
  if (!sayingId) return;
  const current = new Set(getNotebookIds());
  if (current.has(sayingId)) return;
  current.add(sayingId);
  writeJson(KEYS.notebook, Array.from(current));
}

// MARK: - Streak & Daily Tasks
export function getStreak(): ReturnType<typeof getStreakSnapshot> {
  const state = readJson<StreakState>(KEYS.streak, {
    lastDay: null,
    current: 0,
    best: 0,
    recentDays: [],
  });
  return getStreakSnapshot(state);
}

export function recordDailyRead(): ReturnType<typeof getStreakSnapshot> {
  const state = readJson<StreakState>(KEYS.streak, {
    lastDay: null,
    current: 0,
    best: 0,
    recentDays: [],
  });
  const next = recordStreakVisit(state);
  writeJson(KEYS.streak, next);

  const tasks = ensureTasksForToday(readJson<DailyTasksState | null>(KEYS.tasks, null));
  if (!tasks.hasReadDaily) {
    tasks.hasReadDaily = true;
    checkCompleteAll(tasks);
    writeJson(KEYS.tasks, tasks);
  }
  return getStreakSnapshot(next);
}

export function getDailyTasks(): DailyTasksState {
  const tasks = ensureTasksForToday(readJson<DailyTasksState | null>(KEYS.tasks, null));
  return tasks;
}

export function markDailyQuizTaskDone() {
  const tasks = ensureTasksForToday(readJson<DailyTasksState | null>(KEYS.tasks, null));
  if (!tasks.hasCompletedDailyQuiz) {
    tasks.hasCompletedDailyQuiz = true;
    checkCompleteAll(tasks);
    writeJson(KEYS.tasks, tasks);
  }
}

export function markOracleOrFavoriteTaskDone() {
  const tasks = ensureTasksForToday(readJson<DailyTasksState | null>(KEYS.tasks, null));
  if (!tasks.hasDoneOracleOrFavorite) {
    tasks.hasDoneOracleOrFavorite = true;
    checkCompleteAll(tasks);
    writeJson(KEYS.tasks, tasks);
  }
}

function checkCompleteAll(tasks: DailyTasksState) {
  if (tasks.hasReadDaily && tasks.hasCompletedDailyQuiz && tasks.hasDoneOracleOrFavorite) {
    if (!tasks.completedDays.includes(tasks.dayNumber)) {
      tasks.completedDays = [...tasks.completedDays.slice(-60), tasks.dayNumber];
    }
  }
}

// MARK: - Reflections
export function getReflections(): ReflectionEntry[] {
  return readJson<ReflectionEntry[]>(KEYS.reflections, []);
}

export function getTodayReflection(): ReflectionEntry | null {
  const today = dayNumberForDate(new Date());
  return getReflections().find((r) => r.dayNumber === today) ?? null;
}

export function saveTodayReflection(sayingId: string, note: string) {
  const today = dayNumberForDate(new Date());
  const list = getReflections().filter((r) => r.dayNumber !== today);
  if (note.trim()) {
    list.unshift({
      dayNumber: today,
      sayingId,
      note: note.trim(),
      updatedAt: new Date().toISOString(),
    });
  }
  writeJson(KEYS.reflections, list.slice(0, 200));
}

// MARK: - Recent Searches
export function getRecentQueries(): string[] {
  return readJson<string[]>(KEYS.recentQueries, []);
}

export function pushRecentQuery(query: string) {
  const q = query.trim();
  if (q.length < 2) return;
  const list = getRecentQueries().filter((item) => item.toLowerCase() !== q.toLowerCase());
  writeJson(KEYS.recentQueries, [q, ...list].slice(0, 10));
}

export function removeRecentQuery(query: string) {
  const list = getRecentQueries().filter((item) => item !== query);
  writeJson(KEYS.recentQueries, list);
}

export function clearRecentQueries() {
  writeJson(KEYS.recentQueries, []);
}

// MARK: - Quiz Progress & High Score
export function getQuizHighScore(): number {
  return readJson<number>(KEYS.quizHighScore, 0);
}

export function updateQuizHighScore(score: number): number {
  const best = Math.max(getQuizHighScore(), score);
  writeJson(KEYS.quizHighScore, best);
  return best;
}

export interface DailyQuizProgress {
  dayNumber: number;
  answers: Array<{
    questionIndex: number;
    sayingID: string;
    selectedOptionIndex: number | null;
    isCorrect: boolean;
    durationMs: number;
  }>;
  isCompleted: boolean;
}

export function getDailyQuizProgress(): DailyQuizProgress | null {
  const today = dayNumberForDate(new Date());
  const stored = readJson<DailyQuizProgress | null>(KEYS.dailyQuiz, null);
  if (!stored || stored.dayNumber !== today) return null;
  return stored;
}

export function saveDailyQuizProgress(progress: DailyQuizProgress) {
  writeJson(KEYS.dailyQuiz, progress);
}

// MARK: - Theme & Typography Preferences
export function getThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const v = window.localStorage.getItem(KEYS.colorScheme);
  if (v === 'light' || v === 'dark') return v;
  return 'system';
}

export function setThemePreference(pref: ThemePreference) {
  if (typeof window === 'undefined') return;
  const meta = document.querySelector('meta[name="color-scheme"]');
  try {
    if (pref === 'system') {
      window.localStorage.removeItem(KEYS.colorScheme);
      if (meta) meta.setAttribute('content', 'light dark');
    } else {
      window.localStorage.setItem(KEYS.colorScheme, pref);
      if (meta) meta.setAttribute('content', pref);
    }
    window.dispatchEvent(new CustomEvent('loixua-storage-change', { detail: { key: KEYS.colorScheme } }));
  } catch {
    if (meta) meta.setAttribute('content', pref === 'system' ? 'light dark' : pref);
  }
}

export function getPoemFont(): PoemFontChoice {
  const v = readJson<string>(KEYS.poemFont, 'newsreader');
  if (v === 'georgia' || v === 'charter' || v === 'palatino' || v === 'rounded' || v === 'newsreader') {
    return v;
  }
  return 'newsreader';
}

export function setPoemFont(font: PoemFontChoice) {
  writeJson(KEYS.poemFont, font);
  applyFontAttributes();
}

export function getPoemFontOffset(): number {
  return readJson<number>(KEYS.poemFontSizeOffset, 0);
}

export function setPoemFontOffset(offset: number) {
  const clamped = Math.max(-3, Math.min(6, offset));
  writeJson(KEYS.poemFontSizeOffset, clamped);
  applyFontAttributes();
}

export function getPoemAlign(): PoemAlignChoice {
  const v = readJson<string>(KEYS.poemAlign, 'center');
  if (v === 'left' || v === 'center' || v === 'right') return v;
  return 'center';
}

export function setPoemAlign(align: PoemAlignChoice) {
  writeJson(KEYS.poemAlign, align);
  applyFontAttributes();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('loixua-poem-align-change', { detail: { align } }));
  }
}

export function applyFontAttributes() {
  if (typeof document === 'undefined') return;
  const font = getPoemFont();
  const offset = getPoemFontOffset();
  const align = getPoemAlign();
  const fontStackMap: Record<PoemFontChoice, string> = {
    newsreader: '"Newsreader", Georgia, "Times New Roman", serif',
    georgia: 'Georgia, "Times New Roman", serif',
    charter: 'Charter, "Bitstream Charter", Georgia, serif',
    palatino: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    rounded: '"Be Vietnam Pro", system-ui, -apple-system, sans-serif',
  };
  document.documentElement.style.setProperty('--cdv-poem-font', fontStackMap[font]);
  document.documentElement.style.setProperty('--cdv-poem-size-offset', `${offset}px`);
  document.documentElement.style.setProperty('--cdv-poem-align', align);
  document.documentElement.setAttribute('data-poem-align', align);
}

// MARK: - Backup / Restore
export function exportUserBackup(allSayings?: Saying[]): string {
  const favorites = getFavorites();
  const notebook = getNotebookIds();
  const reflections = getReflections();
  const streak = readJson<StreakState | null>(KEYS.streak, null);
  const quizHighScore = getQuizHighScore();
  return JSON.stringify(
    {
      app: 'LoiXuaWeb',
      exportedAt: new Date().toISOString(),
      favorites,
      notebook,
      reflections,
      streak,
      quizHighScore,
      favoriteTexts: allSayings
        ? favorites.map((f) => allSayings.find((s) => s.id === f.id)?.text).filter(Boolean)
        : undefined,
    },
    null,
    2
  );
}

export function importUserBackup(jsonText: string): { favoritesCount: number; notebookCount: number } {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Tệp sao lưu không hợp lệ');
  }
  if (Array.isArray(parsed.favorites)) {
    writeJson(KEYS.favorites, parsed.favorites);
  }
  if (Array.isArray(parsed.notebook)) {
    writeJson(KEYS.notebook, parsed.notebook);
  }
  if (Array.isArray(parsed.reflections)) {
    writeJson(KEYS.reflections, parsed.reflections);
  }
  if (parsed.streak && typeof parsed.streak === 'object') {
    writeJson(KEYS.streak, parsed.streak);
  }
  if (typeof parsed.quizHighScore === 'number') {
    writeJson(KEYS.quizHighScore, parsed.quizHighScore);
  }
  return {
    favoritesCount: getFavorites().length,
    notebookCount: getNotebookIds().length,
  };
}
