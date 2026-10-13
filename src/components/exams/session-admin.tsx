"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, CardBody, CardHeader, Input, Progress, Select, Table } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { AttendanceBadge } from "./session-badges";
import { SHEET_STATUSES, SHEET_STATUS_KEY, type SessionSheetRow } from "./session-shared";
import { SheetImportDialog } from "./sheet-import-dialog";

type Draft = { seat: string; status: string; score: string };

function buildDrafts(rows: SessionSheetRow[]) {
  const drafts: Record<string, Draft> = {};
  for (const row of rows) {
    drafts[row.studentId] = {
      seat: row.seat ?? "",
      status: row.status,
      score: row.score != null ? String(row.score) : "",
    };
  }
  return drafts;
}

export function SheetManager({ sessionId, rows }: { sessionId: string; rows: SessionSheetRow[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => buildDrafts(rows));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [force, setForce] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const admittedCount = rows.filter((row) => row.admitted).length;

  function patchDraft(studentId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] ?? { seat: "", status: "PENDING", score: "" }),
        ...patch,
      },
    }));
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/exams/sessions/${sessionId}/sheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      data?: { created?: number; skipped?: number; ineligible?: number };
    } | null;
    setGenerating(false);
    if (!response.ok || !json?.ok || !json.data) {
      setError(json?.error ?? t("grdExSheetGenError"));
      return;
    }
    const skipped = json.data.ineligible ?? 0;
    setNotice(
      t("grdExSheetGenNotice", { created: json.data.created ?? 0, skipped: json.data.skipped ?? 0 }) +
        (skipped > 0 ? t("grdExSheetGenSkipped", { skipped }) : ""),
    );
    router.refresh();
  }

  async function forceAdd(studentId: string) {
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/exams/sessions/${sessionId}/sheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true, studentIds: [studentId] }),
    });
    const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("grdExAddError"));
      return;
    }
    setNotice(t("grdExForceAdded"));
    router.refresh();
  }

  async function saveRow(row: SessionSheetRow) {
    if (!row.sheetId) return;
    const draft = drafts[row.studentId] ?? { seat: "", status: row.status, score: "" };
    const trimmed = draft.score.trim();
    const score = trimmed === "" ? null : Number(trimmed);
    if (score !== null && (!Number.isInteger(score) || score < 0 || score > 100)) {
      setRowErrors((current) => ({ ...current, [row.studentId]: t("grdInvalidScore") }));
      return;
    }
    setSavingId(row.studentId);
    setRowErrors((current) => ({ ...current, [row.studentId]: "" }));
    const response = await fetch(`/api/exams/sheets/${row.sheetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seat: draft.seat.trim() || null, status: draft.status, score }),
    });
    const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setSavingId(null);
    if (!response.ok || !json?.ok) {
      setRowErrors((current) => ({ ...current, [row.studentId]: json?.error ?? t("grdExRowSaveError") }));
      return;
    }
    setNotice(t("grdExResultSaved", { name: row.studentName }));
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title={t("grdExSheetsTitle")}
        subtitle={t("grdExSheetsSubtitle", { total: rows.length, admitted: admittedCount })}
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={force}
                onChange={(event) => setForce(event.target.checked)}
                className="size-4 rounded border-slate-300 accent-brand-700"
              />
              {t("grdExIncludeIneligible")}
            </label>
            {/* Import: oddiy (matn) va AI (tartibsiz matnni tozalash) */}
            <SheetImportDialog sessionId={sessionId} />
            <Button size="sm" onClick={generate} disabled={generating}>
              {generating ? t("grdExGenerating") : t("grdExGenerateSheets")}
            </Button>
          </div>
        }
      />
      <CardBody>
        {notice ? (
          <p className="mb-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">{notice}</p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>
        ) : null}

        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
            {t("grdExNoStudents")}
          </p>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <th className="rounded-l-xl py-2.5 pr-3 pl-3 text-left font-medium">{t("grdStudent")}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t("grdAttendance")}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t("grdPermission")}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t("grdSeat")}</th>
                <th className="px-3 py-2.5 text-left font-medium">{t("grdResult")}</th>
                <th className="rounded-r-xl px-3 py-2.5 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const draft = drafts[row.studentId] ?? { seat: "", status: row.status, score: "" };
                return (
                  <tr key={row.studentId} className={cn("align-top", !row.admitted && "bg-slate-50/40")}>
                    <td className="py-3 pr-3 pl-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.studentName} size={32} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">{row.studentName}</p>
                          <p className="text-xs text-slate-600">{row.studentGroup ?? t("grdNoGroup")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="w-36">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            {row.attendance.present + row.attendance.late + row.attendance.excused}/
                            {row.attendance.total}
                          </span>
                          <span className={cn("font-semibold", row.attendance.eligible ? "text-emerald-600" : "text-rose-600")}>
                            {row.attendance.percent}%
                          </span>
                        </div>
                        <Progress value={row.attendance.percent} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <AttendanceBadge attendance={row.attendance} />
                        {row.admitted && !row.attendance.eligible ? (
                          <span className="text-[11px] font-medium text-amber-600">{t("grdExForceAddedShort")}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {row.sheetId ? (
                        <Input
                          value={draft.seat}
                          onChange={(event) => patchDraft(row.studentId, { seat: event.target.value })}
                          maxLength={20}
                          placeholder="A-1"
                          className="w-24! px-2.5! py-1.5!"
                        />
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {row.sheetId ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={draft.status}
                            onChange={(event) => patchDraft(row.studentId, { status: event.target.value })}
                            className="w-36! px-2.5! py-1.5!"
                          >
                            {SHEET_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {t(SHEET_STATUS_KEY[status])}
                              </option>
                            ))}
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={draft.score}
                            onChange={(event) => patchDraft(row.studentId, { score: event.target.value })}
                            placeholder={t("grdScore")}
                            className="w-20! px-2.5! py-1.5!"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                      {rowErrors[row.studentId] ? (
                        <p className="mt-1.5 text-xs text-rose-600">{rowErrors[row.studentId]}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {row.sheetId ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => saveRow(row)}
                          disabled={savingId === row.studentId}
                        >
                          {savingId === row.studentId ? "..." : t("commonSave")}
                        </Button>
                      ) : !row.attendance.eligible ? (
                        <Button size="sm" variant="gold" onClick={() => forceAdd(row.studentId)}>
                          {t("grdExForceAdd")}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-600">{t("grdExNotEnrolled")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}

export function SessionStatusActions({
  sessionId,
  admissionOpen,
}: {
  sessionId: string;
  admissionOpen: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleAdmission() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/exams/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admissionOpen: !admissionOpen }),
    });
    const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setBusy(false);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("grdExUpdateError"));
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(t("grdExDeleteConfirm"))) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/exams/sessions/${sessionId}`, { method: "DELETE" });
    const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setBusy(false);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("grdExDeleteError"));
      return;
    }
    router.push("/exams/sessions");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button size="sm" variant={admissionOpen ? "secondary" : "primary"} onClick={toggleAdmission} disabled={busy}>
        {admissionOpen ? t("grdExCloseAdmission") : t("grdExOpenAdmission")}
      </Button>
      <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
        {t("grdExDelete")}
      </Button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
