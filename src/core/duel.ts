import { SplitMix64 } from './splitmix64';
import { generateVerseQuizQuestions, questionTimeLimit, type VerseQuizQuestion } from './verse-quiz';
import type { Saying } from './types';

export type DuelMode = 'standard' | 'challenge';
export type DuelOutcome = 'win' | 'lose' | 'tie';

export interface DuelPersona {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
}

export interface DuelResult {
  score: number;
  totalMilliseconds: number;
}

export interface BotAnswer {
  correct: boolean;
  milliseconds: number;
}

export const DUEL_ALGO_VERSION = 2;
export const DUEL_QUESTION_COUNT = 20;
export const DUEL_MAX_SEED = 9_007_199_254_740_991n; // (1 << 53) - 1
export const DUEL_ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const DUEL_LINK_HOST = 'tmkstudio.io.vn';

export const DUEL_PERSONAS: DuelPersona[] = [
  { id: 'co-trang', name: 'Cò Trắng', symbol: 'bird', emoji: '🕊️' },
  { id: 'trang-ti', name: 'Trạng Tí', symbol: 'graduationcap', emoji: '🎓' },
  { id: 'thang-bom', name: 'Thằng Bờm', symbol: 'fan.desk', emoji: '🪭' },
  { id: 'trang-quynh', name: 'Trạng Quỳnh', symbol: 'lightbulb', emoji: '💡' },
  { id: 'tam', name: 'Cô Tấm', symbol: 'leaf', emoji: '🌿' },
  { id: 'thach-sanh', name: 'Thạch Sanh', symbol: 'shield', emoji: '🛡️' },
  { id: 'chu-cuoi', name: 'Chú Cuội', symbol: 'moon.stars', emoji: '🌙' },
  { id: 'ong-giong', name: 'Thánh Gióng', symbol: 'flame', emoji: '🔥' },
  { id: 'son-tinh', name: 'Sơn Tinh', symbol: 'mountain.2', emoji: '⛰️' },
  { id: 'trau-vang', name: 'Trâu Vàng', symbol: 'sun.max', emoji: '🐂' },
  { id: 'ca-chep', name: 'Cá Chép', symbol: 'fish', emoji: '🐟' },
  { id: 'meo-muop', name: 'Mèo Mướp', symbol: 'pawprint', emoji: '🐱' },
];

export const BOT_PERSONA: DuelPersona = {
  id: 'bot',
  name: 'Máy',
  symbol: 'cpu',
  emoji: '🤖',
};

export function findDuelPersona(id: string): DuelPersona | null {
  if (id === BOT_PERSONA.id) return BOT_PERSONA;
  return DUEL_PERSONAS.find((p) => p.id === id) ?? null;
}

export function makeDuelSeed(rng?: SplitMix64): number {
  if (rng) {
    return Number(rng.next() & DUEL_MAX_SEED);
  }
  const arr = new Uint32Array(2);
  crypto.getRandomValues(arr);
  const val = (BigInt(arr[0]) << 32n) | BigInt(arr[1]);
  return Number(val & DUEL_MAX_SEED);
}

export function duelPool(sayings: Saying[]): Saying[] {
  return sayings
    .filter((s) => s.source !== 'Lời Xưa bổ sung')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function duelQuestions(sayings: Saying[], seed: number | bigint): VerseQuizQuestion[] {
  const rng = new SplitMix64(seed);
  return generateVerseQuizQuestions(duelPool(sayings), DUEL_QUESTION_COUNT, rng);
}

export function checkDuelCompatibility(
  roomAlgoVersion: number,
  roomDatasetVersion: string,
  localDatasetVersion: string | null
): 'compatible' | 'versionMismatch' {
  if (roomAlgoVersion !== DUEL_ALGO_VERSION || !localDatasetVersion || localDatasetVersion !== roomDatasetVersion) {
    return 'versionMismatch';
  }
  return 'compatible';
}

export function answerMilliseconds(elapsedSeconds: number, limitSeconds: number, timedOut: boolean): number {
  const limitMs = Math.round(limitSeconds * 1000);
  if (timedOut) return limitMs;
  const ms = Math.round(Math.max(0, elapsedSeconds) * 1000);
  return Math.min(ms, limitMs);
}

export function computeDuelOutcome(me: DuelResult, opponent: DuelResult): DuelOutcome {
  if (me.score !== opponent.score) return me.score > opponent.score ? 'win' : 'lose';
  if (me.totalMilliseconds !== opponent.totalMilliseconds) {
    return me.totalMilliseconds < opponent.totalMilliseconds ? 'win' : 'lose';
  }
  return 'tie';
}

function unitInterval(rng: SplitMix64): number {
  return Number(rng.next() >> 11n) / Number(1n << 53n);
}

export function computeBotAnswers(
  questions: VerseQuizQuestion[],
  seed: number | bigint,
  mode: DuelMode
): BotAnswer[] {
  const botSeed = BigInt.asUintN(64, BigInt(seed)) ^ 0xb07_b07_b07_b07n;
  const rng = new SplitMix64(botSeed);
  const accuracy = mode === 'challenge' ? 0.6 : 0.7;

  return questions.map((q) => {
    const correct = unitInterval(rng) < accuracy;
    const limitMs = answerMilliseconds(0, questionTimeLimit(q, mode === 'challenge'), true);
    const fraction = 0.35 + 0.5 * unitInterval(rng);
    return {
      correct,
      milliseconds: Math.round(limitMs * fraction),
    };
  });
}

export function makeRoomCode(rng?: SplitMix64): string {
  const chars = DUEL_ROOM_ALPHABET;
  let out = '';
  for (let i = 0; i < 6; i++) {
    const idx = rng
      ? Number(rng.next() % BigInt(chars.length))
      : crypto.getRandomValues(new Uint32Array(1))[0] % chars.length;
    out += chars[idx];
  }
  return out;
}

export function normalizeRoomCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, '');
  if (cleaned.length !== 6) return null;
  for (const ch of cleaned) {
    if (!DUEL_ROOM_ALPHABET.includes(ch)) return null;
  }
  return cleaned;
}

export interface DuelChallengePayload {
  seed: number;
  mode: DuelMode;
  personaID: string;
  score: number;
  totalMilliseconds: number;
  datasetVersion: string;
  algoVersion: number;
}

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

export function challengeChecksum(payload: DuelChallengePayload): string {
  const str = `${payload.seed}_${payload.mode}_${payload.personaID}_${payload.score}_${payload.totalMilliseconds}_${payload.datasetVersion}_${payload.algoVersion}_cadaoviet.duel.async.salt`;
  const bytes = new TextEncoder().encode(str);
  let hash = FNV_OFFSET;
  for (const b of bytes) {
    hash ^= BigInt(b);
    hash = BigInt.asUintN(64, hash * FNV_PRIME);
  }
  const low16 = Number(hash & 0xffffn);
  return low16.toString(16).toUpperCase().padStart(4, '0');
}

export function encodeDuelChallenge(payload: DuelChallengePayload): string {
  const modeCode = payload.mode === 'challenge' ? 'C' : 'S';
  const cs = challengeChecksum(payload);
  return `C${payload.algoVersion}_${payload.seed}_${modeCode}_${payload.personaID}_${payload.score}_${payload.totalMilliseconds}_${payload.datasetVersion}_${cs}`;
}

export function decodeDuelChallenge(input: string): DuelChallengePayload | null {
  let trimmed = input.trim();
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const last = url.pathname.split('/').filter(Boolean).pop();
      if (last) trimmed = last;
    }
  } catch {
    // ignore URL parse
  }

  const parts = trimmed.split('_');
  if (parts.length !== 8) return null;
  if (!parts[0].toUpperCase().startsWith('C')) return null;

  const version = Number(parts[0].slice(1));
  if (!Number.isInteger(version) || version <= 0) return null;

  const seed = Number(parts[1]);
  if (!Number.isInteger(seed) || seed < 0 || BigInt(seed) > DUEL_MAX_SEED) return null;

  const modeUpper = parts[2].toUpperCase();
  const mode: DuelMode | null =
    modeUpper === 'S' || modeUpper === 'STANDARD'
      ? 'standard'
      : modeUpper === 'C' || modeUpper === 'CHALLENGE'
        ? 'challenge'
        : null;
  if (!mode) return null;

  const personaID = parts[3].toLowerCase();
  if (!findDuelPersona(personaID)) return null;

  const score = Number(parts[4]);
  if (!Number.isInteger(score) || score < 0 || score > DUEL_QUESTION_COUNT) return null;

  const totalMilliseconds = Number(parts[5]);
  if (!Number.isInteger(totalMilliseconds) || totalMilliseconds < 0) return null;

  const datasetVersion = parts[6];
  if (!datasetVersion || datasetVersion.length > 20 || !/^[A-Za-z0-9.]+$/.test(datasetVersion)) {
    return null;
  }

  const payload: DuelChallengePayload = {
    seed,
    mode,
    personaID,
    score,
    totalMilliseconds,
    datasetVersion,
    algoVersion: version,
  };
  const expected = challengeChecksum(payload);
  if (parts[7].toUpperCase() !== expected) return null;

  return payload;
}
