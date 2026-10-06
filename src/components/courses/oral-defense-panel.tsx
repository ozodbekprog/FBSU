"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, Input, Select } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch } from "@/lib/api";

type DefenseStatus = "REQUESTED" | "ACCEPTED" | "DECLINED" | "DONE" | "CANCELLED";

type DefenseRow = {
  id: string;
  status: DefenseStatus;
  note: string | null;
  result: "PASSED" | "FAILED" | null;
  resultNote: string | null;
  requestedById: string;
  student: { id: string; name: string; group: { name: string } | null };
};

type StudentOption = {
  id: string;
  name: string;
  group: { name: string } | null;
  isEnrolled: boolean;
};

export function OralDefensePanel({
  assignmentId,
  courseId,
}: {
  assignmentId: string;
  courseId: string;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<DefenseRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [pick, setPick] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [result, setResult] = useState<"PASSED" | "FAILED">("PASSED");
  const [resultNote, setResultNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    const response = await apiFetch(
      `/api/oral-defenses?assignmentId=${encodeURIComponent(assignmentId)}`,
    );
    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; data?: { defenses: DefenseRow[] } }
      | null;
    if (response.ok && json?.ok) setRows(json.data?.defenses ?? []);
  }, [assignmentId]);

  useEffect(() => {
    void loadRows();
    void (async () => {
      const response = await apiFetch(`/api/courses/${encodeURIComponent(courseId)}/enrollments`);
      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: StudentOption[] }
        | null;
      if (response.ok && json?.ok) {
        setStudents((json.data ?? []).filter((student) => student.isEnrolled));
      }
    })();
  }, [courseId, loadRows]);

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const response = await apiFetch(`/api/oral-defenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setBusy(false);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("commonError"));
      return;
    }
    setOpenId(null);
    setResultNote("");
    await loadRows();
  }

  async function summon() {
    if (!pick) return;
    setBusy(true);
    setError(null);
    const response = await apiFetch("/api/oral-defenses", {
      method: "POST",
      body: JSON.stringify({ assignmentId, studentId: pick }),
    });
    const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setBusy(false);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("commonError"));
      return;
    }
    setPick("");
    await loadRows();
  }

  const statusBadge = (row: DefenseRow) => {
    if (row.status === "REQUESTED") return <Badge tone="amber">{t("crsOralStatusRequested")}</Badge>;
    if (row.status === "ACCEPTED") return <Badge tone="blue">{t("crsOralStatusAccepted")}</Badge>;
    if (row.status === "DECLINED") return <Badge tone="rose">{t("crsOralStatusDeclined")}</Badge>;
    if (row.status === "CANCELLED") return <Badge tone="slate">{t("crsOralStatusCancelled")}</Badge>;
    return row.result === "PASSED" ? (
      <Badge tone="green">{t("crsOralStatusPassed")}</Badge>
    ) : (
      <Badge tone="rose">{t("crsOralStatusFailed")}</Badge>
    );
  };

  return (
    <Card>
      <CardHeader title={t("crsOralPanelTitle")} />
      <CardBody className="space-y-4">
        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">{t("crsOralPanelEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {row.student.name}
                      {row.student.group ? (
                        <span className="ml-2 text-xs text-slate-500">{row.student.group.name}</span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {row.requestedById === row.student.id
                        ? t("crsOralFromStudent")
                        : t("crsOralFromTeacher")}
                      {row.note ? ` · “${row.note}”` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(row)}
                    {row.status === "REQUESTED" ? (
                      <>
                        <Button size="sm" onClick={() => void act(row.id, { action: "accept" })} disabled={busy}>
                          {t("crsOralAccept")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => void act(row.id, { action: "decline" })}
                          disabled={busy}
                        >
                          {t("crsOralDecline")}
                        </Button>
                      </>
                    ) : null}
                    {row.status === "ACCEPTED" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setOpenId(openId === row.id ? null : row.id)}
                        disabled={busy}
                      >
                        {t("crsOralDone")}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {openId === row.id ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
                    <div className="w-40">
                      <Select
                        value={result}
                        onChange={(event) => setResult(event.target.value as "PASSED" | "FAILED")}
                      >
                        <option value="PASSED">{t("crsOralPassed")}</option>
                        <option value="FAILED">{t("crsOralFailed")}</option>
                      </Select>
                    </div>
                    <div className="min-w-48 flex-1">
                      <Input
                        value={resultNote}
                        onChange={(event) => setResultNote(event.target.value)}
                        placeholder={t("crsOralResultNote")}
                        maxLength={1000}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        void act(row.id, {
                          action: "done",
                          result,
                          resultNote: resultNote.trim() ? resultNote.trim() : null,
                        })
                      }
                      disabled={busy}
                    >
                      {t("crsOralSave")}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
          <div className="min-w-52 flex-1">
            <Select value={pick} onChange={(event) => setPick(event.target.value)}>
              <option value="">{t("crsOralSummonPlaceholder")}</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                  {student.group ? ` · ${student.group.name}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="secondary" onClick={() => void summon()} disabled={busy || !pick}>
            {t("crsOralSummon")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
