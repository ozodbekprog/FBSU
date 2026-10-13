"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { apiFetch } from "@/components/quiz/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function StartExamButton({ code }: { code: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await apiFetch<{ runId: string }>(
      "/api/secure-exams/join",
      "POST",
      { code },
      t("commonNetworkError"),
    );
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/exam/${result.data.runId}`);
  }

  return (
    <div>
      <Button
        size="lg"
        className="w-full py-3 text-base!"
        disabled={busy}
        onClick={() => void start()}
      >
        {busy ? t("secJoining") : t("secJoinButton")}
      </Button>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
