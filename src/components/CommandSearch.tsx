import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Search, Volume2, X } from 'lucide-react';
import { SayingSearchEngine } from '@/core/search-engine';
import { TYPE_LABELS, type Saying } from '@/core/types';
import { audioController } from '@/core/audio';
import { loadClientBundle } from '@/lib/client-bundle';

export default function CommandSearch() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sayings, setSayings] = useState<Saying[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const openHandler = () => {
      if (sayings.length === 0) {
        loadClientBundle().then((b) => {
          setSayings(b.sayings);
          audioController.setManifest(b.audio);
        });
      }
      dialogRef.current?.showModal();
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener('loixua-open-search', openHandler);

    const dialog = dialogRef.current;
    const clickHandler = (event: MouseEvent) => {
      if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!inside) dialog.close();
    };
    dialog?.addEventListener('click', clickHandler);

    return () => {
      window.removeEventListener('loixua-open-search', openHandler);
      dialog?.removeEventListener('click', clickHandler);
    };
  }, [sayings.length]);

  const engine = useMemo(() => new SayingSearchEngine(sayings), [sayings]);

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    return engine.search(query, 'all').results.slice(0, 8);
  }, [engine, query]);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="cmd-search-title"
      className="cdv-dialog"
      style={{ maxWidth: 'min(94vw, 42rem)' }}
    >
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b pb-3" style={{ borderColor: 'var(--cdv-border)' }}>
          <Search size={18} style={{ color: 'var(--cdv-text-secondary)' }} aria-hidden="true" />
          <label id="cmd-search-title" htmlFor="cmd-search-input" className="visually-hidden">
            Tìm nhanh ca dao, tục ngữ, thành ngữ
          </label>
          <input
            ref={inputRef}
            id="cmd-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm câu ca dao, từ khóa không dấu, hoặc ý nghĩa..."
            className="flex-1 bg-transparent border-0 text-sm sm:text-base focus:outline-none"
            style={{ color: 'var(--cdv-text)' }}
          />
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Đóng tìm nhanh"
            className="p-1.5 rounded-lg border cursor-pointer"
            style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {query.trim().length < 2 ? (
          <div className="space-y-3 py-2 text-xs" style={{ color: 'var(--cdv-text-secondary)' }}>
            <p className="m-0">Gợi ý tìm thử:</p>
            <div className="flex flex-wrap gap-2">
              {['công cha', 'uong nuoc nho nguon', 'hiếu thảo', 'bầu ơi', 'tháng năm'].map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => setQuery(hint)}
                  className="px-3 py-1.5 rounded-lg border cursor-pointer text-xs"
                  style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
                >
                  {hint}
                </button>
              ))}
            </div>
            <div className="pt-2 border-t flex justify-between items-center" style={{ borderColor: 'var(--cdv-border)' }}>
              <span>Mẹo: Nhấn <kbd className="font-mono px-1 border rounded">/</kbd> hoặc <kbd className="font-mono px-1 border rounded">⌘K</kbd> bất cứ đâu để mở</span>
              <a href="/tim-kiem" className="font-semibold underline" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                Tìm kiếm nâng cao →
              </a>
            </div>
          </div>
        ) : results.length === 0 ? (
          <p className="text-sm text-center py-6 m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
            Không tìm thấy kết quả phù hợp cho "{query}".
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[55dvh] overflow-y-auto pr-1">
            {results.map((r) => (
              <div
                key={r.saying.id}
                className="flex items-start justify-between gap-3 p-3 rounded-xl border hover:opacity-95"
                style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)' }}
              >
                <a href={`/cau/${r.saying.slug || r.saying.id}`} className="flex-1 min-w-0 no-underline" style={{ color: 'var(--cdv-text)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                    {TYPE_LABELS[r.saying.type]}
                  </span>
                  <p className="cdv-poem text-sm font-semibold m-0 mt-0.5 line-clamp-2 whitespace-pre-line">
                    {r.saying.text}
                  </p>
                </a>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Nghe câu này"
                    onClick={() => audioController.playSaying(r.saying, 'verse')}
                    className="p-2 rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-card)', color: 'var(--cdv-text)' }}
                  >
                    <Volume2 size={14} aria-hidden="true" />
                  </button>
                  <a
                    href={`/cau/${r.saying.slug || r.saying.id}`}
                    aria-label="Mở chi tiết"
                    className="p-2 rounded-lg border no-underline"
                    style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-card)', color: 'var(--cdv-cinnabar-text)' }}
                  >
                    <ArrowRight size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>
            ))}
            <div className="pt-2 text-right">
              <a
                href={`/tim-kiem?q=${encodeURIComponent(query)}`}
                className="text-xs font-semibold underline"
                style={{ color: 'var(--cdv-cinnabar-text)' }}
              >
                Xem tất cả kết quả cho "{query}" →
              </a>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
