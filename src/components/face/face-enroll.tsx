"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/utils";
import { FaceScan, ensureFaceModels } from "@/components/face/face-scan";

export function FaceEnroll({
  enrolled,
  enrolledAt,
}: {
  enrolled: boolean;
  enrolledAt: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ensureFaceModels().catch(() => void 0);
  }, []);

  async function save(descriptor: number[]) {
    setBusy(true);
    setError(null);
    setScanning(false);
    const response = await apiFetch("/api/face", {
      method: "POST",
      body: JSON.stringify({ descriptor }),
    });
    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("schFaceError"));
      setBusy(false);
      return;
    }
    setNotice(t("schFaceSaved"));
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(t("schFaceRemoveConfirm"))) return;
    setBusy(true);
    setError(null);
    const response = await apiFetch("/api/face", { method: "DELETE" });
    const json = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    setBusy(false);
    if (!response.ok || !json?.ok) {
      setError(t("schFaceError"));
      return;
    }
    setNotice(t("schFaceRemoved"));
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M9 10h.01M15 10h.01" />
                <path d="M9.5 15a4 4 0 0 0 5 0" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{t("schFaceTitle")}</p>
              {enrolledAt ? (
                <p className="text-xs text-slate-500">
                  {t("schFaceEnrolledAt", { date: fmtDateTime(enrolledAt) })}
                </p>
              ) : (
                <p className="text-xs text-slate-500">{t("schFacePageSubtitle")}</p>
              )}
            </div>
          </div>
          {enrolled ? (
            <Badge tone="green">{t("schFaceEnrolled")}</Badge>
          ) : (
            <Badge tone="amber">{t("schFaceNotEnrolled")}</Badge>
          )}
        </div>

        {notice ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{notice}</p>
        ) : null}
        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        {scanning ? (
          <FaceScan onDescriptor={(descriptor) => void save(descriptor)} onCancel={() => setScanning(false)} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setScanning(true)} disabled={busy}>
              {enrolled ? t("schFaceReenroll") : t("schFaceEnrollButton")}
            </Button>
            {enrolled ? (
              <Button variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => void remove()} disabled={busy}>
                {t("schFaceRemove")}
              </Button>
            ) : null}
          </div>
        )}

        <p className="text-xs text-slate-500">{t("schFacePrivacy")}</p>
      </CardBody>
    </Card>
  );
}
