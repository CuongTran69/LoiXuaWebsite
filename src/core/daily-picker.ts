import { SplitMix64 } from './splitmix64';
import { convertDateToLunar, getLocalDateParts, getVietnamDateParts } from './lunar-calendar';
import { filterThemePool, getDailyTheme } from './daily-theme';
import type { Saying } from './types';

const EPOCH_UTC_MS = Date.UTC(2026, 0, 1);
const MS_PER_DAY = 86_400_000;
const WINDOW_SALT = 0x5719_da11_cafe_0001n;

export function dayNumberForDate(date: Date = new Date(), useVietnamTZ = false): number {
  const parts = useVietnamTZ ? getVietnamDateParts(date) : getLocalDateParts(date);
  const currentUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day);
  const diff = Math.floor((currentUtcMs - EPOCH_UTC_MS) / MS_PER_DAY);
  return Math.max(0, diff);
}

/**
 * Seeded Fisher-Yates permutation matching Swift `DailyPicker.shuffledOrder` (reverse pass using `rng.next() % (i+1)`).
 */
export function shuffledOrder(pool: readonly string[], cycle: number, salt = 0n): string[] {
  const order = [...pool].sort();
  const seed = BigInt.asUintN(64, BigInt(cycle)) ^ salt;
  const rng = new SplitMix64(seed);
  if (order.length > 1) {
    for (let i = order.length - 1; i >= 1; i--) {
      const j = Number(rng.next() % BigInt(i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
  }
  return order;
}

export function pickDailyId(pool: readonly string[], date: Date = new Date(), useVietnamTZ = false): string | null {
  if (pool.length === 0) return null;
  const day = dayNumberForDate(date, useVietnamTZ);
  const cycle = Math.floor(day / pool.length);
  const position = day % pool.length;
  const order = shuffledOrder(pool, cycle);
  return order[position] ?? null;
}

export function shuffledWindow<T>(
  pool: readonly T[],
  limit: number,
  date: Date = new Date(),
  getId: (item: T) => string,
  useVietnamTZ = false
): T[] {
  if (limit <= 0 || pool.length === 0) return [];
  const byID = new Map<string, T>();
  for (const item of pool) {
    const id = getId(item);
    if (!byID.has(id)) byID.set(id, item);
  }
  const uniqueIDs = Array.from(byID.keys()).sort();
  const day = dayNumberForDate(date, useVietnamTZ);

  if (uniqueIDs.length <= limit) {
    const order = shuffledOrder(uniqueIDs, day, WINDOW_SALT);
    return order.map((id) => byID.get(id)!).filter(Boolean);
  }

  const pickedIDs: string[] = [];
  const seenIDs = new Set<string>();
  let cachedCycle: number | null = null;
  let cachedOrder: string[] = [];
  let slot = day * limit;
  const maxAttempts = limit + uniqueIDs.length;

  for (let attempt = 0; attempt < maxAttempts && pickedIDs.length < limit; attempt++) {
    const cycle = Math.floor(slot / uniqueIDs.length);
    const position = slot % uniqueIDs.length;
    if (cachedCycle !== cycle) {
      cachedCycle = cycle;
      cachedOrder = shuffledOrder(uniqueIDs, cycle, WINDOW_SALT);
    }
    const candidateID = cachedOrder[position];
    if (!seenIDs.has(candidateID)) {
      seenIDs.add(candidateID);
      pickedIDs.push(candidateID);
    }
    slot += 1;
  }

  return pickedIDs.map((id) => byID.get(id)!).filter(Boolean);
}

export function lunarThematicPool(pool: readonly Saying[], date: Date = new Date(), useVietnamTZ = false): Saying[] {
  const lunar = convertDateToLunar(date, useVietnamTZ);
  if (lunar.isMungMot || lunar.isRam) {
    const filtered = pool.filter(
      (s) =>
        s.categories.includes('dao-ly') ||
        s.categories.includes('gia-dinh') ||
        s.categories.includes('am-thuc-phong-tuc')
    );
    if (filtered.length >= 5) return filtered;
  } else if (lunar.isNewSolarTermDay) {
    const filtered = pool.filter(
      (s) =>
        s.categories.includes('thoi-tiet') ||
        s.categories.includes('kinh-nghiem-nong-nghiep')
    );
    if (filtered.length >= 5) return filtered;
  }
  return [...pool];
}

export function dailyPool(
  pool: Saying[],
  date: Date = new Date(),
  useThemedCalendar = true,
  useVietnamTZ = false
): Saying[] {
  if (!useThemedCalendar) {
    return lunarThematicPool(pool, date, useVietnamTZ);
  }
  const theme = getDailyTheme(date, useVietnamTZ);
  if (theme.kind === 'weekday') {
    return pool;
  }
  return filterThemePool(theme, pool);
}

export function pickTodaySaying(sayings: Saying[], date: Date = new Date(), useVietnamTZ = false): Saying | null {
  const eligible = sayings.filter((s) => s.dailyEligible !== false && (s.meaning?.trim()?.length ?? 0) > 0);
  const pool = dailyPool(eligible.length > 0 ? eligible : sayings, date, true, useVietnamTZ);
  const id = pickDailyId(
    pool.map((s) => s.id),
    date,
    useVietnamTZ
  );
  if (!id) return sayings[0] ?? null;
  return sayings.find((s) => s.id === id) ?? pool[0] ?? null;
}
