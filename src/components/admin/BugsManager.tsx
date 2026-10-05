"use client";

import { useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Textarea } from "@/components/ui";
import { classifyBug } from "@/components/bugs/bug-utils";
import { apiFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n";

type BugStatus = "NEW" | "IN_REVIEW" | "FIXED" | "REJECTED";

export type BugItem = {
  id: string;
  url: string | null;
  message: string;
  stack: string | null;
  meta: Record<string, unknown> | null;
  status: BugStatus;
  adminNote: string | null;
  createdAt: string;
  user: { name: string; role: string; email: string } | null;
};

const STATUS_META: Record<BugStatus, { label: keyof Dictionary; tone: "amber" | "blue" | "green" | "slate" }> = {
  NEW: { label: "admStatusNew", tone: "amber" },
  IN_REVIEW: { label: "admStatusInReview", tone: "blue" },
  FIXED: { label: "admStatusFixed", tone: "green" },
  REJECTED: { label: "admStatusRejected", tone: "slate" },
};

const ROLE_LABELS: Record<string, keyof Dictionary> = {
  ADMIN: "admRoleAdmin",
  TEACHER: "admRoleTeacher",
  STUDENT: "admRoleStudent",
};

const SEVERITY_LABELS: Record<string, keyof Dictionary> = {
  low: "admSeverityLow",
  medium: "admSeverityMedium",
  high: "admSeverityHigh",
};

export function BugsManager({ reports }: { reports: BugItem[] }) {
  const { t } = useI18n();
  const [items, setItems] = useState(reports);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(
    id: string,
    payload: { status?: BugStatus; adminNote?: string | null },
  ) {    setBusyId(id);
    setError(null);
    try {
      const res = await apiFetch(`/api/bugs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; data?: { report: { status: BugStatus; adminNote: string | null } } }
        | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.error ?? t("admBugSaveError"));
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: json.data!.report.status, adminNote: json.data!.report.adminNote }
            : item,
        ),
      );
    } catch {
      setError(t("admNetworkError"));
    } finally {
      setBusyId(null);
    }
  }

  async function fixAction(id: string, action: "request" | "deploy" | "cancel") {
    setBusyId(id);
    setError(null);
    try {
      const res = await apiFetch(`/api/bugs/${id}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; data?: { report: { meta?: Record<string, unknown> } } }
        | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.error ?? t("admErrorGeneric"));
        return;
      }
      const meta = json.data.report.meta ?? {};
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, meta } : item)));
    } catch {
      setError(t("admNetworkError"));
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {    return (
      <EmptyState
        title={t("admBugEmptyTitle")}
        description={t("admBugEmptyDesc")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {items.map((item) => {
        const suggestion = classifyBug(item.message, item.stack);
        const note = typeof item.meta?.note === "string" ? item.meta.note : null;
        const ai = (item.meta?.ai ?? null) as {
          summary?: string;
          cause?: string;
          fixHint?: string;
          severity?: string;
        } | null;
        const fix = (item.meta?.fix ?? null) as {
          status?: string;
          summary?: string;
          files?: number;
          log?: string;
        } | null;
        const attachment =
          typeof item.meta?.attachment === "string" ? (item.meta.attachment as string) : null;
        const statusMeta = STATUS_META[item.status];
        const busy = busyId === item.id;
        return (
          <Card key={item.id}>
            <CardHeader
              title={item.message.length > 70 ? `${item.message.slice(0, 70)}…` : item.message}
              subtitle={`${item.user?.name ?? t("admUnknown")} · ${ROLE_LABELS[item.user?.role ?? ""] ? t(ROLE_LABELS[item.user?.role ?? ""]) : "—"} · ${fmtDateTime(item.createdAt)}`}
              action={<Badge tone={statusMeta.tone}>{t(statusMeta.label)}</Badge>}
            />
            <CardBody className="space-y-3">
              <p className="rounded-xl bg-brand-50/70 px-3 py-2 text-sm text-brand-900">
                {t("admBugAiAnalysis")} <span className="font-semibold">{suggestion.title}</span> — {suggestion.hint}
              </p>

              {ai ? (
                <div className="space-y-1 rounded-xl bg-violet-50/70 px-3 py-2 text-sm text-violet-950">
                  <p className="font-semibold">{t("admBugDeepSeek")}</p>
                  {ai.summary ? <p>{ai.summary}</p> : null}
                  {ai.cause ? (
                    <p>
                      <span className="font-medium">{t("admBugCause")}</span> {ai.cause}
                    </p>
                  ) : null}
                  {ai.fixHint ? (
                    <p>
                      <span className="font-medium">{t("admBugSolution")}</span> {ai.fixHint}
                    </p>
                  ) : null}
                  {ai.severity ? (
                    <p>
                      {t("admBugSeverity")}{" "}
                      {SEVERITY_LABELS[ai.severity] ? t(SEVERITY_LABELS[ai.severity]) : ai.severity}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {fix ? (
                <div className="space-y-1 rounded-xl bg-emerald-50/70 px-3 py-2 text-sm text-emerald-950">
                  <p className="font-semibold">
                    {fix.status === "queued"
                      ? t("admBugFixQueued")
                      : fix.status === "working"
                        ? t("admBugFixWorking")
                        : fix.status === "ready"
                          ? t("admBugFixReady")
                          : fix.status === "deploying"
                            ? t("admBugFixDeploying")
                            : fix.status === "deployed"
                              ? t("admBugFixDeployed")
                              : fix.status === "failed"
                                ? t("admBugFixFailed")
                                : t("admBugFixCancelled")}
                  </p>
                  {fix.summary ? <p>{fix.summary}</p> : null}
                  {typeof fix.files === "number" ? (
                    <p>
                      <span className="font-medium">{t("admBugChangedFiles")}</span> {t("admCount", { count: fix.files })}
                    </p>
                  ) : null}
                  {fix.log ? <p className="text-xs text-emerald-900/70">{t("admBugLog", { log: fix.log })}</p> : null}
                </div>
              ) : null}

              {attachment ? (
                <a href={attachment} target="_blank" rel="noreferrer" className="block w-fit">
                  <img
                    src={attachment}
                    alt={t("admBugScreenshotAlt")}
                    className="max-h-52 rounded-xl border border-slate-200 shadow-sm"
                  />
                </a>
              ) : null}

              <div className="grid gap-1.5 text-xs text-slate-500 sm:grid-cols-2">
                <p>
                  <span className="font-medium text-slate-600">{t("admBugPage")}</span> {item.url ?? "—"}
                </p>
                <p>
                  <span className="font-medium text-slate-600">Email:</span> {item.user?.email ?? "—"}
                </p>
              </div>

              {note ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-700">{t("admBugUserNote")}</span> {note}
                </p>
              ) : null}

              {item.stack ? (
                <details className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-slate-500">
                    {t("admBugTechDetails")}
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-slate-600">
                    {item.stack}
                  </pre>
                </details>
              ) : null}

              <Textarea
                value={drafts[item.id] ?? item.adminNote ?? ""}
                onChange={(event) =>
                  setDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
                placeholder={t("admBugAdminNotePlaceholder")}
                rows={2}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    void update(item.id, { status: "IN_REVIEW" });
                  }}
                >{t("admBugReview")}</Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    void update(item.id, { status: "FIXED" });
                  }}
                >{t("admBugMarkFixed")}</Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    void update(item.id, { status: "REJECTED" });
                  }}
                >{t("admBugReject")}</Button>
                {fix && ["queued", "working", "deploying"].includes(fix.status ?? "") ? null : fix?.status ===
                  "ready" ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      void fixAction(item.id, "deploy");
                    }}
                  >
                    {t("admBugApproveDeploy")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      void fixAction(item.id, "request");
                    }}
                  >
                    {t("admBugAiFix")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    void update(item.id, {
                      adminNote: (drafts[item.id] ?? item.adminNote ?? "").trim() || null,
                    });
                  }}
                >{t("admBugSaveNote")}</Button>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
