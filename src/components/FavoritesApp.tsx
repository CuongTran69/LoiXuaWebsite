import React, { useEffect, useMemo, useState } from 'react';
import { BookMarked, Heart, Search, Square, Trash2, Volume2 } from 'lucide-react';
import { TYPE_LABELS, type Saying, type SayingType } from '@/core/types';
import { searchNormalized } from '@/core/vietnamese';
import { audioController } from '@/core/audio';
import { loadClientBundle } from '@/lib/client-bundle';
import { getFavorites, getReflections, toggleFavorite, type FavoriteEntry, type ReflectionEntry } from '@/lib/storage';

export default function FavoritesApp() {
  const [sayings, setSayings] = useState<Saying[]>([]);
  const [entries, setEntries] = useState<FavoriteEntry[]>([]);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [tab, setTab] = useState<'favorites' | 'reflections'>('favorites');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SayingType>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(getFavorites());
    setReflections(getReflections());
    if (window.location.hash === '#reflections') setTab('reflections');
    loadClientBundle().then((b) => {
      setSayings(b.sayings);
      audioController.setManifest(b.audio);
    });

    const sync = () => {
      setEntries(getFavorites());
      setReflections(getReflections());
    };
    window.addEventListener('loixua-storage-change', sync);
    const unsubAudio = audioController.subscribe(() => setPlayingId(audioController.getState().playingId));
    return () => {
      window.removeEventListener('loixua-storage-change', sync);
      unsubAudio();
    };
  }, []);

  const byId = useMemo(() => new Map(sayings.map((s) => [s.id, s])), [sayings]);

  const items = useMemo(() => {
    const qNorm = searchNormalized(query);
    return entries
      .map((e) => ({ entry: e, saying: byId.get(e.id) }))
      .filter((x): x is { entry: FavoriteEntry; saying: Saying } => Boolean(x.saying))
      .filter((x) => typeFilter === 'all' || x.saying.type === typeFilter)
      .filter((x) => {
        if (!qNorm) return true;
        return (
          searchNormalized(x.saying.text).includes(qNorm) ||
          (x.saying.meaning ? searchNormalized(x.saying.meaning).includes(qNorm) : false)
        );
      });
  }, [byId, entries, query, typeFilter]);

  return (
    <div className="space-y-8">
      <header className="border-b pb-5 flex flex-wrap items-end justify-between gap-4" style={{ borderColor: 'var(--cdv-border)' }}>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
            Thư viện cá nhân
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
            Câu đã lưu &amp; Nhật ký đọc
          </h1>
          <p className="text-xs m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
            Lưu cục bộ trên trình duyệt · Có thể xuất/nhập JSON trong Cài đặt.
          </p>
        </div>

        <nav aria-label="Chuyển mục thư viện" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={tab === 'favorites'}
            onClick={() => setTab('favorites')}
            className={tab === 'favorites' ? 'cdv-btn-primary text-xs' : 'cdv-btn-secondary text-xs'}
          >
            <Heart size={14} aria-hidden="true" />
            <span>Đã lưu ({entries.length})</span>
          </button>
          <button
            type="button"
            aria-pressed={tab === 'reflections'}
            onClick={() => setTab('reflections')}
            className={tab === 'reflections' ? 'cdv-btn-primary text-xs' : 'cdv-btn-secondary text-xs'}
          >
            <span>Cảm nhận ({reflections.length})</span>
          </button>
          <a href="/so-tay" className="cdv-btn-secondary text-xs">
            <BookMarked size={14} aria-hidden="true" />
            <span>Sổ tay &amp; Triện</span>
          </a>
        </nav>
      </header>

      {tab === 'favorites' ? (
        <>
          {entries.length > 0 && (
            <div className="cdv-surface p-4 flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--cdv-text-tertiary)' }} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm trong danh sách đã lưu..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                  style={{ backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'ca-dao', 'tuc-ngu', 'thanh-ngu'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={typeFilter === t}
                    onClick={() => setTypeFilter(t)}
                    className="px-3 py-1.5 rounded-lg border text-xs cursor-pointer"
                    style={
                      typeFilter === t
                        ? { backgroundColor: 'var(--cdv-cinnabar-text)', color: 'var(--cdv-on-accent)', borderColor: 'var(--cdv-cinnabar-text)', fontWeight: 600 }
                        : { backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)' }
                    }
                  >
                    {t === 'all' ? 'Tất cả' : TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="cdv-surface p-10 text-center space-y-3 max-w-lg mx-auto">
              <Heart size={32} className="mx-auto" style={{ color: 'var(--cdv-text-tertiary)' }} aria-hidden="true" />
              <h2 className="text-lg font-bold m-0">Chưa có câu nào được lưu</h2>
              <p className="text-xs m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
                Bấm nút Lưu câu ở bất kỳ trang câu nói nào để gom vào thư viện riêng của bạn.
              </p>
              <a href="/kham-pha" className="cdv-btn-primary text-xs inline-flex">
                Khám phá kho tàng
              </a>
            </div>
          ) : (
            <div className="cdv-masonry">
              {items.map(({ saying }) => (
                <div key={saying.id} className="cdv-card cdv-card-interactive cdv-editorial-card p-5">
                  <div className="space-y-2.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--cdv-cinnabar-text)' }}>
                        {TYPE_LABELS[saying.type]}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label="Nghe câu này"
                          onClick={() => audioController.playSaying(saying, 'verse')}
                          className="p-1.5 rounded-md border cursor-pointer"
                          style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
                        >
                          {playingId === saying.id ? <Square size={13} aria-hidden="true" /> : <Volume2 size={13} aria-hidden="true" />}
                        </button>
                        <button
                          type="button"
                          aria-label="Bỏ khỏi đã lưu"
                          onClick={() => {
                            toggleFavorite(saying.id);
                            setEntries(getFavorites());
                          }}
                          className="p-1.5 rounded-md border cursor-pointer"
                          style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text-secondary)' }}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <a href={`/cau/${saying.slug || saying.id}`} className="no-underline block min-w-0" style={{ color: 'var(--cdv-text)' }}>
                      <p className="cdv-poem text-base font-medium m-0 whitespace-pre-line">{saying.text}</p>
                    </a>
                  </div>
                  {saying.meaning && (
                    <p className="text-xs m-0 line-clamp-2 pt-2.5 border-t" style={{ borderColor: 'var(--cdv-border)', color: 'var(--cdv-text-secondary)' }}>
                      {saying.meaning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : reflections.length === 0 ? (
        <div className="cdv-surface p-10 text-center space-y-2 max-w-lg mx-auto">
          <h2 className="text-lg font-bold m-0">Chưa có ghi chú cảm nhận</h2>
          <p className="text-xs m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
            Bạn có thể viết cảm nhận một dòng ngay trên trang Hôm nay để lưu lại nhật ký đọc hằng ngày.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reflections.map((r, i) => {
            const s = byId.get(r.sayingId);
            return (
              <div key={i} className="cdv-surface p-5 space-y-2">
                <p className="text-xs m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
                  {new Date(r.updatedAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-sm font-medium m-0">"{r.note}"</p>
                {s && (
                  <a href={`/cau/${s.slug || s.id}`} className="cdv-poem text-xs block pt-2 border-t no-underline hover:underline" style={{ borderColor: 'var(--cdv-border)', color: 'var(--cdv-cinnabar-text)' }}>
                    {s.text.split('\n')[0]}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
