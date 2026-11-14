import { createHash } from "node:crypto";

/**
 * Xatti-harakat asosidagi bot detektori.
 *
 * Har bir IP + UA + sessiya uchun 60 soniyalik oyna ichida so'rov tezligi,
 * noyob yo'llar soni, brauzer sarlavhalari va cookie'lari baholanadi.
 * Ball chegaradan oshsa — qisqa muddatga blok. Bu UA blokirovkasini
 * aylanib o'tgan skriptlarni ham ushlaydi, lekin serverlessda har bir
 * instans o'z xotirasiga ega (global holat uchun Redis kerak).
 */

type GuardEntry = {
  lastSeen: number;
  score: number;
  blockedUntil: number;
  requestTimes: number[];
  pathHits: Map<string, number>;
  pageViewsWithoutCookies: number;
  uaPenalized: boolean;
  headersPenalized: boolean;
  cookiePenalized: boolean;
};

export type GuardDecision = {
  blocked: boolean;
  status: 403 | 429;
  reason: string | null;
  retryAfterSec: number;
};

const WINDOW_MS = 60_000;
const SCORE_DECAY_MS = 5 * 60_000;
const BLOCK_THRESHOLD = 80;
const BLOCK_MS = 10 * 60_000;
const HONEYPOT_BLOCK_MS = 60 * 60_000;
const MAX_ENTRIES = 4000;
const PRUNE_EVERY_MS = 60_000;
const ENTRY_TTL_MS = 15 * 60_000;

const HONEYPOT_PATHS = [
  /^\/wp-admin(\/|$)/i,
  /^\/wp-login\.php/i,
  /^\/phpmyadmin/i,
  /^\/admin\.php/i,
  /^\/config\.json$/i,
  /^\/backup/i,
  /^\/db\.sql$/i,
  /^\/server-status/i,
  /^\/actuator/i,
  /^\/cgi-bin/i,
  /^\/vendor\/phpunit/i,
  /^\/\.trap$/i,
];

/** Link preview va uptime monitorlarini "avtomatlashtirilgan bot" deb jazolamaymiz. */
const PREVIEW_OR_MONITOR_UA =
  /telegrambot|twitterbot|facebookexternalhit|whatsapp|linkedinbot|slackbot|discordbot|uptimerobot|pingdom|statuscake|site24x7|uptime-kuma/i;

const AUTOMATION_UA =
  /bot|crawler|spider|scraper|headlesschrome|phantomjs|selenium|puppeteer|playwright|python-requests|python-urllib|aiohttp|curl\/|wget|go-http-client|node-fetch|undici|axios|postmanruntime/i;

const BROWSER_UA = /mozilla\//i;

const store = new Map<string, GuardEntry>();
let lastPrune = 0;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function entryFor(key: string, now: number): GuardEntry {
  let entry = store.get(key);
  if (!entry) {
    entry = {
      lastSeen: now,
      score: 0,
      blockedUntil: 0,
      requestTimes: [],
      pathHits: new Map(),
      pageViewsWithoutCookies: 0,
      uaPenalized: false,
      headersPenalized: false,
      cookiePenalized: false,
    };
    store.set(key, entry);
  }

  const idle = now - entry.lastSeen;
  if (idle > SCORE_DECAY_MS) {
    entry.score *= 0.5 ** (idle / SCORE_DECAY_MS);
  }
  entry.lastSeen = now;
  return entry;
}

function prune(now: number) {
  if (now - lastPrune < PRUNE_EVERY_MS && store.size <= MAX_ENTRIES) return;
  lastPrune = now;

  for (const [key, entry] of store) {
    if (now - entry.lastSeen > ENTRY_TTL_MS) store.delete(key);
  }

  if (store.size > MAX_ENTRIES) {
    const oldest = [...store.entries()]
      .sort((a, b) => a[1].lastSeen - b[1].lastSeen)
      .slice(0, store.size - MAX_ENTRIES);
    for (const [key] of oldest) store.delete(key);
  }
}

function blockResponse(entry: GuardEntry, now: number, status: 403 | 429, reason: string): GuardDecision {
  return {
    blocked: true,
    status,
    reason,
    retryAfterSec: Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)),
  };
}

export function inspectRequest(input: {
  ip: string;
  userAgent: string;
  pathname: string;
  method: string;
  hasCookies: boolean;
  acceptLanguage: string | null;
  secFetchMode: string | null;
  sessionToken: string | null;
}): GuardDecision {
  const now = Date.now();
  prune(now);

  const isApi = input.pathname.startsWith("/api/");
  const key = [
    input.ip,
    hash(input.userAgent),
    input.sessionToken ? hash(input.sessionToken) : "anon",
  ].join("|");
  const entry = entryFor(key, now);

  if (entry.blockedUntil > now) {
    return blockResponse(entry, now, 429, "cooldown");
  }
  if (entry.blockedUntil > 0) {
    entry.blockedUntil = 0;
    entry.score = 0;
  }

  if (HONEYPOT_PATHS.some((pattern) => pattern.test(input.pathname))) {
    entry.blockedUntil = now + HONEYPOT_BLOCK_MS;
    entry.score = 0;
    return blockResponse(entry, now, 403, "honeypot");
  }

  const isPreviewBot = PREVIEW_OR_MONITOR_UA.test(input.userAgent);
  if (!entry.uaPenalized && !isPreviewBot && AUTOMATION_UA.test(input.userAgent)) {
    entry.uaPenalized = true;
    entry.score += 60;
  }

  if (!entry.headersPenalized && !isApi && BROWSER_UA.test(input.userAgent)) {
    if (!input.acceptLanguage) entry.score += 15;
    if (!input.secFetchMode) entry.score += 15;
    entry.headersPenalized = true;
  }

  if (!isApi && !input.hasCookies) {
    entry.pageViewsWithoutCookies += 1;
    if (!entry.cookiePenalized && entry.pageViewsWithoutCookies > 10) {
      entry.cookiePenalized = true;
      entry.score += 20;
    }
  }

  entry.requestTimes.push(now);
  entry.requestTimes = entry.requestTimes.filter((time) => time > now - WINDOW_MS);
  const requestsPerMinute = entry.requestTimes.length;
  if (requestsPerMinute > 240) entry.score += 50;
  else if (requestsPerMinute > 120) entry.score += 25;

  entry.pathHits.set(input.pathname, now);
  for (const [path, seenAt] of entry.pathHits) {
    if (seenAt <= now - WINDOW_MS) entry.pathHits.delete(path);
  }
  if (entry.pathHits.size > 60) entry.score += 40;
  else if (entry.pathHits.size > 30) entry.score += 20;

  if (!["GET", "HEAD", "POST", "OPTIONS"].includes(input.method.toUpperCase())) {
    entry.score += 60;
  }

  if (entry.score >= BLOCK_THRESHOLD) {
    entry.blockedUntil = now + BLOCK_MS;
    entry.score = 0;
    return blockResponse(entry, now, 429, "behavior");
  }

  return { blocked: false, status: 429, reason: null, retryAfterSec: 0 };
}
