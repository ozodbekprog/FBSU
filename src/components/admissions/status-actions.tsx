"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdmissionStatus } from "@prisma/client";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

type Labels = {
  documents: string;
  exam: string;
  pass: string;
  reject: string;
  enroll: string;
  enrollHint: string;
  restore: string;
  needEmail: string;
};

type Action = {
  label: string;
  tone: "primary" | "secondary" | "danger";
  status?: AdmissionStatus;
  enroll?: boolean;
};

export function StatusActions({
  applicationId,
  status,
  hasStudent,
  labels,
}: {
  applicationId: string;
  status: AdmissionStatus;
  hasStudent: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions: Action[] = [];
  if (status === "NEW") {
    actions.push({ status: "DOCUMENTS", label: labels.documents, tone: "primary" });
    actions.push({ status: "REJECTED", label: labels.reject, tone: "danger" });
  } else if (status === "DOCUMENTS") {
    actions.push({ status: "EXAM", label: labels.exam, tone: "primary" });
    actions.push({ status: "REJECTED", label: labels.reject, tone: "danger" });
  } else if (status === "EXAM") {
    actions.push({ status: "PASSED", label: labels.pass, tone: "primary" });
    actions.push({ status: "REJECTED", label: labels.reject, tone: "danger" });
  } else if (status === "PASSED") {
    if (!hasStudent) actions.push({ enroll: true, label: labels.enroll, tone: "primary" });
    actions.push({ status: "REJECTED", label: labels.reject, tone: "danger" });
  } else if (status === "REJECTED") {
    actions.push({ status: "NEW", label: labels.restore, tone: "secondary" });
  }

  async function run(action: Action) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const body = action.enroll ? { action: "enroll" } : { status: action.status };
      const res = await apiFetch(`/api/admissions/${applicationId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(
          json?.error === "Talaba qilish uchun email kerak" ? labels.needEmail : json?.error ?? t("commonError"),
        );
        return;
      }
      router.refresh();
    } catch {
      setError(t("commonNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  if (hasStudent) {
    return (
      <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
        ✓ {labels.enrollHint}
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {actions.map((action, index) => (
        <Button
          key={index}
          type="button"
          variant={action.tone === "danger" ? "secondary" : action.tone === "primary" ? "primary" : "secondary"}
          className={
            action.tone === "danger"
              ? "w-full justify-center border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
              : "w-full justify-center"
          }
          disabled={busy}
          onClick={() => void run(action)}
        >
          {action.label}
        </Button>
      ))}
      {status === "PASSED" ? (
        <p className="pt-1 text-xs leading-relaxed text-slate-500">{labels.enrollHint}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
