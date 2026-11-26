import { describe, expect, it } from 'vitest';
import sayingsFile from '@/data/sayings.json';
import { searchNormalized } from '@/core/vietnamese';
import { SplitMix64 } from '@/core/splitmix64';
import { convertToLunar } from '@/core/lunar-calendar';
import { dayNumberForDate, pickDailyId } from '@/core/daily-picker';
import { SayingSearchEngine } from '@/core/search-engine';
import {
  answerMilliseconds,
  computeBotAnswers,
  computeDuelOutcome,
  decodeDuelChallenge,
  duelQuestions,
  encodeDuelChallenge,
  makeRoomCode,
  normalizeRoomCode,
} from '@/core/duel';
import { generateDailyQuizQuestions } from '@/core/verse-quiz';
import type { Saying } from '@/core/types';

const PROVERBS = [
  'Ăn cháo, đá bát', 'Gieo gió, gặt bão', 'Ăn cây nào, rào cây nấy', 'Tốt gỗ, hơn tốt nước sơn',
  'Đói cho sạch, rách cho thơm', 'Uống nước, nhớ nguồn', 'Có công mài sắt, có ngày nên kim',
  'Mất bò, mới lo làm chuồng', 'Gần mực thì đen, gần đèn thì rạng', 'Nước chảy, đá mòn',
  'Ăn quả, nhớ kẻ trồng cây', 'Lá lành, đùm lá rách',
];

const syntheticPool: Saying[] = PROVERBS.map((text, idx) => ({
  id: `s${String(idx).padStart(2, '0')}`,
  text,
  type: 'tuc-ngu',
  categories: ['dao-ly'],
  meaning: 'Nghĩa',
  isPopular: idx % 2 === 0,
  dailyEligible: true,
}));

describe('Vietnamese normalization', () => {
  it('handles accents, đ/Đ, NFC/NFD parity', () => {
    expect(searchNormalized('Ăn quả nhớ kẻ trồng cây, uống nước nhớ nguồn')).toBe(
      'an qua nho ke trong cay uong nuoc nho nguon'
    );
    expect(searchNormalized('Đạo đức & Đất nước')).toBe('dao duc dat nuoc');
    expect(searchNormalized('đồng đăng')).toBe('dong dang');
    const nfc = 'Việt Nam'.normalize('NFC');
    const nfd = 'Việt Nam'.normalize('NFD');
    expect(searchNormalized(nfc)).toBe('viet nam');
    expect(searchNormalized(nfd)).toBe('viet nam');
  });
});

describe('Vietnamese Lunar Calendar parity', () => {
  it('matches Tết 2024, 2025, 2026 and Vu Lan 2024', () => {
    const tet24 = convertToLunar(10, 2, 2024);
    expect(tet24.day).toBe(1);
    expect(tet24.month).toBe(1);
    expect(tet24.yearCanChi).toBe('Giáp Thìn');
    expect(tet24.dayCanChi).toBe('Giáp Thìn');
    expect(tet24.shortDisplay).toBe('1/1 ÂL');

    const tet25 = convertToLunar(29, 1, 2025);
    expect(tet25.day).toBe(1);
    expect(tet25.month).toBe(1);
    expect(tet25.yearCanChi).toBe('Ất Tỵ');

    const tet26 = convertToLunar(17, 2, 2026);
    expect(tet26.day).toBe(1);
    expect(tet26.month).toBe(1);
    expect(tet26.yearCanChi).toBe('Bính Ngọ');

    const ram7 = convertToLunar(18, 8, 2024);
    expect(ram7.day).toBe(15);
    expect(ram7.month).toBe(7);
    expect(ram7.isRam).toBe(true);

    const nov16 = convertToLunar(16, 11, 2026);
    expect(nov16.day).toBe(8);
    expect(nov16.month).toBe(10);
    expect(nov16.solarTerm).toBe('Lập đông');

    const lapDong = convertToLunar(8, 11, 2026);
    expect(lapDong.isNewSolarTermDay).toBe(true);
    expect(convertToLunar(9, 11, 2026).isNewSolarTermDay).toBe(false);
  });
});

describe('Duel parity with CaDaoCore DuelTests', () => {
  it('matches synthetic seed 42 pinned questions & correctIndex', () => {
    const questions = duelQuestions(syntheticPool, 42);
    expect(questions.map((q) => q.sayingID)).toEqual([
      's08', 's02', 's04', 's06', 's01', 's11', 's07', 's05', 's09', 's10', 's00', 's03',
    ]);
    expect(questions.map((q) => q.correctIndex)).toEqual([1, 1, 0, 0, 3, 2, 2, 0, 3, 2, 2, 3]);
  });

  it('matches bundled dataset 2026.11.7 seed 20261118 pinned questions', () => {
    expect(sayingsFile.datasetVersion).toBe('2026.11.7');
    const questions = duelQuestions(sayingsFile.sayings as Saying[], 20_261_118);
    expect(questions.length).toBe(20);
    expect(questions.slice(0, 5).map((q) => q.sayingID)).toEqual([
      'de478faa-25f5-4280-a5ed-2519eb65bb7c',
      '12c41269-98e7-43c3-b8d2-fc6c707eae61',
      'aebbcc5d-5824-48e8-9bf2-cba08a6e3a0f',
      '312a933a-b709-411f-86f5-f1f93f94a5d6',
      'c8a7dfbb-3842-4c7f-bf42-6ebecb82cd5c',
    ]);
    expect(questions[questions.length - 1]?.sayingID).toBe('ad9fc5fd-6871-4db9-93d4-323df1aea184');
    expect(questions.map((q) => q.correctIndex)).toEqual([
      1, 0, 0, 3, 0, 3, 0, 2, 0, 2, 3, 2, 0, 1, 1, 1, 3, 0, 3, 2,
    ]);
  });

  it('matches bot answers for synthetic seed 42 challenge mode', () => {
    const questions = duelQuestions(syntheticPool, 42);
    const bot = computeBotAnswers(questions, 42, 'challenge');
    expect(bot.map((b) => b.correct)).toEqual([
      false, true, true, false, false, false, true, false, false, true, true, false,
    ]);
    expect(bot.map((b) => b.milliseconds)).toEqual([
      1830, 1994, 2546, 2730, 1082, 1408, 1909, 1055, 2243, 1270, 2019, 1491,
    ]);
  });

  it('matches challenge FNV-1a checksum & round-trip', () => {
    const encoded = encodeDuelChallenge({
      seed: 20_261_118,
      mode: 'standard',
      personaID: 'co-trang',
      score: 16,
      totalMilliseconds: 54_200,
      datasetVersion: '2026.11.6',
      algoVersion: 2,
    });
    expect(encoded).toBe('C2_20261118_S_co-trang_16_54200_2026.11.6_128B');
    expect(decodeDuelChallenge(encoded)?.score).toBe(16);
    expect(decodeDuelChallenge(encoded.replace('_16_', '_20_'))).toBeNull();
  });

  it('normalizes room codes and outcomes accurately', () => {
    expect(normalizeRoomCode(' abc-234 ')).toBe('ABC234');
    expect(normalizeRoomCode('ABCO23')).toBeNull();
    const rng = new SplitMix64(9);
    const code = makeRoomCode(rng);
    expect(code.length).toBe(6);
    expect(answerMilliseconds(2.3456, 6.5, false)).toBe(2346);
    expect(computeDuelOutcome({ score: 16, totalMilliseconds: 99_000 }, { score: 15, totalMilliseconds: 60_000 })).toBe('win');
    expect(computeDuelOutcome({ score: 15, totalMilliseconds: 60_000 }, { score: 15, totalMilliseconds: 70_000 })).toBe('win');
  });
});

describe('SearchEngine golden queries', () => {
  const engine = new SayingSearchEngine(sayingsFile.sayings as Saying[]);
  const cases: Array<[string, string[]]> = [
    ['uống nước nhớ nguồn', ['uong nuoc nho nguon']],
    ['cong cha nhu nui thai son', ['cong cha nhu nui']],
    ['uongnuocnhonguon', ['uong nuoc nho nguon']],
    ['bau oi thuon lay', ['bau oi thuong lay']],
    ['chăm hay không bằng tay quen', ['tram hay khong bang']],
    ['hiếu thảo', ['nuoi me', 'me gia', 'cong cha']],
  ];

  for (const [query, frags] of cases) {
    it(`finds "${query}" in top 3`, () => {
      const res = engine.search(query);
      const top3 = res.sayings.slice(0, 3);
      const ok = top3.some((s) => {
        const textNorm = searchNormalized(s.text);
        const meaningNorm = s.meaning ? searchNormalized(s.meaning) : '';
        return frags.some((f) => textNorm.includes(f) || meaningNorm.includes(f));
      });
      expect(ok).toBe(true);
    });
  }
});

describe('DailyPicker & DailyQuiz', () => {
  it('picks deterministic daily ID and 5 daily quiz questions', () => {
    const d = new Date(2026, 10, 26, 12, 0, 0);
    const pool = ['a', 'b', 'c', 'd', 'e'];
    expect(pickDailyId(pool, d)).toBe(pickDailyId(pool, d));
    const day = dayNumberForDate(d);
    const quiz = generateDailyQuizQuestions(sayingsFile.sayings as Saying[], day);
    expect(quiz.length).toBe(5);
  });
});
