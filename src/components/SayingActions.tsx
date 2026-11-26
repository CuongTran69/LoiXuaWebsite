import React, { useEffect, useState } from 'react';
import { Check, Copy, Headphones, Heart, Image as ImageIcon, Link2, Square, Volume2 } from 'lucide-react';
import { audioController } from '@/core/audio';
import { isFavorite, recordNotebookDiscovery, toggleFavorite } from '@/lib/storage';
import type { Saying } from '@/core/types';
import CardStudioModal from './CardStudioModal';

interface Props {
  saying: Saying;
  verseAudioUrl?: string | null;
  meaningAudioUrl?: string | null;
  verseDurationMs?: number;
  meaningDurationMs?: number;
}

function fmtMs(ms?: number): string {
  if (!ms) return '';
  const sec = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export default function SayingActions({
  saying,
  verseAudioUrl,
  meaningAudioUrl,
  verseDurationMs,
  meaningDurationMs,
}: Props) {
  const [fav, setFav] = useState(false);
  const [playingKind, setPlayingKind] = useState<'verse' | 'meaning' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setFav(isFavorite(saying.id));
    recordNotebookDiscovery(saying.id);

    const syncAudio = () => {
      const s = audioController.getState();
      setSpeed(s.speechSpeed);
      if (s.playingId === saying.id) {
        setPlayingKind(s.playingKind);
        setIsLoading(s.isLoading);
      } else {
        setPlayingKind(null);
        setIsLoading(false);
      }
    };
    syncAudio();
    return audioController.subscribe(syncAudio);
  }, [saying.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${saying.text}\n— Lời Xưa (loixua.tmkstudio.io.vn)`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <>
      <div className="cdv-elevated p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => audioController.playSaying(saying, 'verse', verseAudioUrl)}
            className="cdv-btn-primary text-xs"
          >
            {playingKind === 'verse' ? <Square size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
            <span>
              {playingKind === 'verse' ? (isLoading ? 'Đang tải...' : 'Dừng câu thơ') : 'Nghe đọc thơ'}
              {verseDurationMs ? ` (${fmtMs(verseDurationMs)})` : ''}
            </span>
          </button>

          {saying.meaning && (
            <button
              type="button"
              onClick={() => audioController.playSaying(saying, 'meaning', meaningAudioUrl)}
              className="cdv-btn-secondary text-xs"
            >
              {playingKind === 'meaning' ? <Square size={14} aria-hidden="true" /> : <Headphones size={14} aria-hidden="true" />}
              <span>
                {playingKind === 'meaning' ? 'Dừng giải nghĩa' : 'Nghe giải nghĩa'}
                {meaningDurationMs ? ` (${fmtMs(meaningDurationMs)})` : ''}
              </span>
            </button>
          )}

          <label className="inline-flex items-center gap-1.5 text-xs ml-1">
            <span style={{ color: 'var(--cdv-text-secondary)' }}>Tốc độ</span>
            <select
              value={speed}
              onChange={(e) => {
                const next = Number(e.target.value);
                setSpeed(next);
                audioController.setSpeechSpeed(next);
              }}
              className="px-2 py-1 rounded-md border text-xs tabular-nums"
              style={{ backgroundColor: 'var(--cdv-card)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
            >
              <option value={0.85}>0.85x</option>
              <option value={1}>1.0x</option>
              <option value={1.15}>1.15x</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setFav(toggleFavorite(saying.id))} aria-pressed={fav} className="cdv-btn-secondary text-xs">
            <Heart size={14} fill={fav ? 'currentColor' : 'none'} style={fav ? { color: 'var(--cdv-cinnabar-text)' } : undefined} aria-hidden="true" />
            <span>{fav ? 'Đã lưu' : 'Yêu thích'}</span>
          </button>

          <button type="button" onClick={handleCopy} className="cdv-btn-secondary text-xs">
            {copied ? <Check size={14} style={{ color: 'var(--cdv-bamboo-text)' }} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            <span>{copied ? 'Đã chép' : 'Chép chữ'}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href).catch(() => {});
              setCopiedLink(true);
              window.setTimeout(() => setCopiedLink(false), 2000);
            }}
            className="cdv-btn-secondary text-xs"
          >
            {copiedLink ? <Check size={14} style={{ color: 'var(--cdv-bamboo-text)' }} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
            <span>{copiedLink ? 'Đã chép link' : 'Chép link'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('loixua-open-card-studio', { detail: { saying } }))}
            className="cdv-btn-secondary text-xs"
          >
            <ImageIcon size={14} aria-hidden="true" />
            <span>Tạo thiệp</span>
          </button>
        </div>
      </div>
      <CardStudioModal />
    </>
  );
}
