import React, { useEffect, useState } from 'react';
import { Award, Check, Clock, Heart, RotateCcw, Share2, Swords } from 'lucide-react';
import { SplitMix64 } from '@/core/splitmix64';
import { dayNumberForDate } from '@/core/daily-picker';
import {
  generateDailyQuizQuestions,
  generateVerseQuizQuestions,
  questionTimeLimit,
  type VerseQuizQuestion,
} from '@/core/verse-quiz';
import type { Saying } from '@/core/types';
import { loadClientBundle } from '@/lib/client-bundle';
import {
  getDailyQuizProgress,
  getQuizHighScore,
  markDailyQuizTaskDone,
  saveDailyQuizProgress,
  updateQuizHighScore,
} from '@/lib/storage';

interface Props {
  mode: 'classic' | 'daily';
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

export default function QuizApp({ mode }: Props) {
  const [sayings, setSayings] = useState<Saying[]>([]);
  const [questions, setQuestions] = useState<VerseQuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimit, setTimeLimit] = useState(6);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ q: VerseQuizQuestion; choice: number | null; ok: boolean }>>([]);
  const [finished, setFinished] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const startRound = (pool: Saying[]) => {
    const day = dayNumberForDate(new Date());
    if (mode === 'daily') {
      const qs = generateDailyQuizQuestions(pool, day);
      const saved = getDailyQuizProgress();
      setQuestions(qs);
      if (saved && saved.isCompleted) {
        setAnswers(
          saved.answers
            .map((a, i) => ({ q: qs[i], choice: a.selectedOptionIndex, ok: a.isCorrect }))
            .filter((x) => Boolean(x.q))
        );
        setScore(saved.answers.filter((a) => a.isCorrect).length);
        setFinished(true);
        return;
      }
      const startIndex = saved ? saved.answers.length : 0;
      const restored = saved
        ? saved.answers.map((a, i) => ({ q: qs[i], choice: a.selectedOptionIndex, ok: a.isCorrect })).filter((x) => Boolean(x.q))
        : [];
      setAnswers(restored);
      setScore(restored.filter((r) => r.ok).length);
      setIdx(startIndex);
      setLives(99);
      setFinished(false);
      setSelected(null);
      if (qs[startIndex]) {
        const lim = questionTimeLimit(qs[startIndex], false);
        setTimeLimit(lim);
        setTimeLeft(lim);
      }
      return;
    }

    const seed = BigInt(Date.now()) ^ 0x1234_5678n;
    const qs = generateVerseQuizQuestions(pool, 20, new SplitMix64(seed));
    setQuestions(qs);
    setIdx(0);
    setLives(5);
    setScore(0);
    setAnswers([]);
    setFinished(false);
    setSelected(null);
    if (qs[0]) {
      const lim = questionTimeLimit(qs[0], false);
      setTimeLimit(lim);
      setTimeLeft(lim);
    }
  };

  useEffect(() => {
    setHighScore(getQuizHighScore());
    loadClientBundle().then((b) => {
      setSayings(b.sayings);
      startRound(b.sayings);
    });
  }, [mode]);

  const currentQ = questions[idx];

  useEffect(() => {
    if (finished || !currentQ || selected !== null) return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      const rem = Math.max(0, timeLimit - elapsed);
      setTimeLeft(rem);
      if (rem <= 0) {
        window.clearInterval(timer);
        handlePick(null, Math.round(timeLimit * 1000));
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [idx, finished, currentQ, selected, timeLimit]);

  const handlePick = (optionIndex: number | null, durationMs?: number) => {
    if (selected !== null || !currentQ || finished) return;
    const isCorrect = optionIndex !== null && optionIndex === currentQ.correctIndex;
    setSelected(optionIndex ?? -1);

    const nextScore = isCorrect ? score + 1 : score;
    const nextLives = mode === 'classic' && !isCorrect ? lives - 1 : lives;
    const nextAnswers = [...answers, { q: currentQ, choice: optionIndex, ok: isCorrect }];

    setScore(nextScore);
    setLives(nextLives);
    setAnswers(nextAnswers);

    if (mode === 'daily') {
      const day = dayNumberForDate(new Date());
      const prev = getDailyQuizProgress() ?? { dayNumber: day, answers: [], isCompleted: false };
      prev.answers.push({
        questionIndex: idx,
        sayingID: currentQ.sayingID,
        selectedOptionIndex: optionIndex,
        isCorrect,
        durationMs: durationMs ?? Math.round((timeLimit - timeLeft) * 1000),
      });
      if (prev.answers.length >= questions.length) {
        prev.isCompleted = true;
        markDailyQuizTaskDone();
      }
      saveDailyQuizProgress(prev);
    } else {
      setHighScore(updateQuizHighScore(nextScore));
    }

    window.setTimeout(() => {
      const outOfLives = mode === 'classic' && nextLives <= 0;
      const isLast = idx + 1 >= questions.length;
      if (outOfLives || isLast) {
        setFinished(true);
      } else {
        const nextIdx = idx + 1;
        const lim = questionTimeLimit(questions[nextIdx], false);
        setIdx(nextIdx);
        setSelected(null);
        setTimeLimit(lim);
        setTimeLeft(lim);
      }
    }, 850);
  };

  // Keyboard shortcuts 1-4
  useEffect(() => {
    if (finished || !currentQ || selected !== null) return;
    const onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = Number(e.key) - 1;
        if (optIdx < currentQ.options.length) {
          e.preventDefault();
          handlePick(optIdx);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleShareWordle = async () => {
    const emojis = answers.map((a) => (a.ok ? '🟩' : '🟥')).join('');
    const title = mode === 'daily' ? 'Đố nhanh mỗi ngày — Lời Xưa' : 'Đố vui nối vế — Lời Xưa';
    const text = `${title}: ${score}/${questions.length}\n${emojis}\nChơi tại: https://loixua.tmkstudio.io.vn/${mode === 'daily' ? 'do-vui-hom-nay' : 'do-vui'}`;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedShare(true);
    window.setTimeout(() => setCopiedShare(false), 2000);
  };

  if (questions.length === 0) {
    return (
      <div className="cdv-surface p-10 text-center max-w-4xl mx-auto">
        <p className="text-sm m-0" style={{ color: 'var(--cdv-text-secondary)' }}>Đang chuẩn bị bộ câu hỏi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="border-b pb-5 flex flex-wrap items-end justify-between gap-3" style={{ borderColor: 'var(--cdv-border)' }}>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
            {mode === 'daily' ? 'Thử thách hằng ngày' : 'Luyện tập solo'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
            {mode === 'daily' ? 'Đố nhanh mỗi ngày (5 câu)' : 'Đố vui nối vế (20 câu)'}
          </h1>
          <p className="text-xs m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
            {mode === 'daily'
              ? 'Cùng bộ 5 câu đồng bộ với ứng dụng iOS & Android hôm nay.'
              : `Kỷ lục cá nhân: ${highScore}/20 câu đúng`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={mode === 'daily' ? '/do-vui' : '/do-vui-hom-nay'} className="cdv-btn-secondary text-xs">
            {mode === 'daily' ? 'Đố 20 câu' : 'Đố mỗi ngày'}
          </a>
          <a href="/dau" className="cdv-btn-primary text-xs">
            <Swords size={14} aria-hidden="true" />
            <span>Đấu 1v1</span>
          </a>
        </div>
      </header>

      {!finished && currentQ ? (
        <div className="cdv-surface p-6 sm:p-10 space-y-6">
          {/* Top Status + Stepper */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold tabular-nums">
              <span>Câu {idx + 1} / {questions.length} · Điểm: <strong style={{ color: 'var(--cdv-bamboo-text)' }}>{score}</strong></span>
              {mode === 'classic' && (
                <span className="inline-flex items-center gap-1" aria-label={`Còn ${lives} lượt sai`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Heart
                      key={i}
                      size={14}
                      fill={i < lives ? 'var(--cdv-cinnabar-text)' : 'none'}
                      style={{ color: i < lives ? 'var(--cdv-cinnabar-text)' : 'var(--cdv-border)' }}
                      aria-hidden="true"
                    />
                  ))}
                </span>
              )}
              <span className="inline-flex items-center gap-1" style={{ color: timeLeft <= 2 ? 'var(--cdv-cinnabar-text)' : 'var(--cdv-text-secondary)' }}>
                <Clock size={14} aria-hidden="true" />
                <span>{timeLeft.toFixed(1)}s</span>
              </span>
            </div>

            <div className="flex gap-1">
              {questions.map((_, qStep) => {
                const ans = answers[qStep];
                const bg = ans
                  ? ans.ok
                    ? 'var(--cdv-bamboo-text)'
                    : 'var(--cdv-cinnabar-text)'
                  : qStep === idx
                    ? 'var(--cdv-amber-text)'
                    : 'var(--cdv-border)';
                return <div key={qStep} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: bg }} />;
              })}
            </div>

            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cdv-border)' }}>
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: `${Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100))}%`,
                  backgroundColor: timeLeft <= 2 ? 'var(--cdv-cinnabar-text)' : 'var(--cdv-bamboo-text)',
                }}
              />
            </div>
          </div>

          <div className="py-4 text-center space-y-2">
            <p className="text-xs uppercase font-bold tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
              Chọn vế nối tiếp phù hợp
            </p>
            <p className="cdv-poem cdv-poem-hero font-medium m-0">{currentQ.prompt}, …</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {currentQ.options.map((opt, optIdx) => {
              const isPicked = selected === optIdx;
              const isRight = optIdx === currentQ.correctIndex;
              let style: React.CSSProperties = {
                borderColor: 'var(--cdv-border)',
                backgroundColor: 'var(--cdv-elevated)',
                color: 'var(--cdv-text)',
              };
              if (selected !== null) {
                if (isRight) {
                  style = { borderColor: 'var(--cdv-bamboo-text)', backgroundColor: 'color-mix(in srgb, var(--cdv-bamboo-text) 16%, var(--cdv-elevated))', color: 'var(--cdv-text)', fontWeight: 600 };
                } else if (isPicked) {
                  style = { borderColor: 'var(--cdv-cinnabar-text)', backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 16%, var(--cdv-elevated))', color: 'var(--cdv-text)' };
                }
              }
              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={selected !== null}
                  onClick={() => handlePick(optIdx)}
                  className="p-4 rounded-xl border text-left text-sm sm:text-base cursor-pointer transition-colors flex items-start gap-3"
                  style={style}
                >
                  <span className="px-2 py-0.5 rounded border text-xs font-mono shrink-0 mt-0.5" style={{ borderColor: 'var(--cdv-border)' }}>
                    {OPTION_KEYS[optIdx]}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          <p className="hidden sm:block text-center text-xs m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
            Mẹo: Nhấn phím <kbd className="font-mono px-1 border rounded">1</kbd> – <kbd className="font-mono px-1 border rounded">4</kbd> để chọn nhanh đáp án.
          </p>
        </div>
      ) : (
        <div className="cdv-surface p-6 sm:p-8 space-y-6 cdv-animate-pop">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--cdv-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 12%, transparent)', color: 'var(--cdv-cinnabar-text)' }}>
                <Award size={28} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl font-bold m-0 tabular-nums">Kết quả: {score}/{questions.length} câu đúng</h2>
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--cdv-text-secondary)' }}>
                  {answers.map((a) => (a.ok ? '🟩' : '🟥')).join('')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleShareWordle} className="cdv-btn-secondary text-xs">
                {copiedShare ? <Check size={14} style={{ color: 'var(--cdv-bamboo-text)' }} aria-hidden="true" /> : <Share2 size={14} aria-hidden="true" />}
                <span>{copiedShare ? 'Đã chép' : 'Chia sẻ kết quả'}</span>
              </button>
              {mode === 'classic' && (
                <button type="button" onClick={() => startRound(sayings)} className="cdv-btn-primary text-xs">
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Chơi lượt mới</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
              Xem lại đáp án &amp; giải nghĩa
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {answers.map((item, i) => {
                const s = sayings.find((x) => x.id === item.q.sayingID);
                return (
                  <div key={i} className="cdv-elevated p-4 text-xs space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold" style={{ color: item.ok ? 'var(--cdv-bamboo-text)' : 'var(--cdv-cinnabar-text)' }}>
                        {item.ok ? 'Đúng' : 'Sai'} · {item.q.prompt}, {item.q.options[item.q.correctIndex]}
                      </span>
                      {s && (
                        <a href={`/cau/${s.slug || s.id}`} className="underline shrink-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                          Chi tiết
                        </a>
                      )}
                    </div>
                    {s?.meaning && <p className="m-0 leading-relaxed" style={{ color: 'var(--cdv-text-secondary)' }}>{s.meaning}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
