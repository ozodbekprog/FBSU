export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => token.length > 0);
}

export function shingleSet(tokens: string[], k = 5): Set<string> {
  const shingles = new Set<string>();
  if (tokens.length < k) return shingles;
  for (let i = 0; i + k <= tokens.length; i += 1) {
    shingles.add(tokens.slice(i, i + k).join(" "));
  }
  return shingles;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

export function similarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  let score: number;
  if (tokensA.length < 5 && tokensB.length < 5) {
    score = jaccard(new Set(tokensA), new Set(tokensB));
  } else {
    score = jaccard(shingleSet(tokensA), shingleSet(tokensB));
  }
  return Math.round(score * 1000) / 1000;
}

export function findPairs(
  items: Array<{ id: string; text: string }>,
  threshold = 0.35,
): Array<{ aId: string; bId: string; score: number }> {
  const pairs: Array<{ aId: string; bId: string; score: number }> = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      if (a.id === b.id) continue;
      const score = similarity(a.text, b.text);
      if (score > threshold) {
        pairs.push({ aId: a.id, bId: b.id, score });
      }
    }
  }
  return pairs.sort((first, second) => second.score - first.score);
}

export function maxScoreByItem(
  pairs: Array<{ aId: string; bId: string; score: number }>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const pair of pairs) {
    if (result[pair.aId] === undefined || pair.score > result[pair.aId]) {
      result[pair.aId] = pair.score;
    }
    if (result[pair.bId] === undefined || pair.score > result[pair.bId]) {
      result[pair.bId] = pair.score;
    }
  }
  return result;
}
