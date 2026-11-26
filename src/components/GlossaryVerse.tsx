import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { shouldIndentVerseLine, splitPoemLines } from '@/core/vietnamese';
import type { GlossaryEntry } from '@/core/types';

interface Props {
  text: string;
  glossary?: GlossaryEntry[] | null;
  hero?: boolean;
  center?: boolean;
  asHeading?: boolean;
}

interface ActiveTip {
  key: string;
  entry: GlossaryEntry;
  top: number;
  left: number;
}

export default function GlossaryVerse({
  text,
  glossary,
  hero = false,
  center = false,
  asHeading = false,
}: Props) {
  const lines = splitPoemLines(text);
  const entries = (glossary ?? []).filter((g) => g.word.trim().length > 0);
  const [tip, setTip] = useState<ActiveTip | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tip) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (tipRef.current?.contains(target)) return;
      if (target?.dataset.glossaryKey === tip.key) return;
      setTip(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTip(null);
    };
    const onScroll = () => setTip(null);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, [tip]);

  const handleWordClick = (key: string, entry: GlossaryEntry, el: HTMLButtonElement) => {
    if (tip?.key === key) {
      setTip(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const maxWidth = Math.min(340, window.innerWidth - 32);
    const left = Math.max(16, Math.min(r.left, window.innerWidth - maxWidth - 16));
    const preferBelow = r.bottom + 140 <= window.innerHeight;
    const top = preferBelow ? r.bottom + 8 : Math.max(72, r.top - 120);
    setTip({ key, entry, top, left });
  };

  const renderLine = (line: string, lineIdx: number) => {
    if (entries.length === 0) return line;

    const sorted = [...entries].sort((a, b) => b.word.length - a.word.length);
    const escaped = sorted.map((e) => e.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = line.split(regex);

    return parts.map((part, idx) => {
      const match = sorted.find((e) => e.word.toLowerCase() === part.toLowerCase());
      if (!match) return <React.Fragment key={idx}>{part}</React.Fragment>;
      const key = `${lineIdx}-${idx}`;
      const isOpen = tip?.key === key;
      return (
        <button
          key={idx}
          type="button"
          data-glossary-key={key}
          aria-expanded={isOpen}
          onClick={(e) => handleWordClick(key, match, e.currentTarget)}
          className="inline border-0 border-b border-dashed bg-transparent p-0 font-inherit text-inherit cursor-pointer hover:opacity-80"
          style={{ borderColor: 'var(--cdv-cinnabar-text)' }}
          aria-label={`Giải nghĩa từ: ${part}`}
        >
          {part}
        </button>
      );
    });
  };

  const baseClass = `m-0 font-normal cdv-poem ${hero ? 'cdv-poem-hero cdv-poem-reading' : 'cdv-poem-regular'} ${center ? 'text-center' : ''} space-y-2`;

  return (
    <>
      {asHeading ? (
        <h1 className={baseClass}>
          {lines.map((line, idx) => (
            <span key={idx} className={`block ${!center && shouldIndentVerseLine(lines, idx) ? 'cdv-lucbat-6' : ''}`}>
              {renderLine(line, idx)}
            </span>
          ))}
        </h1>
      ) : (
        <div className={baseClass}>
          {lines.map((line, idx) => (
            <p key={idx} className={`m-0 ${!center && shouldIndentVerseLine(lines, idx) ? 'cdv-lucbat-6' : ''}`}>
              {renderLine(line, idx)}
            </p>
          ))}
        </div>
      )}

      {tip && (
        <div
          ref={tipRef}
          role="dialog"
          aria-label={`Chú giải từ ${tip.entry.word}`}
          className="fixed z-40 rounded-xl border p-3.5 shadow-xl text-left font-sans cdv-animate-pop"
          style={{
            top: `${tip.top}px`,
            left: `${tip.left}px`,
            width: 'min(calc(100vw - 32px), 340px)',
            backgroundColor: 'var(--cdv-elevated)',
            borderColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 45%, var(--cdv-border))',
            color: 'var(--cdv-text)',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-bold text-sm m-0" style={{ color: 'var(--cdv-cinnabar-text)' }}>
              {tip.entry.word}
            </p>
            <button
              type="button"
              onClick={() => setTip(null)}
              aria-label="Đóng chú giải"
              className="p-0.5 rounded cursor-pointer border-0 bg-transparent"
              style={{ color: 'var(--cdv-text-tertiary)' }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--cdv-text-secondary)' }}>
            {tip.entry.meaning}
          </p>
        </div>
      )}
    </>
  );
}
