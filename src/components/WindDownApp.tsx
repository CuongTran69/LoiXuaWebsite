import React, { useEffect, useRef, useState } from 'react';
import { Clock, ListMusic, Moon, Music, Pause, Play, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { audioController, ZEN_MODES } from '@/core/audio';
import { TYPE_LABELS, type Saying, type SayingCategory } from '@/core/types';
import { shouldIndentVerseLine, splitPoemLines } from '@/core/vietnamese';
import { loadBgmPresets, loadClientBundle } from '@/lib/client-bundle';

const TIMER_OPTIONS = [
  { minutes: 0, label: 'Không hẹn giờ' },
  { minutes: 15, label: '15 phút' },
  { minutes: 30, label: '30 phút' },
  { minutes: 45, label: '45 phút' },
  { minutes: 60, label: '60 phút' },
];

export default function WindDownApp() {
  const [allCandidates, setAllCandidates] = useState<Saying[]>([]);
  const [categories, setCategories] = useState<SayingCategory[]>([]);
  const [catSlug, setCatSlug] = useState('');
  const [playlist, setPlaylist] = useState<Saying[]>([]);
  const [pos, setPos] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [readMeaning, setReadMeaning] = useState(true);
  const [timerMin, setTimerMin] = useState(30);
  const [remainingSec, setRemainingSec] = useState(0);
  const [zenMode, setZenMode] = useState('dem_trang');
  const [zenVol, setZenVol] = useState(0.45);
  const runningRef = useRef(false);

  useEffect(() => {
    loadClientBundle().then((b) => {
      audioController.setManifest(b.audio);
      setCategories(b.categories);
      const candidates = b.sayings.filter((s) => s.meaning && s.meaning.trim().length > 0);
      setAllCandidates(candidates);
      setPlaylist([...candidates].sort(() => Math.random() - 0.5));
    });
    return () => {
      runningRef.current = false;
      audioController.stopSpeech();
    };
  }, []);

  const rebuildPlaylist = (slug: string) => {
    const filtered = slug ? allCandidates.filter((s) => s.categories.includes(slug)) : allCandidates;
    setPlaylist([...filtered].sort(() => Math.random() - 0.5));
    setPos(0);
    if (isPlaying) {
      runningRef.current = false;
      audioController.stopSpeech();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (!isPlaying || timerMin === 0) return;
    if (remainingSec <= 0) setRemainingSec(timerMin * 60);

    const id = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          stopSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, timerMin]);

  const current = playlist[pos] ?? null;

  useEffect(() => {
    if (!current || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.text.split('\n')[0] || 'Lời Xưa',
      artist: 'Lời Xưa — Nghe đọc trước khi ngủ',
      album: TYPE_LABELS[current.type],
    });
    navigator.mediaSession.setActionHandler('play', () => startSession());
    navigator.mediaSession.setActionHandler('pause', () => stopSession());
    navigator.mediaSession.setActionHandler('nexttrack', () => skipTo(pos + 1));
    navigator.mediaSession.setActionHandler('previoustrack', () => skipTo(Math.max(0, pos - 1)));
  }, [current?.id, pos]);

  const playIndexLoop = async (startIdx: number) => {
    runningRef.current = true;
    let i = startIdx;
    while (runningRef.current && playlist.length > 0) {
      const saying = playlist[i % playlist.length];
      setPos(i % playlist.length);
      await audioController.playSaying(saying, 'verse');
      if (!runningRef.current) break;

      if (readMeaning && saying.meaning) {
        await new Promise((r) => window.setTimeout(r, 700));
        if (!runningRef.current) break;
        await audioController.playSaying(saying, 'meaning');
        if (!runningRef.current) break;
      }

      await new Promise((r) => window.setTimeout(r, 1500));
      i += 1;
    }
  };

  const startSession = async (overrideIdx?: number) => {
    if (playlist.length === 0) return;
    const startIdx = overrideIdx ?? pos;
    setIsPlaying(true);
    if (timerMin > 0 && remainingSec === 0) setRemainingSec(timerMin * 60);
    if (zenMode !== 'off') {
      const presets = await loadBgmPresets();
      await audioController.setZenMode(zenMode, presets);
    }
    playIndexLoop(startIdx);
  };

  const stopSession = () => {
    runningRef.current = false;
    setIsPlaying(false);
    audioController.stopSpeech();
    audioController.stopZen();
  };

  const skipTo = (nextIdx: number) => {
    if (playlist.length === 0) return;
    const safeIdx = ((nextIdx % playlist.length) + playlist.length) % playlist.length;
    setPos(safeIdx);
    if (isPlaying) {
      runningRef.current = false;
      audioController.stopSpeech();
      window.setTimeout(() => playIndexLoop(safeIdx), 120);
    }
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const upNext = Array.from({ length: Math.min(8, Math.max(0, playlist.length - 1)) }, (_, offset) => {
    const index = (pos + 1 + offset) % playlist.length;
    return { index, saying: playlist[index] };
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="border-b pb-5 flex flex-wrap items-end justify-between gap-3" style={{ borderColor: 'var(--cdv-border)' }}>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider m-0 inline-flex items-center gap-1.5" style={{ color: 'var(--cdv-indigo-text)' }}>
            <Moon size={13} aria-hidden="true" />
            <span>Thư giãn tĩnh tại</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
            Phòng Nghe ban đêm
          </h1>
          <p className="text-sm m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
            Giọng đọc studio chậm rãi hoà cùng nhạc nền thiền tổng hợp, tự động giảm âm lượng nhạc khi đọc thơ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Lọc chủ đề phòng nghe ban đêm"
            value={catSlug}
            onChange={(e) => {
              const slug = e.target.value;
              setCatSlug(slug);
              rebuildPlaylist(slug);
            }}
            className="px-3 py-2 rounded-lg border text-xs"
            style={{ backgroundColor: 'var(--cdv-card)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
          >
            <option value="">Tất cả chủ đề ({allCandidates.length})</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border" style={{ backgroundColor: 'var(--cdv-card)', borderColor: 'var(--cdv-border)' }}>
            <Clock size={14} style={{ color: 'var(--cdv-bamboo-text)' }} aria-hidden="true" />
            <span style={{ color: 'var(--cdv-text-secondary)' }}>Hẹn giờ tắt:</span>
            <select
              value={timerMin}
              onChange={(e) => {
                const m = Number(e.target.value);
                setTimerMin(m);
                setRemainingSec(m * 60);
              }}
              className="bg-transparent border-0 text-xs font-semibold focus:outline-none"
              style={{ color: 'var(--cdv-text)' }}
            >
              {TIMER_OPTIONS.map((t) => (
                <option key={t.minutes} value={t.minutes}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_340px] items-start">
        {/* Left: Listening Stage + Soundscape Controls */}
        <div className="space-y-5">
          {current && (
            <section className="cdv-surface p-6 sm:p-10 space-y-6">
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--cdv-text-secondary)' }}>
                <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                  {TYPE_LABELS[current.type]} · Bài {pos + 1}/{playlist.length}
                </span>
                {isPlaying && timerMin > 0 && (
                  <span className="font-mono tabular-nums font-semibold" style={{ color: 'var(--cdv-bamboo-text)' }}>
                    Còn {formatSec(remainingSec)}
                  </span>
                )}
              </div>

              <div className="py-4 space-y-4">
                <div className="cdv-poem cdv-poem-hero cdv-poem-reading space-y-2.5">
                  {splitPoemLines(current.text).map((line, i, arr) => (
                    <p key={i} className={`m-0 ${shouldIndentVerseLine(arr, i) ? 'cdv-lucbat-6' : ''}`}>
                      {line}
                    </p>
                  ))}
                </div>
                {readMeaning && current.meaning && (
                  <p className="cdv-prose cdv-prose-reading text-sm sm:text-base leading-relaxed m-0 pt-4 border-t" style={{ borderColor: 'var(--cdv-border)', color: 'var(--cdv-text-secondary)' }}>
                    {current.meaning}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: 'var(--cdv-border)' }}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => skipTo(pos - 1)} aria-label="Câu trước" className="cdv-btn-secondary text-xs">
                    <SkipBack size={15} aria-hidden="true" />
                    <span>Trước</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => (isPlaying ? stopSession() : startSession())}
                    className="cdv-btn-primary px-6 py-2.5 text-sm"
                  >
                    {isPlaying ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                    <span>{isPlaying ? 'Tạm dừng' : 'Bắt đầu nghe'}</span>
                  </button>
                  <button type="button" onClick={() => skipTo(pos + 1)} aria-label="Câu tiếp theo" className="cdv-btn-secondary text-xs">
                    <span>Tiếp</span>
                    <SkipForward size={15} aria-hidden="true" />
                  </button>
                </div>

                <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={readMeaning} onChange={(e) => setReadMeaning(e.target.checked)} />
                  <span>Đọc kèm giải nghĩa</span>
                </label>
              </div>
            </section>
          )}

          {/* Ambient Mixer */}
          <section className="cdv-surface p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold m-0 inline-flex items-center gap-2">
                <Music size={15} style={{ color: 'var(--cdv-bamboo-text)' }} aria-hidden="true" />
                <span>Hòa âm nhạc nền thiền (Web Audio)</span>
              </h2>
              <label className="flex items-center gap-2 text-xs">
                <span style={{ color: 'var(--cdv-text-secondary)' }}>Âm lượng nền</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={zenVol}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setZenVol(v);
                    audioController.setZenVolume(v);
                  }}
                  className="w-28"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ZEN_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={zenMode === m.id}
                  onClick={async () => {
                    setZenMode(m.id);
                    if (isPlaying) {
                      if (m.id === 'off') audioController.stopZen();
                      else audioController.setZenMode(m.id, await loadBgmPresets());
                    }
                  }}
                  className="p-3 rounded-lg border text-left cursor-pointer"
                  style={
                    zenMode === m.id
                      ? { borderColor: 'var(--cdv-cinnabar-text)', backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 10%, var(--cdv-elevated))' }
                      : { borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)' }
                  }
                >
                  <p className="text-xs font-bold m-0">{m.title}</p>
                  <p className="text-[11px] m-0 mt-0.5 truncate" style={{ color: 'var(--cdv-text-secondary)' }}>{m.subtitle}</p>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Up Next Queue */}
        <aside className="cdv-surface p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider m-0 inline-flex items-center gap-1.5" style={{ color: 'var(--cdv-text-tertiary)' }}>
              <ListMusic size={14} aria-hidden="true" />
              <span>Phát tiếp theo ({playlist.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => rebuildPlaylist(catSlug)}
              title="Xáo trộn lại danh sách phát"
              className="px-2 py-1 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
              style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text-secondary)' }}
            >
              <Shuffle size={11} aria-hidden="true" />
              <span>Xáo trộn</span>
            </button>
          </div>
          <div className="space-y-2">
            {upNext.map(({ index, saying }) => (
              <button
                key={saying.id}
                type="button"
                onClick={() => {
                  setPos(index);
                  if (isPlaying) {
                    runningRef.current = false;
                    audioController.stopSpeech();
                    window.setTimeout(() => startSession(index), 120);
                  }
                }}
                className="w-full p-3 rounded-lg border text-left cursor-pointer hover:opacity-90 transition-opacity"
                style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
              >
                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                  {TYPE_LABELS[saying.type]}
                </span>
                <p className="cdv-poem text-sm m-0 mt-0.5 line-clamp-2">{saying.text}</p>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
