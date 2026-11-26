import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Search, Square, Trash2, Volume2, X } from 'lucide-react';
import { SayingSearchEngine, type SearchScope } from '@/core/search-engine';
import { searchNormalized } from '@/core/vietnamese';
import { TYPE_LABELS, type Saying, type SayingCategory } from '@/core/types';
import { audioController } from '@/core/audio';
import { loadClientBundle } from '@/lib/client-bundle';
import {
  clearRecentQueries,
  getRecentQueries,
  pushRecentQuery,
  removeRecentQuery,
} from '@/lib/storage';

function HighlightedPoem({ text, matchedWords }: { text: string; matchedWords: string[] }) {
  if (matchedWords.length === 0) {
    return <span className="whitespace-pre-line">{text}</span>;
  }
  const set = new Set(matchedWords);
  return (
    <span className="whitespace-pre-line">
      {text.split('\n').map((line, lIdx) => (
        <React.Fragment key={lIdx}>
          {lIdx > 0 && '\n'}
          {line.split(' ').map((token, tIdx) => {
            const norm = searchNormalized(token);
            const hit = norm && set.has(norm);
            return (
              <React.Fragment key={tIdx}>
                {tIdx > 0 && ' '}
                {hit ? (
                  <mark
                    className="rounded px-0.5 font-semibold"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 16%, transparent)',
                      color: 'var(--cdv-cinnabar-text)',
                    }}
                  >
                    {token}
                  </mark>
                ) : (
                  token
                )}
              </React.Fragment>
            );
          })}
        </React.Fragment>
      ))}
    </span>
  );
}

export default function SearchApp() {
  const [sayings, setSayings] = useState<Saying[]>([]);
  const [categories, setCategories] = useState<SayingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [recent, setRecent] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(30);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVisibleLimit(30);
  }, [query, scope, categorySlug]);

  useEffect(() => {
    setRecent(getRecentQueries());
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setQuery(q);

    loadClientBundle()
      .then((bundle) => {
        setSayings(bundle.sayings);
        setCategories(bundle.categories);
        audioController.setManifest(bundle.audio);
      })
      .finally(() => setLoading(false));

    return audioController.subscribe(() => {
      setPlayingId(audioController.getState().playingId);
    });
  }, []);

  const engine = useMemo(() => new SayingSearchEngine(sayings), [sayings]);

  const execution = useMemo(() => {
    return engine.search(query, scope, categorySlug || null);
  }, [engine, query, scope, categorySlug]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      pushRecentQuery(query.trim());
      setRecent(getRecentQueries());
    }
  };

  const resultsList =
    query.trim().length >= 2
      ? execution.results
      : execution.sayings.map((s) => ({
          saying: s,
          matchLevel: 1 as const,
          isPrefix: false,
          isWholeWord: true,
          matchedWords: [] as string[],
        }));

  return (
    <div className="space-y-6">
      <header className="space-y-1.5 border-b pb-5" style={{ borderColor: 'var(--cdv-border)' }}>
        <h1 className="text-2xl sm:text-3xl font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
          Tìm kiếm trong kho tàng 949 câu
        </h1>
        <p className="text-sm m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
          Hỗ trợ gõ không dấu (<code>cong cha nui thai son</code>), viết dính liền, sai chính tả nhẹ và tìm theo nghĩa.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)] items-start">
        {/* Left Facet Sidebar */}
        <aside className="cdv-surface p-5 space-y-5 lg:sticky lg:top-24">
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
              Thể loại
            </h2>
            <div className="grid gap-1.5" role="group" aria-label="Lọc theo thể loại">
              {(
                [
                  { id: 'all', label: 'Tất cả thể loại' },
                  { id: 'ca-dao', label: 'Ca dao' },
                  { id: 'tuc-ngu', label: 'Tục ngữ' },
                  { id: 'thanh-ngu', label: 'Thành ngữ' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={scope === tab.id}
                  onClick={() => setScope(tab.id)}
                  className="px-3 py-2 rounded-lg border text-left text-xs font-medium cursor-pointer"
                  style={
                    scope === tab.id
                      ? { backgroundColor: 'var(--cdv-cinnabar-text)', color: 'var(--cdv-on-accent)', borderColor: 'var(--cdv-cinnabar-text)', fontWeight: 600 }
                      : { backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)', borderColor: 'var(--cdv-border)' }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="search-cat-select" className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--cdv-text-tertiary)' }}>
              Chủ đề
            </label>
            <select
              id="search-cat-select"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-xs"
              style={{ backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
            >
              <option value="">Tất cả chủ đề</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {recent.length > 0 && (
            <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--cdv-border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
                  Tìm gần đây
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    clearRecentQueries();
                    setRecent([]);
                  }}
                  aria-label="Xóa tất cả lịch sử tìm kiếm"
                  className="p-1 bg-transparent border-0 cursor-pointer"
                  style={{ color: 'var(--cdv-text-tertiary)' }}
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs"
                    style={{ backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)' }}
                  >
                    <button
                      type="button"
                      onClick={() => setQuery(item)}
                      className="bg-transparent border-0 p-0 text-inherit cursor-pointer font-medium"
                    >
                      {item}
                    </button>
                    <button
                      type="button"
                      aria-label={`Xóa ${item}`}
                      onClick={() => {
                        removeRecentQuery(item);
                        setRecent(getRecentQueries());
                      }}
                      className="bg-transparent border-0 p-0 cursor-pointer opacity-60 hover:opacity-100"
                      style={{ color: 'var(--cdv-text)' }}
                    >
                      <X size={11} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right Search Workbench */}
        <div className="space-y-5">
          <form onSubmit={handleSubmit} className="cdv-surface p-3 flex gap-2">
            <label htmlFor="search-input" className="visually-hidden">
              Nhập từ khóa ca dao, tục ngữ, thành ngữ
            </label>
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--cdv-text-tertiary)' }} aria-hidden="true" />
              <input
                ref={inputRef}
                id="search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nhập từ khóa, câu thơ hoặc ý nghĩa (tối thiểu 2 ký tự)..."
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm"
                style={{ backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
              />
            </div>
            <button type="submit" className="cdv-btn-primary text-xs px-5">
              Tìm
            </button>
          </form>

          {loading ? (
            <p className="text-sm" style={{ color: 'var(--cdv-text-secondary)' }}>Đang tải dữ liệu tìm kiếm...</p>
          ) : query.trim().length < 2 && !categorySlug ? (
            <div className="cdv-surface p-8 text-center space-y-4">
              <p className="text-sm font-medium m-0">Nhập ít nhất 2 ký tự hoặc chọn một chủ đề bên trái để bắt đầu tra cứu.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['uống nước nhớ nguồn', 'cong cha nui thai son', 'hiếu thảo', 'bầu ơi thương lấy bí cùng', 'thang nam'].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setQuery(ex)}
                    className="cdv-btn-secondary text-xs"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : resultsList.length === 0 ? (
            <div className="cdv-surface p-8 text-center space-y-2">
              <p className="text-base font-bold m-0">Không tìm thấy câu phù hợp cho "{query}"</p>
              <p className="text-xs m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
                Thử rút gọn từ khóa, gõ không dấu hoặc bỏ bộ lọc chủ đề/thể loại.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs m-0 tabular-nums" style={{ color: 'var(--cdv-text-secondary)' }}>
                {execution.isFuzzyResult ? 'Gợi ý gần đúng: ' : ''}Tìm thấy <strong>{resultsList.length}</strong> kết quả
                {resultsList.length > visibleLimit ? ` (đang hiện ${visibleLimit} câu đầu)` : ''}
              </p>

              <div className="grid gap-4 md:grid-cols-2 items-start">
                {resultsList.slice(0, visibleLimit).map((r) => (
                  <div key={r.saying.id} className="cdv-card cdv-card-interactive cdv-editorial-card p-5">
                    <div className="space-y-2.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                          {TYPE_LABELS[r.saying.type]}
                        </span>
                        <button
                          type="button"
                          aria-label="Nghe câu này"
                          onClick={() => audioController.playSaying(r.saying, 'verse')}
                          className="p-1.5 rounded-md border cursor-pointer shrink-0"
                          style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
                        >
                          {playingId === r.saying.id ? <Square size={13} aria-hidden="true" /> : <Volume2 size={13} aria-hidden="true" />}
                        </button>
                      </div>

                      <a
                        href={`/cau/${r.saying.slug || r.saying.id}`}
                        onClick={() => query.trim().length >= 2 && pushRecentQuery(query.trim())}
                        className="no-underline block min-w-0"
                        style={{ color: 'var(--cdv-text)' }}
                      >
                        <p className="cdv-poem text-base font-medium m-0">
                          <HighlightedPoem text={r.saying.text} matchedWords={r.matchedWords} />
                        </p>
                      </a>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t text-xs min-w-0" style={{ borderColor: 'var(--cdv-border)', color: 'var(--cdv-text-secondary)' }}>
                      <span className="truncate min-w-0 flex-1">{r.saying.meaning || 'Xem chi tiết'}</span>
                      <a
                        href={`/cau/${r.saying.slug || r.saying.id}`}
                        className="inline-flex items-center gap-1 font-semibold shrink-0 no-underline hover:underline"
                        style={{ color: 'var(--cdv-cinnabar-text)' }}
                      >
                        <span>Xem</span>
                        <ArrowRight size={12} aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {resultsList.length > visibleLimit && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleLimit((n) => n + 30)}
                    className="cdv-btn-secondary text-xs px-5"
                  >
                    Xem thêm {Math.min(30, resultsList.length - visibleLimit)} kết quả (còn {resultsList.length - visibleLimit})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
