import "server-only";

function normalizeIp(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;

  if (value.startsWith("[") && value.includes("]")) {
    value = value.slice(1, value.indexOf("]"));
  } else {
    const hostPort = value.match(/^([^:]+):(\d{1,5})$/);
    if (hostPort) value = hostPort[1];
  }

  value = value.trim();
  if (!value || value.length > 45) return null;

  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    const octets = value.split(".").map(Number);
    if (octets.some((octet) => octet > 255)) return null;
    return value;
  }

  if (value.includes(":") && /^[0-9a-fA-F:]+$/.test(value)) {
    return value.toLowerCase();
  }

  return null;
}

export function getClientIp(headers: Headers): string | null {
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    const normalized = normalizeIp(realIp);
    if (normalized) return normalized;
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) return null;

  const hops = forwardedFor
    .split(",")
    .map((hop) => hop.trim())
    .filter((hop) => hop.length > 0);
  const lastHop = hops[hops.length - 1];
  if (!lastHop) return null;

  return normalizeIp(lastHop);
}
