const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function parseIpv4(value: string): number | null {
  const match = IPV4_PATTERN.exec(value);
  if (!match) return null;
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return null;
  return octets[0] * 16777216 + octets[1] * 65536 + octets[2] * 256 + octets[3];
}

function normalizeIpv4(value: string): string | null {
  const parsed = parseIpv4(value);
  if (parsed === null) return null;
  return [
    Math.floor(parsed / 16777216) % 256,
    Math.floor(parsed / 65536) % 256,
    Math.floor(parsed / 256) % 256,
    parsed % 256,
  ].join(".");
}

export function normalizeSubnet(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  const slash = trimmed.indexOf("/");
  if (slash === -1) return normalizeIpv4(trimmed);

  if (trimmed.indexOf("/", slash + 1) !== -1) return null;

  const ip = normalizeIpv4(trimmed.slice(0, slash).trim());
  if (!ip) return null;

  const rawPrefix = trimmed.slice(slash + 1).trim();
  if (!/^\d{1,2}$/.test(rawPrefix)) return null;
  const prefix = Number(rawPrefix);
  if (prefix > 32) return null;

  return `${ip}/${prefix}`;
}

export function isIpInSubnet(ip: string, subnet: string): boolean {
  const normalizedIp = normalizeIpv4(ip.trim());
  if (!normalizedIp) return false;

  const normalizedSubnet = normalizeSubnet(subnet);
  if (!normalizedSubnet) return false;

  const ipValue = parseIpv4(normalizedIp);
  const [network, rawPrefix] = normalizedSubnet.split("/");
  const networkValue = parseIpv4(network ?? "");
  if (ipValue === null || networkValue === null) return false;

  if (rawPrefix === undefined) return ipValue === networkValue;

  const prefix = Number(rawPrefix);
  if (prefix === 0) return true;
  const blockSize = 2 ** (32 - prefix);
  return Math.floor(ipValue / blockSize) === Math.floor(networkValue / blockSize);
}
