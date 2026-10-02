export type BountySeverity = "low" | "medium" | "high";

export const BOUNTY_POINTS: Record<BountySeverity, number> = {
  low: 20,
  medium: 30,
  high: 50,
};

export const BOUNTY_POINTS_DEFAULT = 25;

export type BountyFix = {
  status: string | null;
  worker: string | null;
  deployedAt: string | null;
};

export type BountyReporter = {
  name: string | null;
  role: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readSeverity(meta: unknown): BountySeverity | null {
  const ai = asRecord(asRecord(meta)?.ai);
  const severity = ai?.severity;
  if (severity === "low" || severity === "medium" || severity === "high") return severity;
  return null;
}

export function readFix(meta: unknown): BountyFix {
  const fix = asRecord(asRecord(meta)?.fix);
  return {
    status: asString(fix?.status),
    worker: asString(fix?.worker),
    deployedAt: asString(fix?.deployedAt),
  };
}

export function readReporter(meta: unknown): BountyReporter {
  const root = asRecord(meta);
  return {
    name: asString(root?.userName),
    role: asString(root?.userRole),
  };
}

export function bountyPoints(status: string, meta: unknown): number {
  if (status !== "FIXED") return 0;
  const severity = readSeverity(meta);
  return severity ? BOUNTY_POINTS[severity] : BOUNTY_POINTS_DEFAULT;
}

export type BountyLeader = {
  name: string;
  role: string | null;
  points: number;
  fixed: number;
  total: number;
};

export function bountyLeaders(
  items: { status: string; name: string | null; role: string | null; meta: unknown }[],
): BountyLeader[] {
  const map = new Map<string, BountyLeader>();
  for (const item of items) {
    const name = item.name?.trim();
    if (!name) continue;
    const row = map.get(name) ?? { name, role: item.role, points: 0, fixed: 0, total: 0 };
    row.total += 1;
    if (item.status === "FIXED") {
      row.fixed += 1;
      row.points += bountyPoints(item.status, item.meta);
    }
    if (!row.role && item.role) row.role = item.role;
    map.set(name, row);
  }
  return [...map.values()].sort(
    (a, b) => b.points - a.points || b.fixed - a.fixed || a.name.localeCompare(b.name),
  );
}

export type FixerStat = {
  node: string;
  count: number;
};

export function fixerStats(items: { meta: unknown }[]): FixerStat[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const fix = readFix(item.meta);
    if (fix.status !== "deployed" || !fix.worker) continue;
    map.set(fix.worker, (map.get(fix.worker) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([node, count]) => ({ node, count }))
    .sort((a, b) => b.count - a.count || a.node.localeCompare(b.node));
}
