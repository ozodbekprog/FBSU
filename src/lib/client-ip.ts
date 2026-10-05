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

/**
 * Resolve the client IP for rate limiting and audit logs.
 *
 * Rate-limit keys are built from this value, so a spoofable source would let
 * one attacker rotate the key on every request and defeat every limit. The
 * app is therefore bound to 127.0.0.1 (see deploy/ttpu-lms.service and the
 * systemd unit), which means these headers can only have been set by the
 * reverse proxy in front of it — never by an external client. `TRUSTED_PROXY`
 * exists for deployments where the socket is reachable from other hosts.
 */
const TRUSTED_PROXY = process.env.TRUSTED_PROXY === "1";

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
  // `X-Forwarded-For: client, proxy1, proxy2` — the left-most entry is the
  // original client, the right-most is the closest proxy. Trusting the right
  // most entry (previous behaviour) means every hop behind us can pick the
  // key, so we take the left-most entry instead.
  const firstHop = hops[0];
  if (!firstHop) return null;

  const normalized = normalizeIp(firstHop);
  if (normalized) return normalized;

  // Without a trusted proxy in front of us the headers are attacker
  // controlled; fall back to the right-most hop only when explicitly allowed.
  if (!TRUSTED_PROXY) return null;
  const lastHop = hops[hops.length - 1];
  return lastHop ? normalizeIp(lastHop) : null;
}
