const NAVY: [number, number, number] = [29, 52, 96];

export function brandCoverGradient(coverColor: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(coverColor.trim());
  if (!match) {
    return "linear-gradient(125deg, #1d3460 0%, #131f3c 94%)";
  }

  const value = Number.parseInt(match[1], 16);
  const source: [number, number, number] = [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
  ];
  const mixed = source.map((channel, index) =>
    Math.round(channel * 0.32 + NAVY[index] * 0.68),
  );

  return `linear-gradient(125deg, rgb(${mixed.join(" ")}) 0%, #131f3c 94%)`;
}
