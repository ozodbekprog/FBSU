"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { apiFetch } from "@/components/quiz/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function RepeatExamButton({
  exam,
}: {
  exam: {
    quizId: string;
    title: string;
    durationMin: number | null;
    requireFullscreen: boolean;
    blockCopy: boolean;
    requireClient: boolean;
    webcamEnabled: boolean;
    maxWarnings: number;
    limitAction: "WARN" | "TERMINATE";
  };
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function repeat() {
    if (busy) return;
    setBusy(true);
    const now = new Date();
    const result = await apiFetch<{ id: string; code: string }>(
      "/api/secure-exams",
      "POST",
      {
        quizId: exam.quizId,
        title: exam.title,
        startsAt: new Date(now.getTime() - 60_000).toISOString(),
        endsAt: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        durationMin: exam.durationMin,
        requireFullscreen: exam.requireFullscreen,
        blockCopy: exam.blockCopy,
        requireClient: exam.requireClient,
        webcamEnabled: exam.webcamEnabled,
        maxWarnings: exam.maxWarnings,
        limitAction: exam.limitAction,
      },
      t("commonError"),
    );
    if (result.ok) {
      router.push(`/secure-exams/${result.data.id}`);
      return;
    }
    setBusy(false);
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={busy}
      onClick={() => void repeat()}
      className="relative z-10"
    >
      {busy ? t("secRepeating") : t("secRepeat")}
    </Button>
  );
}
