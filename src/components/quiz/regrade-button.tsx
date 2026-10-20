"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { apiFetch } from "@/components/quiz/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

type RegradeData = {
  attempts: number;
  regraded: number;
  manualSkipped: number;
};

export function QuizRegradeButton({ quizId }: { quizId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    const result = await apiFetch<RegradeData>(
      `/api/quizzes/${quizId}/regrade`,
      "POST",
      {},
      t("crsQuizServerError"),
    );
    if (!result.ok) {
      setMessage(result.error);
      setBusy(false);
      return;
    }
    setMessage(
      result.data.manualSkipped > 0
        ? t("grdRegradeDoneManual", {
            count: result.data.regraded,
            skipped: result.data.manualSkipped,
          })
        : t("grdRegradeDone", { count: result.data.regraded }),
    );
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => void run()} disabled={busy}>
        {busy ? t("grdRegrading") : t("grdRegrade")}
      </Button>
      {message ? <span className="text-xs text-slate-500">{message}</span> : null}
    </div>
  );
}
