import { SplitMix64, swiftShuffled } from './splitmix64';
import { searchNormalized } from './vietnamese';
import { hasMeaning, type Saying } from './types';

export interface VerseQuizQuestion {
  sayingID: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface VerseHalf {
  saying: Saying;
  first: string;
  second: string;
  wordCount: number;
}

const OPTION_COUNT = 4;
const DAILY_FIXED_SEED = 0x2026_11_16_ca_da0n;

function cleanHalf(text: string): string {
  return text.replace(/^[\s,.;!?…]+|[\s,.;!?…]+$/g, '');
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.slice(0, 1).toUpperCase() + text.slice(1);
}

export function questionTimeLimit(question: VerseQuizQuestion, challenge: boolean): number {
  const longest = Math.max(
    0,
    ...question.options.map((o) => o.trim().split(/\s+/).filter(Boolean).length)
  );
  const standard = Math.min(9, Math.max(4.5, 3.5 + 0.55 * longest));
  const seconds = challenge ? Math.max(3, standard * 0.6) : standard;
  return Math.round(seconds * 2) / 2;
}

export function splitSayingForQuiz(saying: Saying): VerseHalf | null {
  const lines = saying.text
    .split('\n')
    .map((l) => cleanHalf(l))
    .filter((l) => l.length > 0);

  let parts: string[];
  if (lines.length === 2) {
    parts = lines;
  } else if (lines.length === 1) {
    const pieces = lines[0].split(',').map((p) => cleanHalf(p));
    if (pieces.length !== 2) return null;
    parts = pieces;
  } else {
    return null;
  }

  if (parts.some((p) => p.split(/\s+/).filter(Boolean).length < 2)) return null;
  if (saying.text.includes('(') || saying.text.includes(':')) return null;

  const second = capitalizeFirst(parts[1]);
  return {
    saying,
    first: parts[0],
    second,
    wordCount: second.split(/\s+/).filter(Boolean).length,
  };
}

export function isQuizVariant(a: VerseHalf, b: VerseHalf): boolean {
  if (a.saying.variantGroupId && a.saying.variantGroupId === b.saying.variantGroupId) {
    return true;
  }
  const wordsA = searchNormalized(a.first).split(' ').filter(Boolean);
  const wordsB = searchNormalized(b.first).split(' ').filter(Boolean);
  const needed = Math.min(3, wordsA.length, wordsB.length);
  if (needed <= 0) return false;
  for (let i = 0; i < needed; i++) {
    if (wordsA[i] !== wordsB[i]) return false;
  }
  return true;
}

export function buildQuizQuestion(
  half: VerseHalf,
  pool: VerseHalf[],
  rng: SplitMix64
): VerseQuizQuestion | null {
  const answerKey = searchNormalized(half.second);
  const seen = new Set<string>([answerKey]);
  const candidates = pool.filter((c) => !isQuizVariant(c, half));
  const categories = new Set(half.saying.categories);
  const sharesCategory = (c: VerseHalf) => c.saying.categories.some((cat) => categories.has(cat));

  const tier1 = swiftShuffled(
    candidates.filter(
      (c) => c.saying.type === half.saying.type && c.wordCount === half.wordCount && sharesCategory(c)
    ),
    rng
  );
  const tier2 = swiftShuffled(
    candidates.filter(
      (c) =>
        c.saying.type === half.saying.type &&
        Math.abs(c.wordCount - half.wordCount) === 1 &&
        sharesCategory(c)
    ),
    rng
  );
  const tier3 = swiftShuffled(
    candidates.filter(
      (c) => c.saying.type === half.saying.type && c.wordCount === half.wordCount && !sharesCategory(c)
    ),
    rng
  );
  const tier4 = swiftShuffled(
    candidates.filter(
      (c) =>
        c.saying.type === half.saying.type &&
        Math.abs(c.wordCount - half.wordCount) === 1 &&
        !sharesCategory(c)
    ),
    rng
  );
  const others = swiftShuffled(candidates, rng);

  const distractors: string[] = [];
  for (const candidate of [...tier1, ...tier2, ...tier3, ...tier4, ...others]) {
    if (distractors.length >= OPTION_COUNT - 1) break;
    const key = searchNormalized(candidate.second);
    if (!seen.has(key)) {
      seen.add(key);
      distractors.push(candidate.second);
    }
  }

  if (distractors.length !== OPTION_COUNT - 1) return null;
  const options = swiftShuffled([...distractors, half.second], rng);
  const correctIndex = options.indexOf(half.second);
  if (correctIndex === -1) return null;

  return {
    sayingID: half.saying.id,
    prompt: half.first,
    options,
    correctIndex,
  };
}

export function generateVerseQuizQuestions(
  sayings: Saying[],
  count: number,
  rng: SplitMix64,
  excludingSayingIDs: Set<string> = new Set()
): VerseQuizQuestion[] {
  const halves = sayings.map(splitSayingForQuiz).filter((h): h is VerseHalf => h !== null);
  if (halves.length < OPTION_COUNT || count <= 0) return [];

  const ordered = (items: VerseHalf[]) => {
    if (items.length === 0) return [];
    const explained = swiftShuffled(items.filter((h) => hasMeaning(h.saying)), rng);
    const bare = swiftShuffled(items.filter((h) => !hasMeaning(h.saying)), rng);
    return [...explained, ...bare];
  };

  const unseen = halves.filter((h) => !excludingSayingIDs.has(h.saying.id));
  const seen = excludingSayingIDs.size === 0 ? [] : halves.filter((h) => excludingSayingIDs.has(h.saying.id));
  const candidates = [...ordered(unseen), ...ordered(seen)];

  const result: VerseQuizQuestion[] = [];
  const usedPrompts = new Set<string>();
  for (const half of candidates) {
    if (result.length >= count) break;
    const promptKey = searchNormalized(half.first);
    if (usedPrompts.has(promptKey)) continue;
    const q = buildQuizQuestion(half, halves, rng);
    if (!q) continue;
    usedPrompts.add(promptKey);
    result.push(q);
  }
  return result;
}

export function generateDailyQuizQuestions(sayings: Saying[], dayNumber: number): VerseQuizQuestion[] {
  const splittable = sayings
    .filter(hasMeaning)
    .map(splitSayingForQuiz)
    .filter((h): h is VerseHalf => h !== null)
    .sort((a, b) => (a.saying.id < b.saying.id ? -1 : a.saying.id > b.saying.id ? 1 : 0));

  if (splittable.length < 5) return [];

  const orderRNG = new SplitMix64(DAILY_FIXED_SEED);
  const shuffled = swiftShuffled(splittable, orderRNG);

  const safeDay = dayNumber >= 0 ? dayNumber : (dayNumber % 100_000) + 100_000;
  const base = (safeDay * 5) % shuffled.length;
  const chosenHalves = Array.from({ length: 5 }, (_, i) => shuffled[(base + i) % shuffled.length]);

  const dayRNG = new SplitMix64(BigInt.asUintN(64, BigInt(dayNumber)));
  const questions: VerseQuizQuestion[] = [];
  for (const half of chosenHalves) {
    const q = buildQuizQuestion(half, splittable, dayRNG);
    if (q) questions.push(q);
  }

  if (questions.length !== 5) return [];
  return swiftShuffled(questions, dayRNG);
}
