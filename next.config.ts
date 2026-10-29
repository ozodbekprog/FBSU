import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline' shart: Next.js statik (prerender) sahifalarga hydration
  // uchun kerakli bootstrap skriptlarni HTML ichiga yozadi va statik HTML'ga
  // request paytida nonce qo'shib bo'lmaydi. Nonce faqat dinamik renderda
  // ishlaydi — bu middleware/proxy orqali amalga oshirilishi mumkin, ammo
  // hozirgi vazifa doirasidan tashqarida (keyingi ish).
  // 'unsafe-eval' productionda kerak emas (React/Next ishlatmaydi).
  `script-src 'self' 'unsafe-inline' https://telegram.org${isProduction ? "" : " 'unsafe-eval'"}`,
  // Inline `on*=` event handler'larni butunlay o'chiradi (XSS'da eng ko'p
  // uchraydigan vektor). React sintetik event'lari addEventListener orqali
  // ishlaydi, shuning uchun bu interfeysni buzmaydi.
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  isProduction ? "connect-src 'self'" : "connect-src 'self' ws: wss:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // `microphone=(self)` — xabarlardagi video qo'ng'iroq uchun zarur.
    // Avval `microphone=()` bo'lgani sababli brauzer "Permissions policy
    // violation" berib, `getUserMedia` faqat video track qaytarardi —
    // qo'ng'iroq ovozsiz chiqib ketardi.
    value:
      "camera=(self), geolocation=(self), microphone=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
  { key: "Content-Security-Policy", value: cspDirectives },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev rejimida pastdagi "N" indikatori yangi sidebar footer'ini to'sib qo'yardi.
  devIndicators: false,
  transpilePackages: ["@excalidraw/excalidraw"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), geolocation=(self), microphone=(self), payment=(), usb=()",
          },
        ],
      },
      {
        // CSRF token foydalanuvchi cookie'siga bog'liq. `Vary: Cookie` oraliq
        // kesh (proxy/CDN) bir foydalanuvchi javobini boshqasiga bermasligini
        // kafolatlaydi. Route o'zining `Cache-Control: no-store, private`
        // sarlavhasini saqlab qoladi — bu qoida uni o'zgartirmaydi.
        source: "/api/csrf",
        headers: [{ key: "Vary", value: "Cookie" }],
      },
      {
        // Yuz modellari hech qachon o'zgarmaydi — brauzer 1 yil keshlasin.
        // Bu Face ID'ning takroriy ishga tushishini sezilarli tezlashtiradi.
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Oflayn rejim belgisi (`X-FBSU-Offline-Cache`) **proxy** da qo'yiladi
      // (`src/proxy.ts`): shu yerda `source` regex'i bilan chiqarib
      // tashlash ishlamadi (path-to-regexp negative-lookahead).
    ];
  },
};

export default nextConfig;
