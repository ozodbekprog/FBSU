export function roomNameFrom(seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  const value = Math.abs(hash >>> 0);
  return `fbsu-${value.toString(36)}`;
}

export function jitsiUrl(room: string): string {
  return `https://meet.jit.si/${room}`;
}

export function jitsiEmbedUrl(room: string, displayName?: string): string {
  const base = `https://meet.jit.si/${room}`;
  if (!displayName) return `${base}#config.prejoinPageEnabled=false`;
  return `${base}#userInfo.displayName=%22${encodeURIComponent(displayName)}%22&config.prejoinPageEnabled=false`;
}
