import React, { useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, Download, Share2, Shuffle, X } from 'lucide-react';
import { TYPE_LABELS, type Saying } from '@/core/types';

export type CardRatioId = 'story' | 'portrait' | 'square' | 'landscape';
export type CardThemeId =
  | 'giayDiep'
  | 'chuSa'
  | 'trucXanh'
  | 'senHong'
  | 'hoangHon'
  | 'lamThuy'
  | 'indochine'
  | 'sonMai';
export type CardFontId = 'classic' | 'modern' | 'poetic';
export type CardFrameId = 'none' | 'classicBorder' | 'polaroid';
export type CardAlign = 'center' | 'left';
export type CardScale = 'compact' | 'standard' | 'large';

const RATIOS: Record<CardRatioId, { label: string; badge: string; w: number; h: number }> = {
  story: { label: 'Story', badge: '9:16', w: 1080, h: 1920 },
  portrait: { label: 'Dọc', badge: '4:5', w: 1080, h: 1350 },
  square: { label: 'Vuông', badge: '1:1', w: 1080, h: 1080 },
  landscape: { label: 'Ngang', badge: '16:9', w: 1200, h: 675 },
};

const THEMES: Record<
  CardThemeId,
  {
    name: string;
    subtitle: string;
    c1: string;
    c2: string;
    c3?: string;
    isDark: boolean;
    text: string;
    secondary: string;
    accent: string;
  }
> = {
  giayDiep: { name: 'Giấy điệp', subtitle: 'Mộc mạc', c1: '#FAF6EE', c2: '#F2EBDF', isDark: false, text: '#2B231D', secondary: '#6E625A', accent: '#80612A' },
  chuSa: { name: 'Chu sa', subtitle: 'Sơn mài', c1: '#C84B31', c2: '#8E281C', isDark: true, text: '#FFFFFF', secondary: 'rgba(255,255,255,0.82)', accent: '#FFE5AD' },
  trucXanh: { name: 'Trúc xanh', subtitle: 'Bình yên', c1: '#E8F2EC', c2: '#C2DDD0', isDark: false, text: '#2B231D', secondary: '#556B5E', accent: '#4A7565' },
  senHong: { name: 'Hoa sen', subtitle: 'Thơ mộng', c1: '#FDF0F3', c2: '#F5D0DA', isDark: false, text: '#2B231D', secondary: '#6E5A60', accent: '#9A524E' },
  hoangHon: { name: 'Hoàng hôn', subtitle: 'Gen Z', c1: '#5A2A57', c2: '#D85C66', c3: '#F99B6A', isDark: true, text: '#FFFFFF', secondary: 'rgba(255,255,255,0.85)', accent: '#FFD56B' },
  lamThuy: { name: 'Lam thủy', subtitle: 'Trầm tĩnh', c1: '#1E2F4D', c2: '#0D1828', isDark: true, text: '#FFFFFF', secondary: 'rgba(255,255,255,0.82)', accent: '#A8CEF0' },
  indochine: { name: 'Đông Dương', subtitle: 'Hoài cổ', c1: '#EBD8AC', c2: '#D0B984', isDark: false, text: '#2B231D', secondary: '#5D4E38', accent: '#824D28' },
  sonMai: { name: 'Sơn mài', subtitle: 'Huyền bí', c1: '#1F1A17', c2: '#0D0B0A', isDark: true, text: '#FFFFFF', secondary: 'rgba(255,255,255,0.82)', accent: '#DDB858' },
};

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n').map((p) => p.trim()).filter(Boolean);
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export function CardStudioPanel({
  saying,
  onPickAnother,
}: {
  saying: Saying;
  onPickAnother?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState<CardRatioId>('story');
  const [themeId, setThemeId] = useState<CardThemeId>('giayDiep');
  const [fontId, setFontId] = useState<CardFontId>('classic');
  const [frame, setFrame] = useState<CardFrameId>('classicBorder');
  const [align, setAlign] = useState<CardAlign>('center');
  const [scale, setScale] = useState<CardScale>('standard');
  const [showMeaning, setShowMeaning] = useState(true);
  const [showSeal, setShowSeal] = useState(true);
  const [customFooter, setCustomFooter] = useState('Hồn thơ đất Việt — loixua.tmkstudio.io.vn');
  const [fontTick, setFontTick] = useState(0);

  useEffect(() => {
    let active = true;
    document.fonts?.ready.then(() => {
      if (active) setFontTick((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const spec = RATIOS[ratio];
    const theme = THEMES[themeId];
    canvas.width = spec.w;
    canvas.height = spec.h;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, spec.w, spec.h);
    grad.addColorStop(0, theme.c1);
    if (theme.c3) {
      grad.addColorStop(0.5, theme.c2);
      grad.addColorStop(1, theme.c3);
    } else {
      grad.addColorStop(1, theme.c2);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, spec.w, spec.h);

    // Subtle decorative radial glow
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(spec.w * 0.85, spec.h * 0.14, spec.w * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Frame
    const pad = Math.round(Math.min(spec.w, spec.h) * 0.065);
    if (frame === 'classicBorder') {
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 4;
      ctx.strokeRect(pad, pad, spec.w - pad * 2, spec.h - pad * 2);
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 2;
      ctx.strokeRect(pad + 14, pad + 14, spec.w - (pad + 14) * 2, spec.h - (pad + 14) * 2);
      ctx.restore();
    } else if (frame === 'polaroid') {
      ctx.save();
      ctx.fillStyle = theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)';
      ctx.fillRect(pad, pad, spec.w - pad * 2, spec.h - pad * 2);
      ctx.strokeStyle = theme.accent;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 3;
      ctx.strokeRect(pad, pad, spec.w - pad * 2, spec.h - pad * 2);
      ctx.restore();
    }

    const innerPad = pad + (ratio === 'landscape' ? 68 : 76);
    const maxTextWidth = spec.w - innerPad * 2;
    const isLandscape = ratio === 'landscape';

    const scaleDelta = scale === 'compact' ? -6 : scale === 'large' ? 8 : 0;
    let poemSize = (isLandscape ? 42 : ratio === 'story' ? 54 : 46) + scaleDelta;
    const makePoemFont = (sz: number) =>
      fontId === 'modern'
        ? `600 ${sz}px "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, sans-serif`
        : fontId === 'poetic'
          ? `italic ${sz}px "Newsreader", Georgia, "Times New Roman", serif`
          : `600 ${sz}px "Newsreader", Georgia, "Times New Roman", serif`;

    // Shrink font gently if a verse line barely overflows card width (prevents orphan 1-word wraps)
    const rawVerseLines = saying.text.split('\n').map((l) => l.trim()).filter(Boolean);
    const minPoemSize = isLandscape ? 28 : 34;
    while (poemSize > minPoemSize) {
      ctx.font = makePoemFont(poemSize);
      const maxMeasured = rawVerseLines.reduce((acc, l) => Math.max(acc, ctx.measureText(l).width), 0);
      if (maxMeasured <= maxTextWidth) break;
      poemSize -= 2;
    }
    const fontCss = makePoemFont(poemSize);

    // Badge
    ctx.save();
    ctx.font = `700 ${isLandscape ? 22 : 26}px "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = theme.accent;
    ctx.textAlign = align === 'center' ? 'center' : 'left';
    const xPos = align === 'center' ? spec.w / 2 : innerPad;
    const badgeY = isLandscape ? innerPad + 14 : pad + 115;
    ctx.fillText(TYPE_LABELS[saying.type].toUpperCase(), xPos, badgeY);
    ctx.restore();

    // Poem Lines
    ctx.save();
    ctx.font = fontCss;
    ctx.fillStyle = theme.text;
    ctx.textAlign = align === 'center' ? 'center' : 'left';
    const poemLines = wrapCanvasText(ctx, saying.text, maxTextWidth);
    const lineHeight = Math.round(poemSize * 1.48);

    const meaningSize = isLandscape ? 25 : 30;
    ctx.font = `400 ${meaningSize}px "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, sans-serif`;
    const meaningLines =
      showMeaning && saying.meaning
        ? wrapCanvasText(ctx, saying.meaning, maxTextWidth).slice(0, isLandscape ? 2 : 4)
        : [];
    const meaningHeight = meaningLines.length > 0 ? meaningLines.length * (meaningSize * 1.45) + 44 : 0;

    const totalPoemHeight = poemLines.length * lineHeight;
    const blockHeight = totalPoemHeight + meaningHeight;
    let startY = Math.max(badgeY + 80, (spec.h - blockHeight) / 2 + poemSize * 0.4);

    ctx.font = fontCss;
    for (const line of poemLines) {
      ctx.fillText(line, xPos, startY);
      startY += lineHeight;
    }

    // Meaning
    if (meaningLines.length > 0) {
      startY += 28;
      ctx.font = `400 ${meaningSize}px "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = theme.secondary;
      for (const mLine of meaningLines) {
        ctx.fillText(mLine, xPos, startY);
        startY += Math.round(meaningSize * 1.45);
      }
    }
    ctx.restore();

    // Seal stamp
    if (showSeal) {
      const sealSize = isLandscape ? 64 : 84;
      const sx = spec.w - innerPad - sealSize / 2;
      const sy = spec.h - pad - (isLandscape ? 58 : 88);
      ctx.save();
      ctx.strokeStyle = theme.isDark ? '#E87A65' : '#A3472F';
      ctx.fillStyle = theme.isDark ? 'rgba(232,122,101,0.14)' : 'rgba(163,71,47,0.08)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(sx - sealSize / 2, sy - sealSize / 2, sealSize, sealSize, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.isDark ? '#E87A65' : '#A3472F';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${isLandscape ? 20 : 26}px "Newsreader", Georgia, serif`;
      ctx.fillText('LỜI', sx, sy - (isLandscape ? 10 : 14));
      ctx.fillText('XƯA', sx, sy + (isLandscape ? 12 : 16));
      ctx.restore();
    }

    // Footer text
    if (customFooter.trim()) {
      ctx.save();
      ctx.font = `600 ${isLandscape ? 20 : 24}px "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = theme.secondary;
      ctx.textAlign = 'left';
      ctx.fillText(customFooter.trim(), innerPad, spec.h - pad - (isLandscape ? 48 : 74));
      ctx.restore();
    }
  }, [saying, ratio, themeId, fontId, frame, align, scale, showMeaning, showSeal, customFooter, fontTick]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loixua-${saying.slug || saying.id.slice(0, 8)}-${ratio}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleShareImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'loixua-card.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Thiệp Lời Xưa',
            text: saying.text,
          });
          return;
        } catch {
          // user cancelled
        }
      }
      handleDownload();
    }, 'image/png');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
      <div className="cdv-surface p-4 md:p-6 flex flex-col items-center justify-center min-h-[380px] lg:sticky lg:top-20">
        <canvas
          ref={canvasRef}
          aria-label="Xem trước thiệp câu ca dao"
          className="max-w-full max-h-[65vh] w-auto h-auto rounded-lg shadow-xl border"
          style={{ borderColor: 'var(--cdv-border)' }}
        />
      </div>

      <div className="cdv-surface p-5 space-y-5">
        {onPickAnother && (
          <button type="button" onClick={onPickAnother} className="cdv-btn-secondary w-full text-xs">
            <Shuffle size={14} aria-hidden="true" />
            <span>Đổi câu ngẫu nhiên khác</span>
          </button>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cdv-text-secondary)' }}>
            Tỉ lệ ảnh
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.entries(RATIOS) as Array<[CardRatioId, (typeof RATIOS)[CardRatioId]]>).map(([id, r]) => (
              <button
                key={id}
                type="button"
                aria-pressed={ratio === id}
                onClick={() => setRatio(id)}
                className="px-2 py-2 rounded-lg border text-center cursor-pointer text-xs transition-colors"
                style={
                  ratio === id
                    ? { borderColor: 'var(--cdv-cinnabar-text)', backgroundColor: 'var(--cdv-cinnabar-text)', color: 'var(--cdv-on-accent)', fontWeight: 700 }
                    : { borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }
                }
              >
                <span className="block">{r.label}</span>
                <span className="text-[10px] opacity-80 tabular-nums">{r.badge}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cdv-text-secondary)' }}>
            Bảng màu nghệ thuật
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(Object.entries(THEMES) as Array<[CardThemeId, (typeof THEMES)[CardThemeId]]>).map(([id, t]) => (
              <button
                key={id}
                type="button"
                aria-pressed={themeId === id}
                onClick={() => setThemeId(id)}
                className="p-1.5 rounded-lg border text-center cursor-pointer text-[10.5px] leading-tight transition-colors"
                style={
                  themeId === id
                    ? { borderColor: 'var(--cdv-cinnabar-text)', backgroundColor: 'var(--cdv-elevated)', fontWeight: 700 }
                    : { borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)' }
                }
              >
                <span
                  className="block w-full h-5 rounded mb-1 border"
                  style={{ background: `linear-gradient(135deg, ${t.c1}, ${t.c2})`, borderColor: 'var(--cdv-border)' }}
                />
                <span className="block">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
            Kiểu chữ & Khung viền
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'classic', label: 'Cổ điển' },
                { id: 'modern', label: 'Hiện đại' },
                { id: 'poetic', label: 'Bay bổng' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={fontId === f.id}
                onClick={() => setFontId(f.id)}
                className="py-1.5 px-2 rounded-lg border text-xs cursor-pointer transition-colors"
                style={
                  fontId === f.id
                    ? { borderColor: 'var(--cdv-cinnabar-text)', color: 'var(--cdv-cinnabar-text)', fontWeight: 700, backgroundColor: 'var(--cdv-elevated)' }
                    : { borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'none', label: 'Tối giản' },
                { id: 'classicBorder', label: 'Viền đôi' },
                { id: 'polaroid', label: 'Khung tranh' },
              ] as const
            ).map((fr) => (
              <button
                key={fr.id}
                type="button"
                aria-pressed={frame === fr.id}
                onClick={() => setFrame(fr.id)}
                className="py-1.5 px-2 rounded-lg border text-xs cursor-pointer transition-colors"
                style={
                  frame === fr.id
                    ? { borderColor: 'var(--cdv-cinnabar-text)', color: 'var(--cdv-cinnabar-text)', fontWeight: 700, backgroundColor: 'var(--cdv-elevated)' }
                    : { borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)' }
                }
              >
                {fr.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-xs pt-1">
          <button
            type="button"
            onClick={() => setAlign((a) => (a === 'center' ? 'left' : 'center'))}
            className="cdv-btn-secondary text-xs py-1.5 px-3"
          >
            {align === 'center' ? <AlignCenter size={14} aria-hidden="true" /> : <AlignLeft size={14} aria-hidden="true" />}
            <span>{align === 'center' ? 'Căn giữa' : 'Căn trái'}</span>
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => (s === 'compact' ? 'standard' : s === 'standard' ? 'large' : 'compact'))}
            className="cdv-btn-secondary text-xs py-1.5 px-3"
          >
            Cỡ: {scale === 'compact' ? 'Nhỏ' : scale === 'large' ? 'Lớn' : 'Vừa'}
          </button>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={showMeaning} onChange={(e) => setShowMeaning(e.target.checked)} />
            <span>Giải nghĩa</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={showSeal} onChange={(e) => setShowSeal(e.target.checked)} />
            <span>Triện</span>
          </label>
        </div>

        <label className="block text-xs">
          <span className="block mb-1 font-medium" style={{ color: 'var(--cdv-text-secondary)' }}>
            Chú thích chân thiệp
          </span>
          <input
            type="text"
            value={customFooter}
            onChange={(e) => setCustomFooter(e.target.value)}
            maxLength={60}
            className="w-full px-3 py-2 rounded-lg border text-xs"
            style={{ backgroundColor: 'var(--cdv-elevated)', borderColor: 'var(--cdv-border)', color: 'var(--cdv-text)' }}
          />
        </label>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" onClick={handleDownload} className="cdv-btn-primary text-xs">
            <Download size={14} aria-hidden="true" />
            <span>Tải ảnh PNG</span>
          </button>
          <button type="button" onClick={handleShareImage} className="cdv-btn-secondary text-xs">
            <Share2 size={14} aria-hidden="true" />
            <span>Chia sẻ ảnh</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CardStudioModal({ initialSaying }: { initialSaying?: Saying }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saying, setSaying] = useState<Saying | null>(initialSaying ?? null);

  useEffect(() => {
    const openHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ saying: Saying }>).detail;
      if (detail?.saying) {
        setSaying(detail.saying);
        dialogRef.current?.showModal();
      }
    };
    window.addEventListener('loixua-open-card-studio', openHandler);

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
      window.removeEventListener('loixua-open-card-studio', openHandler);
      dialog?.removeEventListener('click', clickHandler);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="card-studio-title"
      className="cdv-dialog"
      style={{ maxWidth: 'min(95vw, 60rem)' }}
    >
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--cdv-border)' }}>
          <h2 id="card-studio-title" className="text-lg font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
            Studio Thiệp Lời Xưa
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Đóng studio thiệp"
            className="cdv-btn-secondary text-xs py-1.5 px-3"
          >
            <X size={14} aria-hidden="true" />
            <span>Đóng</span>
          </button>
        </div>
        {saying && <CardStudioPanel saying={saying} />}
      </div>
    </dialog>
  );
}
