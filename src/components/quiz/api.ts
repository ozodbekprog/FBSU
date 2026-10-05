import { ensureCsrfToken } from "@/lib/api";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function apiFetch<T = unknown>(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
  fallbackError = "Server javob bermadi",
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const token = await ensureCsrfToken();
    if (token) headers["x-csrf-token"] = token;
  }
  const response = await fetch(url, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as ApiResult<T> | null;
  if (!json) return { ok: false, error: fallbackError };
  return json;
}
