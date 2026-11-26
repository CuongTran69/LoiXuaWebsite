import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Flame,
  Heart,
  Image as ImageIcon,
  Moon,
  Palette,
  Search,
  Shuffle,
  Sparkles,
  Square,
  Swords,
  Volume2,
} from 'lucide-react';
import { pickTodaySaying, shuffledWindow } from '@/core/daily-picker';
import { getDailyTheme } from '@/core/daily-theme';
import { convertDateToLunar } from '@/core/lunar-calendar';
import { audioController } from '@/core/audio';
import { TYPE_LABELS, type Saying, type SayingCategory } from '@/core/types';
import { shouldIndentVerseLine, splitPoemLines } from '@/core/vietnamese';
import {
  getDailyTasks,
  getStreak,
  getTodayReflection,
  isFavorite,
  recordDailyRead,
  recordNotebookDiscovery,
  saveTodayReflection,
  toggleFavorite,
} from '@/lib/storage';
import { loadClientBundle } from '@/lib/client-bundle';
import CardStudioModal from './CardStudioModal';

interface Props {
  initialSayings: Saying[];
  initialToday: Saying;
  initialCategories: SayingCategory[];
}

export default function TodayDashboard({ initialSayings, initialToday, initialCategories }: Props) {
  const [sayings, setSayings] = useState<Saying[]>(initialSayings);
  const [categories, setCategories] = useState<SayingCategory[]>(initialCategories);
  const [todaySaying, setTodaySaying] = useState<Saying>(initialToday);
  const [activeSaying, setActiveSaying] = useState<Saying>(initialToday);
  const [isFlipped, setIsFlipped] = useState(false);
  const [fav, setFav] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [streak, setStreak] = useState({ current: 0, best: 0, week: [false, false, false, false, false, false, false] });
  const [tasks, setTasks] = useState({ hasReadDaily: false, hasCompletedDailyQuiz: false, hasDoneOracleOrFavorite: false });
  const [reflection, setReflection] = useState('');
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');

  const now = new Date();
  const lunar = convertDateToLunar(now);
  const theme = getDailyTheme(now);
  const dayNum = now.getDate();
  const monthYearLabel = now.toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', year: 'numeric' });

  useEffect(() => {
    loadClientBundle()
      .then((bundle) => {
        setSayings(bundle.sayings);
        setCategories(bundle.categories);
        audioController.setManifest(bundle.audio);
        const picked = pickTodaySaying(bundle.sayings, new Date());
        if (picked) {
          setTodaySaying(picked);
          setActiveSaying((prev) => (prev.id === initialToday.id ? picked : prev));
        }
      })
      .catch(() => {});

    const updatedStreak = recordDailyRead();
    setStreak(updatedStreak);
    setTasks(getDailyTasks());
    const refEntry = getTodayReflection();
    if (refEntry) setReflection(refEntry.note);

    const syncStorage = () => {
      setStreak(getStreak());
      setTasks(getDailyTasks());
      setFav(isFavorite(activeSaying.id));
    };
    window.addEventListener('loixua-storage-change', syncStorage);

    const unsubAudio = audioController.subscribe(() => {
      setPlayingId(audioController.getState().playingId);
    });

    return () => {
      window.removeEventListener('loixua-storage-change', syncStorage);
      unsubAudio();
    };
  }, []);

  useEffect(() => {
    setFav(isFavorite(activeSaying.id));
    recordNotebookDiscovery(activeSaying.id);
  }, [activeSaying.id]);

  const handleOtherSaying = () => {
    if (sayings.length <= 1) return;
    const pool = sayings.filter((s) => s.id !== activeSaying.id);
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (next) {
      setActiveSaying(next);
      setIsFlipped(next.id !== todaySaying.id);
    }
  };

  const handleBackToToday = () => {
    setActiveSaying(todaySaying);
    setIsFlipped(false);
  };

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    saveTodayReflection(todaySaying.id, reflection);
    setReflectionSaved(true);
    window.setTimeout(() => setReflectionSaved(false), 2000);
  };

  const handleSearchJump = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickQuery.trim();
    window.location.href = q ? `/tim-kiem?q=${encodeURIComponent(q)}` : '/tim-kiem';
  };

  const recommended = shuffledWindow(
    sayings.filter((s) => s.id !== todaySaying.id && (s.meaning?.length ?? 0) > 0),
    6,
    now,
    (s) => s.id
  );

  const lines = splitPoemLines(activeSaying.text);
  const completedTasksCount =
    (tasks.hasReadDaily ? 1 : 0) +
    (tasks.hasCompletedDailyQuiz ? 1 : 0) +
    (tasks.hasDoneOracleOrFavorite ? 1 : 0);

  return (
    <div className="space-y-10">
      {/* 1. Asymmetric Editorial Hero Spread */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_340px] items-start cdv-animate-pop">
        {/* Left: Primary Literary Showcase */}
        <article className="cdv-surface p-6 sm:p-9 space-y-6 relative">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--cdv-border)' }}>
            <div className="flex items-center gap-2.5">
              <span
                className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 12%, transparent)',
                  color: 'var(--cdv-cinnabar-text)',
                }}
              >
                {TYPE_LABELS[activeSaying.type]}
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--cdv-text-secondary)' }}>
                {isFlipped ? 'Ngẫu nhiên từ kho tàng' : theme.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isFlipped && (
                <button type="button" onClick={handleBackToToday} className="cdv-btn-secondary text-xs py-1 px-2.5">
                  Về câu hôm nay
                </button>
              )}
              <button
                type="button"
                onClick={handleOtherSaying}
                className="cdv-btn-secondary text-xs py-1 px-2.5"
                title="Đọc câu ngẫu nhiên khác"
              >
                <Shuffle size={13} aria-hidden="true" />
                <span>Câu khác</span>
              </button>
            </div>
          </div>

          <div className="py-1 sm:py-2 space-y-4">
            <h1 className="m-0 font-normal cdv-poem cdv-poem-hero cdv-poem-reading space-y-2.5">
              {lines.map((line, i) => (
                <span key={i} className={`block ${shouldIndentVerseLine(lines, i) ? 'cdv-lucbat-6' : ''}`}>
                  {line}
                </span>
              ))}
            </h1>

            {activeSaying.meaning && (
              <p className="cdv-prose cdv-prose-reading text-sm sm:text-base leading-relaxed m-0 pt-4 border-t" style={{ borderColor: 'var(--cdv-border)', color: 'var(--cdv-text-secondary)' }}>
                {activeSaying.meaning}
              </p>
            )}

            {(activeSaying.example || activeSaying.origin) && (
              <div className="cdv-elevated cdv-prose-reading p-3.5 sm:p-4 text-xs leading-relaxed space-y-1 cdv-prose" style={{ color: 'var(--cdv-text-secondary)' }}>
                {activeSaying.example && (
                  <p className="m-0 italic">“{activeSaying.example}”</p>
                )}
                {!activeSaying.example && activeSaying.origin && (
                  <p className="m-0 line-clamp-2">{activeSaying.origin}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--cdv-border)' }}>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => audioController.playSaying(activeSaying, 'verse')}
                className="cdv-btn-primary text-xs"
              >
                {playingId === activeSaying.id ? <Square size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
                <span>{playingId === activeSaying.id ? 'Dừng đọc' : 'Nghe giọng đọc'}</span>
              </button>

              <button
                type="button"
                onClick={() => setFav(toggleFavorite(activeSaying.id))}
                aria-pressed={fav}
                className="cdv-btn-secondary text-xs"
              >
                <Heart size={14} fill={fav ? 'currentColor' : 'none'} style={fav ? { color: 'var(--cdv-cinnabar-text)' } : undefined} aria-hidden="true" />
                <span>{fav ? 'Đã lưu' : 'Lưu câu'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(activeSaying.text).catch(() => {});
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                }}
                className="cdv-btn-secondary text-xs"
              >
                {copied ? <Check size={14} style={{ color: 'var(--cdv-bamboo-text)' }} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('loixua-open-card-studio', { detail: { saying: activeSaying } }))}
                className="cdv-btn-secondary text-xs"
              >
                <ImageIcon size={14} aria-hidden="true" />
                <span>Tạo thiệp</span>
              </button>
            </div>

            <a
              href={`/cau/${activeSaying.slug || activeSaying.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold no-underline hover:underline"
              style={{ color: 'var(--cdv-cinnabar-text)' }}
            >
              <span>Xem giải nghĩa &amp; từ cổ</span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </div>
        </article>

        {/* Right: Traditional Tear-off Desk Calendar & Daily Rhythm */}
        <aside className="flex flex-col gap-4">
          <div className="cdv-surface p-6 space-y-4">
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--cdv-text-secondary)' }}>
              <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                <Calendar size={14} aria-hidden="true" />
                <span>Lịch hôm nay</span>
              </span>
              <span className="font-semibold">{lunar.shortDisplay}</span>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-5xl font-bold tabular-nums leading-none" style={{ fontFamily: 'var(--cdv-poem-font)', color: 'var(--cdv-cinnabar-text)' }}>
                {String(dayNum).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold m-0 capitalize">{monthYearLabel}</p>
                <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--cdv-text-secondary)' }}>
                  {lunar.fullDisplay}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t flex flex-wrap gap-1.5 text-[11px]" style={{ borderColor: 'var(--cdv-border)', color: 'var(--cdv-text-secondary)' }}>
              <span className="px-2 py-0.5 rounded-md border" style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)' }}>
                Ngày {lunar.dayCanChi}
              </span>
              <span className="px-2 py-0.5 rounded-md border" style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)' }}>
                Tiết {lunar.solarTerm}
              </span>
              {lunar.specialOccasionLabel && (
                <span className="px-2 py-0.5 rounded-md font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--cdv-amber) 18%, transparent)', color: 'var(--cdv-amber-text)' }}>
                  {lunar.specialOccasionLabel}
                </span>
              )}
            </div>
          </div>

          <div className="cdv-surface p-5 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold m-0 inline-flex items-center gap-1.5">
                  <Flame size={15} style={{ color: 'var(--cdv-cinnabar-text)' }} aria-hidden="true" />
                  <span>Nhịp đọc hằng ngày</span>
                </h2>
                <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                  {streak.current} ngày · Kỷ lục {streak.best}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {streak.week.map((done, i) => (
                  <div
                    key={i}
                    className="h-6 rounded-md flex items-center justify-center text-[11px] font-bold border"
                    style={
                      done
                        ? { backgroundColor: 'var(--cdv-cinnabar-text)', color: 'var(--cdv-on-accent)', borderColor: 'var(--cdv-cinnabar-text)' }
                        : { backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text-tertiary)', borderColor: 'var(--cdv-border)' }
                    }
                  >
                    {done ? '✓' : '·'}
                  </div>
                ))}
              </div>

              <ul className="space-y-1.5 text-xs m-0 p-0 list-none pt-1">
                <li className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    {tasks.hasReadDaily ? <CheckCircle2 size={14} style={{ color: 'var(--cdv-bamboo-text)' }} /> : <Circle size={14} style={{ color: 'var(--cdv-text-tertiary)' }} />}
                    <span>Đọc câu hôm nay</span>
                  </span>
                  <span style={{ color: 'var(--cdv-text-tertiary)' }}>{completedTasksCount}/3</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    {tasks.hasCompletedDailyQuiz ? <CheckCircle2 size={14} style={{ color: 'var(--cdv-bamboo-text)' }} /> : <Circle size={14} style={{ color: 'var(--cdv-text-tertiary)' }} />}
                    <span>Đố nhanh 5 câu</span>
                  </span>
                  <a href="/do-vui-hom-nay" className="font-semibold no-underline hover:underline" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                    {tasks.hasCompletedDailyQuiz ? 'Xem lại' : 'Làm ngay'}
                  </a>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    {tasks.hasDoneOracleOrFavorite ? <CheckCircle2 size={14} style={{ color: 'var(--cdv-bamboo-text)' }} /> : <Circle size={14} style={{ color: 'var(--cdv-text-tertiary)' }} />}
                    <span>Gieo quẻ / Lưu câu</span>
                  </span>
                  <a href="/gieo-que" className="font-semibold no-underline hover:underline" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                    {tasks.hasDoneOracleOrFavorite ? 'Xong' : 'Gieo quẻ'}
                  </a>
                </li>
              </ul>
            </div>

            <form onSubmit={handleSaveReflection} className="pt-3 border-t flex gap-1.5" style={{ borderColor: 'var(--cdv-border)' }}>
              <label htmlFor="daily-reflection" className="visually-hidden">Cảm nhận một dòng hôm nay</label>
              <input
                id="daily-reflection"
                type="text"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                maxLength={160}
                placeholder="Ghi chú 1 dòng suy nghĩ hôm nay..."
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border text-xs"
                style={{ backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
              />
              <button type="submit" className="cdv-btn-secondary text-xs py-1.5 px-2.5 shrink-0">
                {reflectionSaved ? 'Đã lưu' : 'Ghi'}
              </button>
            </form>
          </div>
        </aside>
      </section>

      {/* 2. Priority Featured Experiences: Lướt thơ & Nghe ban đêm */}
      <section aria-label="Trải nghiệm được ưu tiên" className="grid gap-4 md:grid-cols-2">
        <a
          href="/luot-tho"
          className="cdv-card cdv-card-interactive p-5 sm:p-6 no-underline flex items-center justify-between gap-4"
          style={{
            color: 'var(--cdv-text)',
            borderColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 28%, var(--cdv-border))',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--cdv-cinnabar-text) 7%, var(--cdv-card)), var(--cdv-card))',
          }}
        >
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 14%, transparent)', color: 'var(--cdv-cinnabar-text)' }}
            >
              <BookOpen size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                Ưu tiên đọc · Tự động lướt
              </span>
              <h2 className="text-base sm:text-lg font-bold m-0">Không gian Lướt thơ</h2>
              <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--cdv-text-secondary)' }}>
                Đọc từng câu ca dao toàn màn hình, bật/tắt tự động lướt &amp; tùy chỉnh căn lề trái, giữa, phải.
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="shrink-0" style={{ color: 'var(--cdv-cinnabar-text)' }} aria-hidden="true" />
        </a>

        <a
          href="/nghe-ngu"
          className="cdv-card cdv-card-interactive p-5 sm:p-6 no-underline flex items-center justify-between gap-4"
          style={{
            color: 'var(--cdv-text)',
            borderColor: 'color-mix(in srgb, var(--cdv-indigo-text) 30%, var(--cdv-border))',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--cdv-indigo-text) 8%, var(--cdv-card)), var(--cdv-card))',
          }}
        >
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'color-mix(in srgb, var(--cdv-indigo-text) 15%, transparent)', color: 'var(--cdv-indigo-text)' }}
            >
              <Moon size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--cdv-indigo-text)' }}>
                Thư giãn ban đêm · Web Audio
              </span>
              <h2 className="text-base sm:text-lg font-bold m-0">Phòng Nghe ban đêm</h2>
              <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--cdv-text-secondary)' }}>
                Giọng đọc studio êm dịu hoà nhạc thiền ngũ cung, tự giảm nhạc khi đọc và hẹn giờ tắt.
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="shrink-0" style={{ color: 'var(--cdv-indigo-text)' }} aria-hidden="true" />
        </a>
      </section>

      {/* 3. Search & Topic Directory Strip */}
      <section className="cdv-surface p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold m-0">Tra cứu kho tàng 949 câu dân gian</h2>
            <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--cdv-text-secondary)' }}>
              Tìm kiếm không dấu, viết liền, gõ sai chính tả hoặc duyệt theo 15 chủ đề đời sống.
            </p>
          </div>
          <form onSubmit={handleSearchJump} className="flex gap-2 w-full md:w-96">
            <label htmlFor="home-search-input" className="visually-hidden">Tìm kiếm ca dao tục ngữ</label>
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--cdv-text-tertiary)' }} aria-hidden="true" />
              <input
                id="home-search-input"
                type="search"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Nhập câu hoặc ý nghĩa (vd: cong cha)..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                style={{ backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
              />
            </div>
            <button type="submit" className="cdv-btn-primary text-xs">Tìm</button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {categories.slice(0, 12).map((cat) => (
            <a
              key={cat.slug}
              href={`/chu-de/${cat.slug}`}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium no-underline hover:opacity-90 transition-colors"
              style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
            >
              {cat.name}
            </a>
          ))}
          <a
            href="/kham-pha"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold no-underline inline-flex items-center gap-1"
            style={{ color: 'var(--cdv-cinnabar-text)' }}
          >
            <span>Tất cả chủ đề</span>
            <ArrowRight size={13} aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* 3. Recommended Sayings — Multi-column Editorial Grid */}
      <section className="space-y-4">
        <div className="flex items-end justify-between border-b pb-3" style={{ borderColor: 'var(--cdv-border)' }}>
          <div>
            <h2 className="text-xl font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
              Tuyển chọn đọc thêm hôm nay
            </h2>
            <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--cdv-text-secondary)' }}>
              Xoay vòng đồng bộ mỗi ngày cùng ứng dụng iOS &amp; Android.
            </p>
          </div>
          <a href="/kham-pha" className="text-xs font-semibold no-underline hover:underline inline-flex items-center gap-1" style={{ color: 'var(--cdv-cinnabar-text)' }}>
            <span>Mở kho tàng</span>
            <ArrowRight size={13} aria-hidden="true" />
          </a>
        </div>

        <div className="cdv-masonry">
          {recommended.map((item) => (
            <a
              key={item.id}
              href={`/cau/${item.slug || item.id}`}
              className="cdv-card cdv-card-interactive cdv-editorial-card p-5 no-underline"
              style={{ color: 'var(--cdv-text)' }}
            >
              <div className="space-y-2.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                    {TYPE_LABELS[item.type]}
                  </span>
                  <ArrowRight size={14} style={{ color: 'var(--cdv-text-tertiary)' }} aria-hidden="true" />
                </div>
                <p className="cdv-poem text-base font-medium m-0 whitespace-pre-line">{item.text}</p>
              </div>
              {item.meaning && (
                <p className="text-xs m-0 line-clamp-3 pt-2.5 border-t" style={{ borderColor: 'var(--cdv-border)', color: 'var(--cdv-text-secondary)' }}>
                  {item.meaning}
                </p>
              )}
            </a>
          ))}
        </div>
      </section>

      {/* 5. Secondary Interactive Directory */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
          Trò chơi &amp; Sáng tạo khác
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/gieo-que', title: 'Gieo quẻ', desc: 'Rút thẻ lời tiền nhân theo tâm nguyện', Icon: Sparkles },
            { href: '/dau', title: 'Đấu nối vế 1v1', desc: 'Thi đấu thời gian thực & đấu Bot', Icon: Swords },
            { href: '/do-vui', title: 'Đố vui 20 câu', desc: 'Thử trí nhớ nhanh nối vế dân gian', Icon: CheckCircle2 },
            { href: '/tao-thiep', title: 'Studio thiệp', desc: 'Thiết kế ảnh thơ 4 tỉ lệ tải PNG', Icon: Palette },
          ].map(({ href, title, desc, Icon }) => (
            <a
              key={href}
              href={href}
              className="cdv-card cdv-card-interactive p-4 no-underline flex flex-col justify-between gap-3"
              style={{ color: 'var(--cdv-text)' }}
            >
              <div className="flex items-center justify-between">
                <Icon size={18} style={{ color: 'var(--cdv-cinnabar-text)' }} aria-hidden="true" />
                <ArrowRight size={14} style={{ color: 'var(--cdv-text-tertiary)' }} aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-sm m-0">{title}</p>
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--cdv-text-secondary)' }}>{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <CardStudioModal />
    </div>
  );
}
