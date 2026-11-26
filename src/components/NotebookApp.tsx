import React, { useEffect, useMemo, useState } from 'react';
import { Award, BookMarked, BookOpen, Compass, Flame, Hammer, Heart, MessageSquareQuote, Shield, Sparkles, Stamp } from 'lucide-react';
import { evaluateAlbums, evaluateSeals } from '@/core/notebook';
import type { Saying } from '@/core/types';
import { loadClientBundle } from '@/lib/client-bundle';
import { getFavorites, getNotebookIds, getReflections } from '@/lib/storage';

const SEAL_ICONS: Record<string, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  'seal-5': BookOpen,
  'seal-25': Compass,
  'seal-50': Heart,
  'seal-100': Award,
  'seal-250': Sparkles,
  'seal-album-hieu': Heart,
  'seal-album-dao-ly': Shield,
  'seal-album-y-chi': Hammer,
  'seal-album-hon-que': Flame,
};

export default function NotebookApp() {
  const [sayings, setSayings] = useState<Saying[]>([]);
  const [recordedIds, setRecordedIds] = useState<string[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [refCount, setRefCount] = useState(0);

  useEffect(() => {
    setRecordedIds(getNotebookIds());
    setFavCount(getFavorites().length);
    setRefCount(getReflections().length);
    loadClientBundle().then((b) => setSayings(b.sayings));
  }, []);

  const discoveredSet = useMemo(() => new Set(recordedIds), [recordedIds]);
  const albums = useMemo(() => evaluateAlbums(sayings, discoveredSet), [sayings, discoveredSet]);
  const seals = useMemo(() => evaluateSeals(discoveredSet.size, albums), [discoveredSet.size, albums]);

  return (
    <div className="space-y-8">
      <header className="border-b pb-5 flex flex-wrap items-end justify-between gap-4" style={{ borderColor: 'var(--cdv-border)' }}>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
            Thư viện cá nhân
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
            Sổ tay &amp; Con dấu tri thức
          </h1>
          <p className="text-sm m-0 tabular-nums" style={{ color: 'var(--cdv-text-secondary)' }}>
            Đã khám phá <strong>{discoveredSet.size}</strong>/{sayings.length || 949} câu trong kho tàng Lời Xưa.
          </p>
        </div>

        <nav aria-label="Chuyển mục thư viện" className="flex flex-wrap gap-2">
          <a href="/da-luu" className="cdv-btn-secondary text-xs">
            <Heart size={14} aria-hidden="true" />
            <span>Đã lưu ({favCount})</span>
          </a>
          <a href="/da-luu#reflections" className="cdv-btn-secondary text-xs">
            <MessageSquareQuote size={14} aria-hidden="true" />
            <span>Cảm nhận ({refCount})</span>
          </a>
          <span aria-current="page" className="cdv-btn-primary text-xs">
            <BookMarked size={14} aria-hidden="true" />
            <span>Sổ tay &amp; Triện</span>
          </span>
        </nav>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-bold m-0">Bộ Con dấu tri thức</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {seals.map((seal) => {
            const Icon = SEAL_ICONS[seal.id] ?? Stamp;
            return (
              <div
                key={seal.id}
                className="cdv-card p-5 space-y-2"
                style={
                  seal.isUnlocked
                    ? { borderColor: 'var(--cdv-cinnabar-text)', backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 7%, var(--cdv-card))' }
                    : { opacity: 0.72 }
                }
              >
                <div className="flex items-center justify-between">
                  <div
                    className="p-2 rounded-lg"
                    style={
                      seal.isUnlocked
                        ? { backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 14%, transparent)', color: 'var(--cdv-cinnabar-text)' }
                        : { backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text-tertiary)' }
                    }
                  >
                    <Icon size={18} aria-hidden={true} />
                  </div>
                  <span
                    className="text-[11px] font-bold tabular-nums px-2.5 py-0.5 rounded-md"
                    style={
                      seal.isUnlocked
                        ? { backgroundColor: 'var(--cdv-cinnabar-text)', color: 'var(--cdv-on-accent)' }
                        : { backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text-secondary)' }
                    }
                  >
                    {seal.isUnlocked ? 'Đã khai ấn' : `${Math.min(seal.currentProgress, seal.threshold)}/${seal.threshold}`}
                  </span>
                </div>
                <p className="font-bold text-sm m-0">{seal.title}</p>
                <p className="text-xs m-0" style={{ color: 'var(--cdv-text-secondary)' }}>{seal.subtitle}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold m-0">Tủ sách theo 7 chủ đề</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {albums.map((alb) => {
            const pct = alb.totalCount > 0 ? Math.round((alb.discoveredCount / alb.totalCount) * 100) : 0;
            return (
              <a
                key={alb.id}
                href={`/chu-de/${alb.categoryKeys[0]}`}
                className="cdv-card cdv-card-interactive p-5 space-y-3 no-underline block"
                style={{ color: 'var(--cdv-text)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base">{alb.title}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                    {alb.discoveredCount}/{alb.totalCount} ({pct}%)
                  </span>
                </div>
                <p className="text-xs m-0" style={{ color: 'var(--cdv-text-secondary)' }}>{alb.subtitle}</p>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cdv-border)' }}>
                  <div className="h-full" style={{ width: `${pct}%`, backgroundColor: 'var(--cdv-bamboo-text)' }} />
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
