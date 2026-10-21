export function normalizeQuizScore(
  score: number | null | undefined,
  maxScore: number,
): number | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (maxScore <= 0) return score;
  // Imported demo attempts store the percentage (0–100) while `points`
  // holds the raw maximum (e.g. 4). Convert those to points.
  if (score > maxScore && score <= 100) {
    return Math.round((score / 100) * maxScore * 100) / 100;
  }
  return score;
}
