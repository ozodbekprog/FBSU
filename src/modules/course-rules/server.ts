import "server-only";
import { prisma } from "@/lib/prisma";
import { evaluateRule, type RuleState } from "./access";

export async function getRuleState(
  targetType: "ASSIGNMENT" | "QUIZ",
  targetId: string,
  now: Date = new Date(),
): Promise<RuleState> {
  const rule = await prisma.activityRule.findUnique({
    where: { targetType_targetId: { targetType, targetId } },
    select: { availableFrom: true, availableTo: true },
  });
  return evaluateRule(rule, now);
}

export async function assertActivityOpen(
  targetType: "ASSIGNMENT" | "QUIZ",
  targetId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: 403 }> {
  const state = await getRuleState(targetType, targetId);
  if (state.open) return { ok: true };
  return {
    ok: false,
    status: 403,
    error: state.reason === "before" ? "Bu faoliyat hali ochilmagan" : "Bu faoliyat muddati tugagan",
  };
}
