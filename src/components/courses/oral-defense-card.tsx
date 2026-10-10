"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch } from "@/lib/api";

type DefenseStatus = "REQUESTED" | "ACCEPTED" | "DECLINED" | "DONE" | "CANCELLED";

type Defense = {
  id: string;
  status: DefenseStatus;
  note: string | null;
  result: "PASSED" | "FAILED" | null;
  resultNote: string | null;
};

export function OralDefenseCard({ assignmentId }: { assignmentId: string }) {
  const { t } = useI18n();
  const [defense, setDefense] = useState<Defense | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await apiFetch(
      `/api/oral-defenses?assignmentId=${encodeURIComponent(assignmentId)}`,
    );
    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; data?: { defense: Defense | null } }
      | null;
    if (response.ok && json?.ok) setDefense(json.data?.defense ?? null);
  }, [assignmentId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function request() {
    setBusy(true);
    setError(null);
    const response = await apiFetch("/api/oral-defenses", {
      method: "POST",
      body: JSON.stringify({ assignmentId, note: note.trim() ? note.trim() : null }),
    });
    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; data?: { defense: Defense } }
      | null;
    setBusy(false);
    if (!response.ok || !json?.ok || !json.data) {
      setError(json?.error ?? t("commonError"));
      return;
    }
    setDefense(json.data.defense);
    setOpen(false);
    setNote("");
  }

  async function cancel() {
    if (!defense) return;
    setBusy(true);
    setError(null);
    const response = await apiFetch(`/api/oral-defenses/${defense.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "cancel" }),
    });
    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; data?: { defense: Defense } }
      | null;
    setBusy(false);
    if (!response.ok || !json?.ok || !json.data) {
      setError(json?.error ?? t("commonError"));
      return;
    }
    setDefense(json.data.defense);
  }

  const badge = (() => {
    if (!defense) return null;
    if (defense.status === "DONE") {
      return defense.result === "PASSED" ? (
        <Badge tone="green">{t("crsOralStatusPassed")}</Badge>
      ) : (
        <Badge tone="rose">{t("crsOralStatusFailed")}</Badge>
      );
    }
    if (defense.status === "REQUESTED") return <Badge tone="amber">{t("crsOralStatusRequested")}</Badge>;
    if (defense.status === "ACCEPTED") return <Badge tone="blue">{t("crsOralStatusAccepted")}</Badge>;
    if (defense.status === "DECLINED") return <Badge tone="rose">{t("crsOralStatusDeclined")}</Badge>;
    return <Badge tone="slate">{t("crsOralStatusCancelled")}</Badge>;
  })();

  const canRequest =
    !defense || defense.status === "DECLINED" || defense.status === "CANCELLED" || defense.status === "DONE";

  return (
    <Card>
      <CardHeader title={t("crsOralTitle")} subtitle={t("crsOralSubtitle")} action={badge} />
      <CardBody className="space-y-3">
        {defense?.note ? <p className="text-sm text-slate-600">“{defense.note}”</p> : null}
        {defense?.resultNote ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{defense.resultNote}</p>
        ) : null}
        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        {canRequest ? (
          open ? (
            <div className="space-y-2">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("crsOralNotePlaceholder")}
                rows={2}
                maxLength={500}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void request()} disabled={busy}>
                  {t("crsOralSend")}
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                  {t("commonCancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setOpen(true)} disabled={busy}>
              {t("crsOralRequest")}
            </Button>
          )
        ) : (
          <Button
            variant="ghost"
            className="text-rose-600 hover:bg-rose-50"
            onClick={() => void cancel()}
            disabled={busy}
          >
            {t("crsOralCancel")}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
