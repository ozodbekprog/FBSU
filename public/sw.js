/*
 * FBSU service worker — oflayn ishlash uchun.
 *
 * Uchta alohida kesh (kamari, chunk'i, ma'lumot) ishlatiladi:
 *
 *  1. STATIC — `/_next/static/**`. Next.js fayl nomiga hash qo'yadi,
 *     demak content o'zgarmaydi → cache-first. Bu ilova "qobig'i" (app
 *     shell): u keshlanmasa, keshlangan HTML oflayn jonlanmaydi va
 *     sahifa o'lik bo'lib qoladi.
 *
 *  2. PAGES — sahifa HTML. Server komponentlar sahifalari API orqali
 *     emas, bevosita DB'dan render qilinadi, shuning uchun oflayn
 *     ko'rsatish uchun **HTML'ni** keshlash kerak. network-first:
 *     internet bor bo'lsa yangisi, yo'q bo'lsa kesh.
 *
 *  3. DATA — o'qish uchun API javoblari (stale-while-revalidate):
 *     avval keshni darhol ko'rsatamiz, yangisini orqada yuklaymiz.
 *
 * XAVFSIZLIK: kesh brauzer darajasida, foydalanuvchilararo umumiy.
 * Birinchi foydalanuvchi chiqib ikkinchisi kirsа, oflayn birinchining
 * baholarini ko'rmasligi kerak — shuning uchun `CLEAR_CACHES` xabari
 * qabul qilinadi va `logout` uni yuboradi.
 */

const VERSION = "v5";
const STATIC_CACHE = `ttpu-lms-static-${VERSION}`;
const PAGE_CACHE = `ttpu-lms-pages-${VERSION}`;
const DATA_CACHE = `ttpu-lms-data-${VERSION}`;
const OWN_CACHES = [STATIC_CACHE, PAGE_CACHE, DATA_CACHE];

/** O'qib turib yuborilmaydigan, hech qachon keshlanmaydigan yo'llar. */
const NEVER_CACHE_PREFIXES = [
  "/api/auth", // sessiya — keshlansa boshqa foydalanuvchiga o'tib ketadi
  "/api/csrf", // token har so'rovda yangilanadi
  "/api/calls", // qo'ng'iroq holati real vaqtda bo'lishi kerak
  "/api/chat/presence", // onlaynlik yorug'ligi
];

/**
 * Javob keshlanadimi (API va statik resurslar uchun).
 *
 * `no-store` / `private` bo'lsa — yo'q. Bu Next.js ning shaxsiylashgan
 * javoblar uchun to'g'ri qarori va uni bo'shatmaymiz.
 */
function isCacheable(response) {
  if (!response || !response.ok || response.type === "opaque") return false;
  const cacheControl = response.headers.get("Cache-Control") || "";
  return !/no-store|private/i.test(cacheControl);
}

/**
 * Sahifa HTML keshlanadimi?
 *
 * Sahifalar Next.js da `private, no-cache, no-store` oladi — bu qarorni
 * **tarmoq keshi uchun** buzmaymiz. Lekin Cache API butun boshqa narsa:
 * u faqat shu brauzeringa xos, proxylar/CDN uni ko'rmaydi va boshqa
 * foydalanuvchiga chiqmaydi. Shu sababli foydalanuvchining o'z
 * sahifalarini oflayn ko'rsatish uchun saqlash to'gri.
 *
 * Qamrov qat'iy: faqat **hujjat (navigate)** so'rovlari. `/api/*`,
 * `/login` va boshqa narsa bu yo'lga umuman tushmaydi, chiqishda esa
 * kesh butunlay tozalanadi (`CLEAR_CACHES`).
 */
function isCacheablePage(response) {
  return !!response && response.ok && response.type !== "opaque";
}

function shouldNeverCache(pathname) {
  return NEVER_CACHE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

/** Kesh kaliti — talab parametrlari bilan (masalan /messages?user=123). */
function cacheKey(request) {
  return new URL(request.url).pathname + new URL(request.url).search;
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("ttpu-lms-") && !OWN_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHES") {
    event.waitUntil(
      Promise.all(OWN_CACHES.map((name) => caches.delete(name))).then(() => {
        if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
      })
    );
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldNeverCache(url.pathname)) return;

  // 1) Ilova qobig'i — content-addressed, o'zgarmaydi.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/models/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.pathname === "/sw.js" || url.pathname === "/manifest.webmanifest" || url.pathname === "/logo.svg") {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // 2) API — o'qish uchun.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  // 3) Sahifa HTML — internet bo'lsa yangisi, yo'q bo'lsa kesh.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Qolgan statik fayllar (rasm, shrift).
  if (/\.(?:png|jpe?g|gif|webp|svg|woff2?|ico|css|js)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});

/** Content-addressed resurslar: kesh bo'lsa darhol beramiz. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) cache.put(request, response.clone());
  return response;
}

/** Keshni darhol ko'rsatamiz, yangisini orqada yangilamiz. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const key = cacheKey(request);
  const cached = await cache.match(key);
  const network = fetch(request)
    .then((response) => {
      if (isCacheable(response)) cache.put(key, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    network.catch(() => undefined);
    return cached;
  }
  const response = await network;
  if (response) return response;
  return new Response(JSON.stringify({ ok: false, offline: true }), {
    status: 503,
    headers: { "Content-Type": "application/json", "X-FBSU-Offline": "1" },
  });
}

/** Sahifa: avval tarmoq, keyin kesh, oxirida oflayn oynasi. */
async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (isCacheablePage(response)) cache.put(cacheKey(request), response.clone());
    return response;
  } catch {
    const cached = await cache.match(cacheKey(request));
    if (cached) return cached;
    return new Response(OFFLINE_HTML, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}

const OFFLINE_HTML = `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FBSU — Oflayn</title>
<style>
 body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f7fa;color:#1d3460;display:flex;min-height:100vh;align-items:center;justify-content:center}
 main{max-width:22rem;padding:2rem;text-align:center}
 h1{margin:.75rem 0 .25rem;font-size:1.4rem}
 p{margin:0 0 1.25rem;color:#475569;line-height:1.5}
 button{border:0;border-radius:.65rem;background:#1d3460;color:#fff;font-size:.9rem;font-weight:600;padding:.7rem 1.4rem;cursor:pointer}
</style>
</head>
<body>
<main>
<img src="/logo.svg" alt="TTPU" width="72" height="72" />
<h1>FBSU</h1>
<p>Internet aloqasi yo'q. Bu sahifa hali yuklab olinmagan — oldin tarmoqda ochib qo'ying.</p>
<button onclick="location.reload()">Qayta urinish</button>
</main>
</body>
</html>`;