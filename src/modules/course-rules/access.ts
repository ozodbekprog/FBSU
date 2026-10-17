export type ActivityRuleWindow = {
  availableFrom?: Date | null;
  availableTo?: Date | null;
};

export type RuleState = { open: boolean; reason: "before" | "after" | null };

export function evaluateRule(
  rule: ActivityRuleWindow | null | undefined,
  now: Date,
): RuleState {
  if (!rule) return { open: true, reason: null };
  const from = rule.availableFrom ?? null;
  const to = rule.availableTo ?? null;
  if (from && from.getTime() > now.getTime()) return { open: false, reason: "before" };
  if (to && to.getTime() < now.getTime()) return { open: false, reason: "after" };
  return { open: true, reason: null };
}
