import React, { useEffect, useRef, useState } from 'react';
import { Music, Volume2, VolumeX, X } from 'lucide-react';
import { audioController, ZEN_MODES } from '@/core/audio';
import { loadBgmPresets } from '@/lib/client-bundle';

export default function ZenMiniPlayer() {
  const [zenModeId, setZenModeId] = useState('off');
  const [volume, setVolume] = useState(0.45);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      const s = audioController.getState();
      setZenModeId(s.zenModeId);
      setVolume(s.zenVolume);
      window.dispatchEvent(new CustomEvent('loixua-zen-state', { detail: { playing: s.zenModeId !== 'off' } }));
    };
    sync();
    const unsub = audioController.subscribe(sync);

    const onToggle = () => setOpen((v) => !v);
    window.addEventListener('loixua-toggle-zen', onToggle);

    return () => {
      unsub();
      window.removeEventListener('loixua-toggle-zen', onToggle);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (panelRef.current?.contains(target)) return;
      if (target?.closest('#open-zen-btn')) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = ZEN_MODES.find((m) => m.id === zenModeId) ?? ZEN_MODES[0];

  const handleSelectMode = async (id: string) => {
    if (id === 'off') {
      audioController.stopZen();
      return;
    }
    const presets = await loadBgmPresets();
    await audioController.setZenMode(id, presets);
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Điều khiển nhạc nền thiền"
      className="fixed top-[4.35rem] right-4 z-40 w-[min(calc(100vw-2rem),21rem)] rounded-2xl border shadow-2xl p-4 space-y-3.5 cdv-animate-pop"
      style={{
        backgroundColor: 'var(--cdv-card)',
        borderColor: 'var(--cdv-border)',
        color: 'var(--cdv-text)',
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b pb-2.5" style={{ borderColor: 'var(--cdv-border)' }}>
        <div className="flex items-center gap-2 min-w-0">
          {zenModeId === 'off' ? (
            <VolumeX size={16} style={{ color: 'var(--cdv-text-secondary)' }} aria-hidden="true" />
          ) : (
            <Volume2 size={16} style={{ color: 'var(--cdv-bamboo-text)' }} aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold m-0 truncate">Nhạc nền thiền · {current.title}</p>
            <p className="text-[11px] m-0 truncate" style={{ color: 'var(--cdv-text-secondary)' }}>
              {current.subtitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Đóng bảng nhạc thiền"
          className="p-1.5 rounded-lg border cursor-pointer shrink-0"
          style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {ZEN_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => handleSelectMode(m.id)}
            aria-pressed={zenModeId === m.id}
            className="px-2.5 py-2 rounded-lg border text-left text-xs cursor-pointer transition-colors"
            style={
              zenModeId === m.id
                ? {
                    borderColor: 'var(--cdv-cinnabar-text)',
                    backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 12%, var(--cdv-elevated))',
                    color: 'var(--cdv-text)',
                    fontWeight: 600,
                  }
                : {
                    borderColor: 'var(--cdv-border)',
                    backgroundColor: 'var(--cdv-elevated)',
                    color: 'var(--cdv-text)',
                  }
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <Music size={12} style={{ color: zenModeId === m.id ? 'var(--cdv-cinnabar-text)' : 'var(--cdv-text-tertiary)' }} aria-hidden="true" />
              <span>{m.title}</span>
            </span>
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2.5 text-xs pt-1">
        <span style={{ color: 'var(--cdv-text-secondary)' }}>Âm lượng</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            audioController.setZenVolume(v);
          }}
          className="flex-1"
        />
      </label>
    </div>
  );
}
