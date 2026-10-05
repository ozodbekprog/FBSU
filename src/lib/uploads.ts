import path from "node:path";

/**
 * Single source of truth for where uploaded files live.
 *
 * Uploads must never be written inside `public/`: Next.js serves that folder
 * as static assets, so anything dropped there is readable at `/uploads/<name>`
 * without a session — completely bypassing the authenticated
 * `/api/uploads/[...path]` download route. A misconfigured `UPLOAD_DIR` would
 * silently reintroduce that hole, so it is rejected here (fail-safe) instead of
 * being trusted.
 */
const SAFE_FALLBACK = path.join(process.cwd(), "uploads");

let warnedAboutMisconfig = false;

export function uploadsRoot(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  const base = configured ? path.resolve(configured) : SAFE_FALLBACK;

  const publicDir = path.resolve(process.cwd(), "public");
  if (base === publicDir || base.startsWith(publicDir + path.sep)) {
    if (!warnedAboutMisconfig) {
      warnedAboutMisconfig = true;
      console.warn(
        `[uploads] UPLOAD_DIR (${base}) public/ ichida joylashgan — fayllar ` +
          `ochiq statik fayl sifatida tarqatilardi. Xavfsiz yo'lga yoziladi: ${SAFE_FALLBACK}`,
      );
    }
    return SAFE_FALLBACK;
  }

  return base;
}

/** Content types we are willing to echo back to the browser. */
const SAFE_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".txt": "text/plain; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/**
 * Resolve the response Content-Type from an allowlist. Unknown extensions get
 * `application/octet-stream` instead of a guessed type, so a stray `.html` or
 * `.svg` can never be rendered inline on our own origin (stored XSS).
 */
export function safeUploadContentType(filePath: string): string {
  return SAFE_CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}