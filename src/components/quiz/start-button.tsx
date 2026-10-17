"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { apiFetch } from "@/components/quiz/api";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { evaluateRule } from "@/modules/course-rules/access";

type QuizRule = {
  availableFrom: string | null;
  availableTo: string | null;
};

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function StartAttemptButton({
  quizId,
  label,
}: {
  quizId: string;
  label?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lock, setLock] = useState<"before" | "after" | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await apiFetch<{ rule: QuizRule | null }>(
        `/api/course-rules?targetType=QUIZ&targetId=${encodeURIComponent(quizId)}`,
        "GET",
        undefined,
        t("crsQuizServerError"),
      );
      if (cancelled || !result.ok) return;
      const rule = result.data.rule;
      const state = evaluateRule(
        rule
          ? { availableFrom: toDate(rule.availableFrom), availableTo: toDate(rule.availableTo) }
          : null,
        new Date(),
      );
      if (!state.open) setLock(state.reason);
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId, t]);

  async function start() {
    setLoading(true);
    setError(null);
    const result = await apiFetch<{ attempt: { id: string } }>(
      `/api/quizzes/${quizId}/attempts`,
      "POST",
      undefined,
      t("crsQuizServerError"),
    );
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/quizzes/${quizId}/attempt?attemptId=${result.data.attempt.id}`);
  }

  const locked = lock !== null;

  return (
    <div>
      <Button onClick={start} disabled={loading || locked}>
        {lock === "before"
          ? "Hali ochilmagan"
          : lock === "after"
            ? "Muddat tugagan"
            : loading
              ? t("crsQuizStarting")
              : label ?? t("crsQuizStart")}
      </Button>
      {lock === "before" ? (
        <p className="mt-2 text-sm text-amber-700">Bu test hali ochilmagan</p>
      ) : null}
      {lock === "after" ? (
        <p className="mt-2 text-sm text-rose-600">Bu test muddati tugagan</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
