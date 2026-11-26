import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, X } from 'lucide-react';

const IOS_APP_URL = 'https://apps.apple.com/app/apple-store/id6820905528?pt=128454365&ct=web_popup&mt=8';
const ANDROID_APP_URL = 'https://tmkstudio.io.vn/loixua-android';

export function AppleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.67-.82 1.13-1.96 1-3.1-.98.04-2.16.66-2.86 1.48-.61.71-1.15 1.87-.99 2.98 1.1.08 2.21-.57 2.85-1.36z" />
    </svg>
  );
}

export function GooglePlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#00D2FF" d="M3.61 1.81L13.79 12 3.61 22.19a1.94 1.94 0 0 1-.61-1.39V3.2c0-.53.22-1.01.61-1.39z" />
      <path fill="#00F076" d="M13.79 12L5.46 1.46l12.01 6.86-3.68 3.68z" />
      <path fill="#FF3A44" d="M13.79 12l3.68 3.68-12.01 6.86L13.79 12z" />
      <path fill="#FFD800" d="M17.47 8.32l3.52 2.01c.95.54.95 1.43 0 1.97l-3.52 2.02L13.79 12l3.68-3.68z" />
    </svg>
  );
}

export default function AppDownloadDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [iosQr, setIosQr] = useState('');
  const [androidQr, setAndroidQr] = useState('');

  useEffect(() => {
    const openHandler = () => {
      if (!iosQr) {
        QRCode.toDataURL(IOS_APP_URL, { width: 164, margin: 1 }).then(setIosQr).catch(() => {});
      }
      if (!androidQr) {
        QRCode.toDataURL(ANDROID_APP_URL, { width: 164, margin: 1 }).then(setAndroidQr).catch(() => {});
      }
      dialogRef.current?.showModal();
    };
    window.addEventListener('loixua-open-app-popup', openHandler);

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
      window.removeEventListener('loixua-open-app-popup', openHandler);
      dialog?.removeEventListener('click', clickHandler);
    };
  }, [iosQr, androidQr]);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="app-download-title"
      className="cdv-dialog"
      style={{ maxWidth: 'min(94vw, 40rem)' }}
    >
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--cdv-border)' }}>
          <div className="flex items-center gap-3">
            <img src="/icons/app-icon.png" alt="Logo Lời Xưa" width="44" height="44" className="rounded-xl shadow-sm shrink-0" />
            <div>
              <h2 id="app-download-title" className="text-lg font-bold m-0" style={{ fontFamily: 'var(--cdv-poem-font)' }}>
                Tải ứng dụng Lời Xưa
              </h2>
              <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--cdv-text-secondary)' }}>
                Không quảng cáo · Đọc offline · Widget hằng ngày · Nhắc nhở im lặng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Đóng cửa sổ tải ứng dụng"
            className="p-1.5 rounded-lg border cursor-pointer shrink-0"
            style={{ borderColor: 'var(--cdv-border)', backgroundColor: 'var(--cdv-elevated)', color: 'var(--cdv-text)' }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="cdv-elevated p-4 flex flex-col items-center text-center gap-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold">
              <AppleIcon size={16} />
              <span>iPhone &amp; iPad (iOS)</span>
            </div>
            {iosQr && (
              <img src={iosQr} alt="Mã QR tải app iOS" width={140} height={140} className="rounded-xl bg-white p-1.5" />
            )}
            <a
              href={IOS_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cdv-btn-primary text-xs w-full py-2.5"
            >
              <AppleIcon size={15} />
              <span>Tải trên App Store</span>
            </a>
          </div>

          <div className="cdv-elevated p-4 flex flex-col items-center text-center gap-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold">
              <GooglePlayIcon size={16} />
              <span>Android (CH Play)</span>
            </div>
            {androidQr && (
              <img src={androidQr} alt="Mã QR tải app Android" width={140} height={140} className="rounded-xl bg-white p-1.5" />
            )}
            <a
              href={ANDROID_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cdv-btn-secondary text-xs w-full py-2.5 font-semibold"
            >
              <GooglePlayIcon size={15} />
              <span>Tải trên Google Play</span>
            </a>
          </div>
        </div>

        <p className="text-[11px] m-0 text-center flex items-center justify-center gap-1.5" style={{ color: 'var(--cdv-text-tertiary)' }}>
          <Smartphone size={13} aria-hidden="true" />
          <span>Quét mã QR bằng camera điện thoại để mở thẳng trang cài đặt chính thức.</span>
        </p>
      </div>
    </dialog>
  );
}
