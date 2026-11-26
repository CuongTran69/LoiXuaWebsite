import React, { useEffect, useMemo, useState } from 'react';
import { Search, Shuffle } from 'lucide-react';
import { pickTodaySaying } from '@/core/daily-picker';
import { SayingSearchEngine } from '@/core/search-engine';
import type { Saying } from '@/core/types';
import { loadClientBundle } from '@/lib/client-bundle';
import { CardStudioPanel } from './CardStudioModal';

export default function CardStudioPage({ initialSaying }: { initialSaying: Saying }) {
  const [sayings, setSayings] = useState<Saying[]>([initialSaying]);
  const [active, setActive] = useState<Saying>(initialSaying);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reqSlug = params.get('slug') || params.get('id') || '';
    loadClientBundle().then((b) => {
      setSayings(b.sayings);
      if (reqSlug) {
        const hit = b.sayings.find((s) => s.slug === reqSlug || s.id === reqSlug);
        if (hit) {
          setActive(hit);
          return;
        }
      }
      const today = pickTodaySaying(b.sayings, new Date(), true);
      if (today) setActive(today);
    });
  }, []);

  const engine = useMemo(() => new SayingSearchEngine(sayings), [sayings]);
  const suggestions = useMemo(() => {
    if (query.trim().length < 2) return [];
    return engine.search(query, 'all').sayings.slice(0, 6);
  }, [engine, query]);

  const pickAnother = () => {
    if (sayings.length <= 1) return;
    const next = sayings[Math.floor(Math.random() * sayings.length)];
    if (next) setActive(next);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <header className="border-b pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4" style={{ borderColor: 'var(--cdv-border)' }}>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
            Thiết kế ảnh chia sẻ
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
            Studio Thiệp Lời Xưa
          </h1>
          <p className="text-sm m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
            Chọn bất kỳ câu nào trong 949 câu để xuất ảnh PNG độ phân giải cao (9:16, 4:5, 1:1, 16:9).
          </p>
        </div>

        <div className="relative w-full md:w-96">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--cdv-text-tertiary)' }} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm câu khác để làm thiệp..."
                aria-label="Tìm câu làm thiệp"
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs"
                style={{ backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
              />
            </div>
            <button type="button" onClick={pickAnother} className="cdv-btn-secondary text-xs shrink-0">
              <Shuffle size={14} aria-hidden="true" />
              <span>Ngẫu nhiên</span>
            </button>
          </div>

          {suggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 mt-1.5 rounded-xl border shadow-xl z-20 p-1.5 space-y-1 max-h-64 overflow-y-auto"
              style={{ backgroundColor: 'var(--cdv-card)', borderColor: 'var(--cdv-border)' }}
            >
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActive(s);
                    setQuery('');
                  }}
                  className="w-full p-2.5 rounded-lg text-left text-xs cursor-pointer hover:opacity-90 border"
                  style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
                >
                  <span className="cdv-poem font-medium block line-clamp-2">{s.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <CardStudioPanel saying={active} />
    </div>
  );
}
