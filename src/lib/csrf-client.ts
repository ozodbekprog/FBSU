const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_HEADER = "x-csrf-token";

let cachedToken: string | null = null;
let pending: Promise<string | null> | null = null;

export function invalidateCsrfClientToken(): void {
  cachedToken = null;
}

export function getCsrfClientToken(): Promise<string | null> {
  if (cachedToken) return Promise.resolve(cachedToken);
  if (pending) return pending;
  pending = (async () => {
    try {
      const res = await fetch("/api/csrf", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; token?: string } | null;
      if (res.ok && json?.ok && typeof json.token === "string") {
        cachedToken = json.token;
      }
    } catch {
      return null;
    } finally {
      pending = null;
    }
    return cachedToken;
  })();
  return pending;
}

function needsCsrf(url: string, method: string): boolean {
  if (!MUTATION_METHODS.has(method)) return false;
  if (!url.startsWith("/api/")) return false;
  return !url.startsWith("/api/csrf");
}

export function installCsrfFetch(): () => void {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return () => {};

  const original = window.fetch.bind(window);
  let installed = false;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const simpleInput = typeof input === "string" || input instanceof URL;
    if (!installed || !simpleInput) return original(input, init);

    const url = input.toString();
    const method = (init?.method ?? "GET").toUpperCase();
    if (!needsCsrf(url, method)) return original(input, init);

    const existing = new Headers(init?.headers ?? {});
    if (existing.has(CSRF_HEADER)) return original(input, init);

    const token = await getCsrfClientToken();
    const headers = new Headers(init?.headers ?? {});
    if (token) headers.set(CSRF_HEADER, token);

    const response = await original(input, { ...(init ?? {}), headers });
    if (response.status === 403 && token) {
      invalidateCsrfClientToken();
      const fresh = await getCsrfClientToken();
      if (fresh && fresh !== token) {
        const retryHeaders = new Headers(init?.headers ?? {});
        retryHeaders.set(CSRF_HEADER, fresh);
        return original(input, { ...(init ?? {}), headers: retryHeaders });
      }
    }
    return response;
  };

  installed = true;
  return () => {
    window.fetch = original;
    installed = false;
  };
}