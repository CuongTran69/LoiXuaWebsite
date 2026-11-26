import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  Image as ImageIcon,
  Pause,
  Play,
  Square,
  Volume2,
} from 'lucide-react';
import { audioController } from '@/core/audio';
import { TYPE_LABELS, type Saying, type SayingCategory } from '@/core/types';
import { shouldIndentVerseLine, splitPoemLines } from '@/core/vietnamese';
import { loadClientBundle } from '@/lib/client-bundle';
import {
  getPoemAlign,
  isFavorite,
  recordNotebookDiscovery,
  setPoemAlign,
  toggleFavorite,
  type PoemAlignChoice,
} from '@/lib/storage';
import CardStudioModal from './CardStudioModal';

export default function SwipeDiscovery() {
  const [allSayings, setAllSayings] = useState<Saying[]>([]);
  const [categories, setCategories] = useState<SayingCategory[]>([]);
  const [catFilter, setCatFilter] = useState('');
  const [history, setHistory] = useState<Saying[]>([]);
  const [idx, setIdx] = useState(0);
  const [fav, setFav] = useState(false);
  const [showMeaning, setShowMeaning] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [align, setAlign] = useState<PoemAlignChoice>('center');
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoIntervalSec, setAutoIntervalSec] = useState<5 | 8 | 12>(8);
  const [autoReadSpeech, setAutoReadSpeech] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [autoProgressPct, setAutoProgressPct] = useState(0);
  const elapsedMsRef = useRef(0);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    setAlign(getPoemAlign());
    const onAlignSync = (e: Event) => {
      const next = (e as CustomEvent<{ align?: PoemAlignChoice }>).detail?.align;
      if (next) setAlign(next);
    };
    window.addEventListener('loixua-poem-align-change', onAlignSync);

    loadClientBundle().then((bundle) => {
      setAllSayings(bundle.sayings);
      setCategories(bundle.categories);
      audioController.setManifest(bundle.audio);
    });
    const unsubAudio = audioController.subscribe(() => {
      setPlayingId(audioController.getState().playingId);
    });
    return () => {
      window.removeEventListener('loixua-poem-align-change', onAlignSync);
      unsubAudio();
    };
  }, []);

  const pool = useMemo(() => {
    if (!catFilter) return allSayings;
    return allSayings.filter((s) => s.categories.includes(catFilter));
  }, [allSayings, catFilter]);

  useEffect(() => {
    if (pool.length === 0) return;
    const first = pool[Math.floor(Math.random() * pool.length)];
    setHistory([first]);
    setIdx(0);
    elapsedMsRef.current = 0;
    setAutoProgressPct(0);
  }, [pool]);

  const current = history[idx] ?? null;

  useEffect(() => {
    if (!current) return;
    setFav(isFavorite(current.id));
    recordNotebookDiscovery(current.id);
    elapsedMsRef.current = 0;
    setAutoProgressPct(0);
    if (autoPlay && autoReadSpeech) {
      audioController.playSaying(current, 'verse');
    }
  }, [current?.id]);

  const goNext = useCallback(() => {
    if (pool.length === 0) return;
    elapsedMsRef.current = 0;
    setAutoProgressPct(0);
    if (idx < history.length - 1) {
      setIdx(idx + 1);
      return;
    }
    const seenIds = new Set(history.slice(-20).map((s) => s.id));
    const candidates = pool.filter((s) => !seenIds.has(s.id));
    const source = candidates.length > 0 ? candidates : pool;
    const picked = source[Math.floor(Math.random() * source.length)];
    if (picked) {
      setHistory((prev) => [...prev, picked]);
      setIdx((prev) => prev + 1);
    }
  }, [pool, idx, history]);

  const goPrev = useCallback(() => {
    elapsedMsRef.current = 0;
    setAutoProgressPct(0);
    if (idx > 0) setIdx(idx - 1);
  }, [idx]);

  // Auto-advance timer: pauses gently while hovered or playing audio
  useEffect(() => {
    if (!autoPlay || !current) {
      setAutoProgressPct(0);
      elapsedMsRef.current = 0;
      return;
    }
    const tickMs = 100;
    const totalMs = autoIntervalSec * 1000;
    const timer = window.setInterval(() => {
      if (hovered || playingId !== null) return;
      elapsedMsRef.current += tickMs;
      const pct = Math.min(100, (elapsedMsRef.current / totalMs) * 100);
      setAutoProgressPct(pct);
      if (elapsedMsRef.current >= totalMs) {
        elapsedMsRef.current = 0;
        setAutoProgressPct(0);
        goNext();
      }
    }, tickMs);
    return () => window.clearInterval(timer);
  }, [autoPlay, autoIntervalSec, hovered, playingId, current?.id, goNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
      if (!current) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        audioController.playSaying(current, 'verse');
      } else if (e.key.toLowerCase() === 'f') {
        setFav(toggleFavorite(current.id));
      } else if (e.key.toLowerCase() === 'm') {
        setShowMeaning((v) => !v);
      } else if (e.key.toLowerCase() === 'a') {
        setAutoPlay((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, goNext, goPrev]);

  if (!current) {
    return (
      <div className="cdv-surface p-12 text-center max-w-4xl mx-auto">
        <p className="text-sm m-0" style={{ color: 'var(--cdv-text-secondary)' }}>Đang chuẩn bị không gian đọc thơ...</p>
      </div>
    );
  }

  const lines = splitPoemLines(current.text);
  const remainingSec = Math.max(0, Math.ceil(((100 - autoProgressPct) / 100) * autoIntervalSec));

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
            Không gian Lướt thơ
          </h1>
          <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--cdv-text-secondary)' }}>
            Thẻ #{idx + 1} · Đọc tĩnh lặng từng câu ca dao, tục ngữ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alignment segmented control */}
          <div
            role="group"
            aria-label="Căn lề câu thơ"
            className="inline-flex items-center rounded-lg border p-0.5"
            style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)' }}
          >
            {(
              [
                { id: 'left', label: 'Căn trái', Icon: AlignLeft },
                { id: 'center', label: 'Căn giữa', Icon: AlignCenter },
                { id: 'right', label: 'Căn phải', Icon: AlignRight },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                title={label}
                aria-pressed={align === id}
                onClick={() => {
                  setAlign(id);
                  setPoemAlign(id);
                }}
                className="p-1.5 rounded-md border-0 cursor-pointer transition-colors"
                style={
                  align === id
                    ? { backgroundColor: 'var(--cdv-cinnabar-text)', color: 'var(--cdv-on-accent)' }
                    : { backgroundColor: 'transparent', color: 'var(--cdv-text-secondary)' }
                }
              >
                <Icon size={14} aria-hidden="true" />
              </button>
            ))}
          </div>

          {/* Auto-advance toggle + interval */}
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAutoPlay((v) => !v)}
              aria-pressed={autoPlay}
              className={`${autoPlay ? 'cdv-btn-primary' : 'cdv-btn-secondary'} text-xs`}
            >
              {autoPlay ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              <span>{autoPlay ? 'Đang tự lướt' : 'Tự động lướt'}</span>
            </button>
            {autoPlay && (
              <>
                <select
                  aria-label="Thời gian mỗi câu"
                  value={autoIntervalSec}
                  onChange={(e) => setAutoIntervalSec(Number(e.target.value) as 5 | 8 | 12)}
                  className="px-2 py-1.5 rounded-lg border text-xs tabular-nums"
                  style={{ backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
                >
                  <option value={5}>5 giây</option>
                  <option value={8}>8 giây</option>
                  <option value={12}>12 giây</option>
                </select>
                <button
                  type="button"
                  onClick={() => setAutoReadSpeech((v) => !v)}
                  aria-pressed={autoReadSpeech}
                  title="Tự động phát giọng đọc khi chuyển câu"
                  className="px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer inline-flex items-center gap-1"
                  style={
                    autoReadSpeech
                      ? { borderColor: 'var(--cdv-bamboo-text)', color: 'var(--cdv-bamboo-text)', backgroundColor: 'color-mix(in srgb, var(--cdv-bamboo-text) 12%, var(--cdv-elevated))' }
                      : { borderColor: 'var(--cdv-border)', color: 'var(--cdv-text-secondary)', backgroundColor: 'var(--cdv-elevated)' }
                  }
                >
                  <Volume2 size={13} aria-hidden="true" />
                  <span className="hidden sm:inline">Tự đọc</span>
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMeaning((v) => !v)}
            aria-pressed={showMeaning}
            className="cdv-btn-secondary text-xs"
          >
            {showMeaning ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
            <span>{showMeaning ? 'Ẩn giải nghĩa' : 'Hiện giải nghĩa'}</span>
          </button>

          <select
            aria-label="Lọc chủ đề lướt thơ"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs"
            style={{ backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
          >
            <option value="">Tất cả chủ đề ({allSayings.length})</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Focused Stage */}
      <div
        className="cdv-surface relative overflow-hidden p-8 sm:p-14 min-h-[54dvh] flex flex-col justify-between gap-8 cdv-animate-pop"
        style={{ touchAction: 'pan-x' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartY.current === null) return;
          const dy = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current;
          touchStartY.current = null;
          if (dy < -50) goNext();
          else if (dy > 50) goPrev();
        }}
      >
        {autoPlay && (
          <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: 'var(--cdv-border)' }}>
            <div
              className="h-full"
              style={{
                width: `${autoProgressPct}%`,
                backgroundColor: 'var(--cdv-cinnabar-text)',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider"
              style={{ backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 12%, transparent)', color: 'var(--cdv-cinnabar-text)' }}
            >
              {TYPE_LABELS[current.type]}
            </span>
            {autoPlay && (
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--cdv-text-tertiary)' }}>
                {playingId !== null
                  ? 'Đang phát giọng đọc...'
                  : hovered
                    ? 'Tạm dừng khi di chuột'
                    : `Chuyển câu sau ${remainingSec}s`}
              </span>
            )}
          </div>
          <a href={`/cau/${current.slug || current.id}`} className="text-xs font-semibold no-underline hover:underline" style={{ color: 'var(--cdv-text-secondary)' }}>
            Xem đầy đủ &amp; từ cổ →
          </a>
        </div>

        <div className="py-4 space-y-6 my-auto">
          <div className="cdv-poem cdv-poem-hero cdv-poem-reading space-y-2.5">
            {lines.map((line, i) => (
              <p key={i} className={`m-0 ${shouldIndentVerseLine(lines, i) ? 'cdv-lucbat-6' : ''}`}>
                {line}
              </p>
            ))}
          </div>
          {showMeaning && current.meaning && (
            <p className="cdv-prose cdv-prose-reading text-sm sm:text-base leading-relaxed m-0 pt-5 border-t" style={{ borderColor: 'var(--cdv-border)', color: 'var(--cdv-text-secondary)' }}>
              {current.meaning}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--cdv-border)' }}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => audioController.playSaying(current, 'verse')}
              className="cdv-btn-primary text-xs"
            >
              {playingId === current.id ? <Square size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
              <span>{playingId === current.id ? 'Dừng' : 'Nghe đọc'}</span>
            </button>
            <button
              type="button"
              onClick={() => setFav(toggleFavorite(current.id))}
              aria-pressed={fav}
              className="cdv-btn-secondary text-xs"
            >
              <Heart size={14} fill={fav ? 'currentColor' : 'none'} style={fav ? { color: 'var(--cdv-cinnabar-text)' } : undefined} aria-hidden="true" />
              <span>{fav ? 'Đã lưu' : 'Lưu câu'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('loixua-open-card-studio', { detail: { saying: current } }))}
              className="cdv-btn-secondary text-xs"
            >
              <ImageIcon size={14} aria-hidden="true" />
              <span>Tạo thiệp</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={goPrev} disabled={idx === 0} className="cdv-btn-secondary text-xs disabled:opacity-40">
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Trước</span>
            </button>
            <button type="button" onClick={goNext} className="cdv-btn-primary text-xs">
              <span>Tiếp</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <p className="hidden sm:flex flex-wrap items-center justify-center gap-4 text-xs m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
        <span><kbd className="font-mono px-1.5 py-0.5 rounded border">←</kbd> / <kbd className="font-mono px-1.5 py-0.5 rounded border">→</kbd> Chuyển câu</span>
        <span><kbd className="font-mono px-1.5 py-0.5 rounded border">A</kbd> Tự động lướt</span>
        <span><kbd className="font-mono px-1.5 py-0.5 rounded border">Space</kbd> Nghe đọc</span>
        <span><kbd className="font-mono px-1.5 py-0.5 rounded border">F</kbd> Yêu thích</span>
        <span><kbd className="font-mono px-1.5 py-0.5 rounded border">M</kbd> Ẩn/hiện giải nghĩa</span>
      </p>
      <CardStudioModal />
    </div>
  );
}
