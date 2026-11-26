import React, { useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Download, Monitor, Moon, Sun, Upload, X } from 'lucide-react';
import {
  exportUserBackup,
  getPoemAlign,
  getPoemFont,
  getPoemFontOffset,
  getThemePreference,
  importUserBackup,
  setPoemAlign,
  setPoemFont,
  setPoemFontOffset,
  setThemePreference,
  type PoemAlignChoice,
  type PoemFontChoice,
  type ThemePreference,
} from '@/lib/storage';

const FONT_OPTIONS: Array<{ id: PoemFontChoice; label: string; desc: string }> = [
  { id: 'newsreader', label: 'Newsreader', desc: 'Văn học hiện đại, sắc nét (Mặc định)' },
  { id: 'georgia', label: 'Georgia', desc: 'Trang nhã, bay bổng' },
  { id: 'charter', label: 'Charter', desc: 'Cổ điển, báo chí' },
  { id: 'palatino', label: 'Palatino', desc: 'Uyển chuyển, hào sảng' },
  { id: 'rounded', label: 'Be Vietnam Pro', desc: 'Hiện đại, rõ chữ trên màn hình nhỏ' },
];

export default function SettingsDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [font, setFont] = useState<PoemFontChoice>('newsreader');
  const [offset, setOffset] = useState<number>(0);
  const [align, setAlign] = useState<PoemAlignChoice>('center');
  const [isForcedDark, setIsForcedDark] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setTheme(getThemePreference());
    setFont(getPoemFont());
    setOffset(getPoemFontOffset());
    setAlign(getPoemAlign());
    setIsForcedDark(document.documentElement.dataset.forceTheme === 'dark');

    const openHandler = () => {
      setTheme(getThemePreference());
      setFont(getPoemFont());
      setOffset(getPoemFontOffset());
      setAlign(getPoemAlign());
      setIsForcedDark(document.documentElement.dataset.forceTheme === 'dark');
      setStatusMsg(null);
      dialogRef.current?.showModal();
    };
    window.addEventListener('loixua-open-settings', openHandler);

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
      window.removeEventListener('loixua-open-settings', openHandler);
      dialog?.removeEventListener('click', clickHandler);
    };
  }, []);

  const handleTheme = (pref: ThemePreference) => {
    setTheme(pref);
    setThemePreference(pref);
  };

  const handleFont = (choice: PoemFontChoice) => {
    setFont(choice);
    setPoemFont(choice);
  };

  const handleOffset = (next: number) => {
    const clamped = Math.max(-3, Math.min(6, next));
    setOffset(clamped);
    setPoemFontOffset(clamped);
  };

  const handleAlign = (next: PoemAlignChoice) => {
    setAlign(next);
    setPoemAlign(next);
  };

  const handleExport = () => {
    const json = exportUserBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loixua-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Đã tải xuống tệp sao lưu JSON.');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = importUserBackup(text);
      setStatusMsg(`Đã khôi phục ${res.favoritesCount} câu yêu thích và ${res.notebookCount} câu sổ tay.`);
    } catch {
      setStatusMsg('Không đọc được tệp sao lưu. Vui lòng chọn đúng định dạng JSON.');
    }
    e.target.value = '';
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="settings-dialog-title"
      className="cdv-dialog"
    >
      <div className="p-5 sm:p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--cdv-border)' }}>
          <h2 id="settings-dialog-title" className="text-lg font-bold m-0">
            Cài đặt đọc &amp; Dữ liệu
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Đóng cài đặt"
            className="p-1.5 rounded-lg border cursor-pointer"
            style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
              Giao diện
            </h3>
            {isForcedDark && (
              <span className="text-[11px]" style={{ color: 'var(--cdv-indigo-text)' }}>
                Phòng Nghe ban đêm luôn giữ nền tối dịu
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'system', label: 'Hệ thống', Icon: Monitor },
                { id: 'light', label: 'Nền sáng', Icon: Sun },
                { id: 'dark', label: 'Nền tối', Icon: Moon },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={theme === id}
                onClick={() => handleTheme(id)}
                className="px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer inline-flex items-center justify-center gap-1.5"
                style={
                  theme === id
                    ? {
                        backgroundColor: 'var(--cdv-cinnabar-text)',
                        color: 'var(--cdv-on-accent)',
                        borderColor: 'var(--cdv-cinnabar-text)',
                      }
                    : {
                        backgroundColor: 'var(--cdv-elevated)',
                        color: 'var(--cdv-text)',
                        borderColor: 'var(--cdv-border)',
                      }
                }
              >
                <Icon size={14} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
            Căn lề thơ / câu nói
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'left', label: 'Căn trái', Icon: AlignLeft },
                { id: 'center', label: 'Căn giữa', Icon: AlignCenter },
                { id: 'right', label: 'Căn phải', Icon: AlignRight },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={align === id}
                onClick={() => handleAlign(id)}
                className="px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer inline-flex items-center justify-center gap-1.5"
                style={
                  align === id
                    ? {
                        backgroundColor: 'var(--cdv-cinnabar-text)',
                        color: 'var(--cdv-on-accent)',
                        borderColor: 'var(--cdv-cinnabar-text)',
                      }
                    : {
                        backgroundColor: 'var(--cdv-elevated)',
                        color: 'var(--cdv-text)',
                        borderColor: 'var(--cdv-border)',
                      }
                }
              >
                <Icon size={14} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
              Phông chữ &amp; Cỡ chữ thơ
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Giảm cỡ chữ"
                onClick={() => handleOffset(offset - 1)}
                className="px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer"
                style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
              >
                A-
              </button>
              <span className="text-xs font-mono w-8 text-center tabular-nums">{offset >= 0 ? `+${offset}` : offset}</span>
              <button
                type="button"
                aria-label="Tăng cỡ chữ"
                onClick={() => handleOffset(offset + 1)}
                className="px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer"
                style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
              >
                A+
              </button>
            </div>
          </div>

          <div className="grid gap-1.5">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={font === f.id}
                onClick={() => handleFont(f.id)}
                className="flex items-center justify-between px-3.5 py-2 rounded-lg border text-left cursor-pointer"
                style={
                  font === f.id
                    ? {
                        borderColor: 'var(--cdv-cinnabar-text)',
                        backgroundColor: 'color-mix(in srgb, var(--cdv-cinnabar-text) 10%, var(--cdv-elevated))',
                        color: 'var(--cdv-text)',
                      }
                    : {
                        borderColor: 'var(--cdv-border)',
                        backgroundColor: 'var(--cdv-elevated)',
                        color: 'var(--cdv-text)',
                      }
                }
              >
                <span className="font-semibold text-sm">{f.label}</span>
                <span className="text-xs" style={{ color: 'var(--cdv-text-secondary)' }}>
                  {f.desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--cdv-text-tertiary)' }}>
            Sao lưu &amp; Khôi phục
          </h3>
          <p className="text-xs m-0" style={{ color: 'var(--cdv-text-secondary)' }}>
            Dữ liệu Yêu thích, Sổ tay, Chuỗi ngày đọc và Cảm nhận được lưu cục bộ trên trình duyệt.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleExport} className="cdv-btn-secondary text-xs">
              <Download size={14} aria-hidden="true" />
              <span>Xuất JSON</span>
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="cdv-btn-secondary text-xs">
              <Upload size={14} aria-hidden="true" />
              <span>Khôi phục JSON</span>
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
          </div>
          {statusMsg && (
            <p className="text-xs font-medium m-0" style={{ color: 'var(--cdv-bamboo-text)' }}>
              {statusMsg}
            </p>
          )}
        </section>
      </div>
    </dialog>
  );
}
