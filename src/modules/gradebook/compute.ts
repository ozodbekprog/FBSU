export type GradebookCategory = { id: string; name: string; weight: number };

export type GradebookItem = {
  id: string;
  categoryId: string | null;
  name: string;
  weight: number;
  maxScore: number;
};

export type StudentFinal = {
  studentId: string;
  percent: number | null;
  categoryPercents: Record<string, number | null>;
};

export type GradebookScore = { itemId: string; studentId: string; score: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function weightedAverage(entries: Array<{ percent: number; weight: number }>): number | null {
  if (entries.length === 0) return null;
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    return entries.reduce((sum, entry) => sum + entry.percent, 0) / entries.length;
  }
  return entries.reduce((sum, entry) => sum + entry.percent * entry.weight, 0) / totalWeight;
}

export function computeFinalGrades(
  categories: GradebookCategory[],
  items: GradebookItem[],
  studentIds: string[],
  scores: ReadonlyArray<GradebookScore>,
): StudentFinal[] {
  const scoreIndex = new Map<string, number>();
  for (const entry of scores) {
    scoreIndex.set(`${entry.itemId}::${entry.studentId}`, entry.score);
  }

  return studentIds.map((studentId) => {
    const itemPercents = new Map<string, number>();
    const allPercents: number[] = [];

    for (const item of items) {
      if (item.maxScore <= 0) continue;
      const raw = scoreIndex.get(`${item.id}::${studentId}`);
      if (raw === undefined || raw === null) continue;
      const percent = clamp((raw / item.maxScore) * 100, 0, 100);
      itemPercents.set(item.id, percent);
      allPercents.push(percent);
    }

    const categoryPercents: Record<string, number | null> = {};
    const validCategoryEntries: Array<{ percent: number; weight: number }> = [];

    for (const category of categories) {
      const entries: Array<{ percent: number; weight: number }> = [];
      for (const item of items) {
        if (item.categoryId !== category.id) continue;
        const percent = itemPercents.get(item.id);
        if (percent === undefined) continue;
        entries.push({ percent, weight: item.weight });
      }
      const categoryPercent = weightedAverage(entries);
      categoryPercents[category.id] = categoryPercent;
      if (categoryPercent !== null) {
        validCategoryEntries.push({ percent: categoryPercent, weight: category.weight });
      }
    }

    let percent: number | null = null;
    if (validCategoryEntries.length > 0) {
      percent = weightedAverage(validCategoryEntries);
    }
    if (percent === null) {
      percent = weightedAverage(allPercents.map((value) => ({ percent: value, weight: 0 })));
    }

    return { studentId, percent, categoryPercents };
  });
}
