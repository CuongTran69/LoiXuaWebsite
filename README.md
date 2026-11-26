# Lời Xưa Web (`loixua.tmkstudio.io.vn`)

Phiên bản Web & PWA chính thức của ứng dụng **Lời Xưa** — kho tàng 949+ ca dao, tục ngữ, thành ngữ Việt Nam có giải nghĩa, giọng đọc studio, âm thanh thiền Web Audio, gieo quẻ dân gian, đố vui nối vế, đấu nối vế 1v1 (cross-platform với iOS/Android qua Firebase RTDB) và Studio tạo thiệp.

## Cấu trúc & Phát triển cục bộ

```bash
npm run sync    # Đồng bộ sayings.json, categories, audio_manifest & presets từ ../CaDaoViet
npm test        # Chạy Vitest kiểm tra parity 100% với CaDaoCore (Swift)
npm run dev     # Chạy Astro dev server tại http://localhost:4321
npm run build   # Build tĩnh toàn bộ ~980+ trang SEO & interactive islands vào ./dist
```

## Triển khai lên Cloudflare (`loixua.tmkstudio.io.vn`)

1. **Cloudflare Pages / Workers Assets (project riêng, không đụng `~/Project/TMKStudio`):**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Custom domain: `loixua.tmkstudio.io.vn` (Cloudflare tự tạo CNAME DNS).
   - Nếu deploy bằng Wrangler CLI: `npx wrangler deploy`.

2. **Cloudflare R2 CORS cho giọng đọc (`audio.tmkstudio.io.vn`):**
   Thêm CORS rule cho bucket R2 chứa audio:
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

3. **Firebase Web App & App Check (`loixua-33681`):**
   - Trong Firebase Console → Project Settings → Add **Web App** để lấy `PUBLIC_FIREBASE_APP_ID`.
   - Trong Firebase Console → App Check → Apps → đăng ký Web App với **reCAPTCHA v3** (thêm domain `loixua.tmkstudio.io.vn`), lấy site key điền vào biến môi trường `PUBLIC_FIREBASE_APP_CHECK_SITE_KEY` trên Cloudflare Pages.
   - Đảm bảo **Authorized domains** trong Authentication → Settings có `loixua.tmkstudio.io.vn`.

4. **Biến môi trường (tuỳ chọn):**
   Xem `.env.example` (`PUBLIC_GA_MEASUREMENT_ID`, `PUBLIC_FIREBASE_APP_ID`, `PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`).
