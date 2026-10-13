"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { apiFetch } from "@/components/quiz/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await apiFetch<{ runId: string }>(
      "/api/secure-exams/join",
      "POST",
      { code },
      t("secJoinError"),
    );
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/exam/${result.data.runId}`);
  }

  return (
    <Card className="p-5">
      <p className="font-semibold tracking-tight text-slate-900">{t("secJoinTitle")}</p>
      <p className="mt-1 text-sm text-slate-500">{t("secJoinSubtitle")}</p>
      <div className="mt-4 space-y-3">
        <div>
          <Label>{t("secCodeLabel")}</Label>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 12))}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
            placeholder={t("secJoinPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            className="font-mono text-lg tracking-[0.3em] uppercase"
          />
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button onClick={() => void submit()} disabled={busy || code.trim().length === 0} className="w-full">
          {busy ? t("secJoining") : t("secJoinButton")}
        </Button>
      </div>
    </Card>
  );
}
