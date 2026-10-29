import "server-only";

export type LocationInfo = {
  city: string | null;
  country: string | null;
  region: string | null;
  label: string;
  source: "vercel" | "ipwhois" | "local" | "unknown";
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { expiresAt: number; value: LocationInfo }>();

function safeDecode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value).trim() || null;
  } catch {
    return value.trim() || null;
  }
}

function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["uz"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function isPrivateIp(ip: string): boolean {
  const value = ip.trim().toLowerCase();
  if (!value || value === "unknown" || value === "local") return true;
  if (value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80")) {
    return true;
  }
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
  if (!v4) return false;
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function buildLabel(city: string | null, region: string | null, country: string | null): string {
  const parts = [city ?? region, country].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : "Noma'lum";
}

/**
 * IP bo'yicha joylashuv. Vercel o'z sarlavhalarida shahar/davlatni beradi —
 * qo'shimcha tarmoq chaqiruvi kerak emas. Boshqa hostingda (yoki lokalda
 * tashqi IP bo'lsa) ipwho.is ga qisqa timeout bilan murojaat qilinadi.
 */
export async function resolveLocation(headers: Headers, ip: string): Promise<LocationInfo> {
  const cityHeader = safeDecode(headers.get("x-vercel-ip-city"));
  const countryCode = headers.get("x-vercel-ip-country");
  const region = safeDecode(headers.get("x-vercel-ip-country-region"));

  if (cityHeader || countryCode) {
    const country = countryName(countryCode);
    return {
      city: cityHeader,
      country,
      region,
      label: buildLabel(cityHeader, region, country),
      source: "vercel",
    };
  }

  if (isPrivateIp(ip)) {
    return { city: null, country: null, region: null, label: "Lokal tarmoq", source: "local" };
  }

  const cached = cache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const response = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,region,city`,
      { signal: AbortSignal.timeout(1500), cache: "no-store" },
    );
    const data = (await response.json().catch(() => null)) as
      | { success?: boolean; country?: string; region?: string; city?: string }
      | null;
    if (!response.ok || !data?.success) throw new Error("geo lookup failed");

    const value: LocationInfo = {
      city: data.city?.trim() || null,
      country: data.country?.trim() || null,
      region: data.region?.trim() || null,
      label: buildLabel(data.city?.trim() || null, data.region?.trim() || null, data.country?.trim() || null),
      source: "ipwhois",
    };
    if (cache.size >= CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(ip, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  } catch {
    return { city: null, country: null, region: null, label: "Noma'lum", source: "unknown" };
  }
}
