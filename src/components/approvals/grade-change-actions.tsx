"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ensureCsrfToken } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function GradeChangeActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    const token = await ensureCsrfToken();
    const response = await fetch(`/api/grade-changes/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-csrf-token": token } : {}),
      },
      body: JSON.stringify({ action }),
    });
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    setBusy(false);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("admErrorGeneric"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => void act("approve")}>
          {t("admApprove")}
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void act("reject")}>
          {t("admReject")}
        </Button>
      </div>
      {error ? <p className="max-w-56 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
