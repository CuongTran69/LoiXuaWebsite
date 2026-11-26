import React, { useEffect, useState } from 'react';
import { Heart, Image as ImageIcon, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { drawOracle, ORACLE_INTENTS, type OracleIntent, type OracleResult } from '@/core/oracle';
import { audioController } from '@/core/audio';
import { TYPE_LABELS, type Saying } from '@/core/types';
import { shouldIndentVerseLine, splitPoemLines } from '@/core/vietnamese';
import { loadClientBundle } from '@/lib/client-bundle';
import { isFavorite, markOracleOrFavoriteTaskDone, recordNotebookDiscovery, toggleFavorite } from '@/lib/storage';
import CardStudioModal from './CardStudioModal';

function BambooCylinderSVG({ phase }: { phase: 'idle' | 'shaking' | 'emerged' | 'revealed' }) {
  return (
    <svg
      width="120"
      height="156"
      viewBox="0 0 120 156"
      fill="none"
      aria-hidden="true"
      className={phase === 'shaking' ? 'cdv-animate-shake' : ''}
    >
      {/* Emerging lucky stick */}
      <g style={{ transform: phase === 'emerged' || phase === 'revealed' ? 'translateY(-18px)' : 'translateY(0px)', transition: 'transform 0.35s ease' }}>
        <rect x="54" y="14" width="12" height="58" rx="3" fill="#D4B97D" stroke="#7D5D24" strokeWidth="2" />
        <rect x="54" y="14" width="12" height="12" rx="2" fill="#A3422B" />
      </g>
      {/* Background sticks */}
      <rect x="40" y="34" width="9" height="38" rx="2" fill="#C4A86C" stroke="#7D5D24" strokeWidth="1.5" transform="rotate(-8 40 34)" />
      <rect x="70" y="32" width="9" height="40" rx="2" fill="#C4A86C" stroke="#7D5D24" strokeWidth="1.5" transform="rotate(7 70 32)" />
      {/* Bamboo tube */}
      <rect x="30" y="56" width="60" height="86" rx="10" fill="#8C6239" stroke="#4F341B" strokeWidth="2.5" />
      <ellipse cx="60" cy="56" rx="30" ry="7" fill="#6F4C2B" stroke="#4F341B" strokeWidth="2" />
      {/* Bamboo rings */}
      <path d="M30 92 Q60 98 90 92" stroke="#4F341B" strokeWidth="2" fill="none" />
      <path d="M30 124 Q60 130 90 124" stroke="#4F341B" strokeWidth="2" fill="none" />
      {/* Label plaque */}
      <rect x="46" y="72" width="28" height="40" rx="4" fill="#FCF9F2" stroke="#A3422B" strokeWidth="1.5" />
      <text x="60" y="96" textAnchor="middle" fill="#A3422B" fontSize="11" fontWeight="700" fontFamily="Georgia, serif">
        XĂM
      </text>
    </svg>
  );
}

export default function OracleDraw() {
  const [sayings, setSayings] = useState<Saying[]>([]);
  const [intent, setIntent] = useState<OracleIntent>(ORACLE_INTENTS[5]);
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'emerged' | 'revealed'>('idle');
  const [result, setResult] = useState<OracleResult | null>(null);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    loadClientBundle().then((b) => {
      setSayings(b.sayings);
      audioController.setManifest(b.audio);
    });
  }, []);

  useEffect(() => {
    if (result) setFav(isFavorite(result.saying.id));
  }, [result?.saying.id]);

  const handleDraw = () => {
    if (sayings.length === 0 || phase === 'shaking' || phase === 'emerged') return;
    setPhase('shaking');
    setResult(null);

    window.setTimeout(() => {
      setPhase('emerged');
    }, 950);

    window.setTimeout(() => {
      const res = drawOracle(sayings, intent);
      if (res) {
        setResult(res);
        setPhase('revealed');
        recordNotebookDiscovery(res.saying.id);
        markOracleOrFavoriteTaskDone();
      } else {
        setPhase('idle');
      }
    }, 1550);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="border-b pb-5 space-y-1.5" style={{ borderColor: 'var(--cdv-border)' }}>
        <p className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
          Nghi thức dân gian
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
          Gieo quẻ Lời Xưa
        </h1>
        <p className="text-sm m-0 cdv-prose" style={{ color: 'var(--cdv-text-secondary)' }}>
          Tĩnh tâm chọn một tâm nguyện, lắc ống xăm tre để đón nhận lời nhắn nhủ từ kho tàng ca dao Việt.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] items-start">
        {/* Left: Intent selector + Bamboo Shaker */}
        <section className="cdv-surface p-5 sm:p-6 space-y-5">
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
              1. Chọn tâm nguyện
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {ORACLE_INTENTS.map((item) => {
                const active = intent.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setIntent(item)}
                    className="p-3 rounded-lg border text-left cursor-pointer transition-colors"
                    style={
                      active
                        ? { borderColor: 'var(--cdv-cinnabar-text)', backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 10%, var(--cdv-elevated))' }
                        : { borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)' }
                    }
                  >
                    <p className="font-bold text-xs m-0" style={{ color: active ? 'var(--cdv-cinnabar-text)' : 'var(--cdv-text)' }}>
                      {item.title}
                    </p>
                    <p className="text-[11px] leading-snug m-0 mt-1" style={{ color: 'var(--cdv-text-secondary)' }}>
                      {item.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t flex flex-col items-center gap-4 text-center" style={{ borderColor: 'var(--cdv-border)' }}>
            <BambooCylinderSVG phase={phase} />
            <button
              type="button"
              onClick={handleDraw}
              disabled={sayings.length === 0 || phase === 'shaking' || phase === 'emerged'}
              className="cdv-btn-primary w-full py-2.5 text-sm disabled:opacity-60"
            >
              <Sparkles size={15} aria-hidden="true" />
              <span>
                {phase === 'shaking'
                  ? 'Đang thành tâm lắc xăm...'
                  : phase === 'emerged'
                    ? 'Đang mở thẻ quẻ...'
                    : result
                      ? 'Gieo quẻ mới'
                      : 'Thành tâm gieo quẻ'}
              </span>
            </button>
          </div>
        </section>

        {/* Right: Fortune Slip Showcase */}
        <section className="min-h-[420px]">
          {!result ? (
            <div className="cdv-surface p-8 sm:p-12 h-full flex flex-col items-center justify-center text-center space-y-3 border-dashed">
              <p className="font-bold text-lg m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
                {phase === 'idle' ? `Tâm nguyện: ${intent.title}` : 'Đang rút thẻ lời xưa...'}
              </p>
              <p className="text-sm m-0 max-w-md" style={{ color: 'var(--cdv-text-secondary)' }}>
                {intent.subtitle}. Nhấn nút bên trái để rút một thẻ câu ca dao mang thông điệp dành riêng cho bạn lúc này.
              </p>
            </div>
          ) : (
            <article className="cdv-surface p-6 sm:p-10 space-y-6 cdv-animate-pop" style={{ borderColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 40%, var(--cdv-border))' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--cdv-border)' }}>
                <div>
                  <span
                    className="inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 12%, transparent)', color: result.omenColor }}
                  >
                    Quẻ {result.omenTier} · {result.intent.title}
                  </span>
                  <p className="text-xs m-0 mt-1.5" style={{ color: 'var(--cdv-text-secondary)' }}>
                    {result.omenSubtitle}
                  </p>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cdv-text-tertiary)' }}>
                  {TYPE_LABELS[result.saying.type]}
                </span>
              </div>

              <div className="cdv-poem cdv-poem-hero cdv-poem-reading space-y-2 py-2">
                {splitPoemLines(result.saying.text).map((line, i, arr) => (
                  <p key={i} className={`m-0 ${shouldIndentVerseLine(arr, i) ? 'cdv-lucbat-6' : ''}`}>
                    {line}
                  </p>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="cdv-elevated p-4 space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                    Lời bình tiền nhân
                  </p>
                  <p className="text-sm leading-relaxed m-0">{result.interpretation}</p>
                </div>

                <div className="cdv-elevated p-4 space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-bamboo-text)' }}>
                    Việc lành hôm nay
                  </p>
                  <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
                    {result.dailyAction}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: 'var(--cdv-border)' }}>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => audioController.playSaying(result.saying, 'verse')} className="cdv-btn-primary text-xs">
                    <Volume2 size={14} aria-hidden="true" />
                    <span>Nghe đọc</span>
                  </button>
                  <button type="button" onClick={() => setFav(toggleFavorite(result.saying.id))} aria-pressed={fav} className="cdv-btn-secondary text-xs">
                    <Heart size={14} fill={fav ? 'currentColor' : 'none'} style={fav ? { color: 'var(--cdv-cinnabar-text)' } : undefined} aria-hidden="true" />
                    <span>{fav ? 'Đã lưu' : 'Lưu quẻ'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('loixua-open-card-studio', { detail: { saying: result.saying } }))}
                    className="cdv-btn-secondary text-xs"
                  >
                    <ImageIcon size={14} aria-hidden="true" />
                    <span>Tạo thiệp</span>
                  </button>
                  <a href={`/cau/${result.saying.slug || result.saying.id}`} className="cdv-btn-secondary text-xs">
                    Giải nghĩa →
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPhase('idle');
                    setResult(null);
                  }}
                  className="cdv-btn-secondary text-xs"
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  <span>Đặt lại</span>
                </button>
              </div>
            </article>
          )}
        </section>
      </div>

      <CardStudioModal />
    </div>
  );
}
