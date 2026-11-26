# Lời Xưa Web (`loixua.tmkstudio.io.vn`)

Phiên bản Web & PWA chính thức của ứng dụng **Lời Xưa** — kho tàng 949+ ca dao, tục ngữ, thành ngữ Việt Nam có giải nghĩa, giọng đọc studio, âm thanh thiền Web Audio, gieo quẻ dân gian, đố vui nối vế, đấu nối vế 1v1 (cross-platform với iOS/Android qua Firebase RTDB, `algoVersion = 2`) và Studio tạo thiệp.

- **Trang web chính thức:** https://loixua.tmkstudio.io.vn
- **Repository GitHub:** https://github.com/CuongTran69/LoiXuaWebsite

## Các trang & tính năng chính

- `/` — Trang chủ Hôm nay (Lịch âm/dương, câu hôm nay, truy cập nhanh Lướt thơ & Nghe ban đêm)
- `/kham-pha`, `/chu-de/<slug>`, `/loai/<type>`, `/cau/<slug>` — Kho tàng & 949+ trang chi tiết chuẩn SEO
- `/luot-tho` — Lướt thơ tập trung (căn trái/giữa/phải, tự động lướt, âm thanh thiền)
- `/gieo-que` — Gieo quẻ dân gian
- `/dau` — Đấu nối vế 1v1 thời gian thực với iOS/Android, đấu với máy & mã thách đấu offline
- `/do-vui`, `/do-vui-hom-nay` — Đố vui nối vế & Đố nhanh hằng ngày
- `/nghe-ngu` — Không gian nghe ban đêm kèm hẹn giờ tắt
- `/tao-thiep` — Studio tạo thiệp ảnh chia sẻ
- `/da-luu`, `/so-tay`, `/tim-kiem`, `/nguon-du-lieu` — Lưu trữ, sổ tay, tìm kiếm không dấu & nguồn dữ liệu

## Cấu trúc & Phát triển cục bộ

```bash
npm run sync    # Đồng bộ sayings.json, categories, audio_manifest & presets từ ../CaDaoViet
npm test        # Chạy Vitest kiểm tra parity 100% với CaDaoCore (Swift)
npm run dev     # Chạy Astro dev server tại http://localhost:4321
npm run build   # Build tĩnh toàn bộ ~980+ trang SEO & interactive islands vào ./dist
```

## Triển khai & Hạ tầng (đang chạy live)

1. **Cloudflare Workers Static Assets (`loixuawebsite` → `loixua.tmkstudio.io.vn`):**
   - Repo riêng, tự động deploy từ nhánh `main` của `CuongTran69/LoiXuaWebsite` (không đụng `~/Project/TMKStudio`).
   - Build command: `npm run build` | Output directory: `dist` (cũng có thể deploy tay bằng `npx wrangler deploy` với `wrangler.jsonc` tên `loixua-web`).
   - **Lưu ý Cloudflare:** Vì project chỉ deploy static assets nên phần *Runtime variables and secrets* trên dashboard Cloudflare sẽ bị khóa; cấu hình mặc định đã được đặt sẵn trong code hoặc truyền qua *Settings → Builds* lúc build.

2. **Firebase Web App, GA4 & App Check (`loixua-33681`):**
   - Web App `Lời Xưa Web` (`appId: 1:263588340830:web:42daea5f35b16afccec0cf`, GA4 `G-Q8Q80FWC3F`) và cấu hình mặc định nằm trong [src/lib/firebase-duel.ts](src/lib/firebase-duel.ts) & [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro).
   - **App Check:** Đã đăng ký bằng **Fraud Defense (reCAPTCHA Enterprise)** với `ReCaptchaEnterpriseProvider` *(lưu ý: `reCAPTCHA Classic` đã bị Google khóa cho đăng ký mới; Site Key công khai nằm ở `src/lib/firebase-duel.ts`, không đưa Secret Key vào repo)*.
   - **Authentication:** Đã bật **Anonymous** và khai báo `loixua.tmkstudio.io.vn` trong **Authorized domains**.
   - **Realtime Database:** Đấu nối vế (`/dau`) dùng chung nhánh `rooms/*` (`asia-southeast1`) và rule với iOS/Android; đã xác nhận tạo/ghép phòng thành công trên `https://loixua.tmkstudio.io.vn/dau`.

3. **Biến môi trường override (tuỳ chọn):**
   Xem `.env.example` (`PUBLIC_GA_MEASUREMENT_ID`, `PUBLIC_FIREBASE_API_KEY`, `PUBLIC_FIREBASE_APP_ID`, `PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`, `PUBLIC_FIREBASE_APP_CHECK_PROVIDER`).

4. **Cloudflare R2 CORS (nếu fetch audio bằng XHR/WebAudio từ origin web):**
   ```json
   [
     {
       "AllowedOrigins": ["https://loixua.tmkstudio.io.vn", "http://localhost:4321"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 86400
     }
   ]
   ```
