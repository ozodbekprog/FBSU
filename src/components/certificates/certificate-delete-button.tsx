"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { ensureCsrfToken } from "@/lib/api";

type ApiResult = { ok?: boolean; error?: string } | null;

export function CertificateDeleteButton({
  certificateId,
  studentName,
}: {
  certificateId: string;
  studentName: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!window.confirm(t("grdDeleteConfirm", { name: studentName }))) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await ensureCsrfToken();
      const headers: Record<string, string> = {};
      if (token) headers["x-csrf-token"] = token;
      const response = await fetch(`/api/certificates/${certificateId}`, {
        method: "DELETE",
        headers,
      });
      const json = (await response.json().catch(() => null)) as ApiResult;
      if (!response.ok || !json?.ok) {
        setError(json?.error ?? t("grdDeleteError"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("grdNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="danger" size="sm" onClick={onDelete} disabled={busy}>
        {busy ? t("grdDeleting") : t("grdDelete")}
      </Button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
