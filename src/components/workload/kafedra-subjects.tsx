"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export type KafedraSubject = {
  id: string;
  name: string;
  code: string | null;
  color: string;
  teachers: { id: string; name: string }[];
};

export type KafedraTeacher = { id: string; name: string };

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_COLOR = "#3f5a9d";

export default function KafedraSubjects({
  subjects,
  teachers,
}: {
  subjects: KafedraSubject[];
  teachers: KafedraTeacher[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [active, setActive] = useState<KafedraSubject | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function openModal(subject: KafedraSubject) {
    setActive(subject);
    setSelected(subject.teachers.map((teacher) => teacher.id));
    setError(null);
    setNotice(null);
  }

  function closeModal() {
    setActive(null);
    setSelected([]);
  }

  function toggle(id: string) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  async function save() {
    if (!active || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/admin/subjects/${active.id}/teachers`, {
        method: "PUT",
        body: JSON.stringify({ teacherIds: selected }),
      });
      const json = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("admNetworkError"));
        return;
      }
      setNotice(t("admDictTeachersSaved", { name: active.name }));
      closeModal();
      router.refresh();
    } catch {
      setError(t("admNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title={t("kfdSubjectsTitle")}
        subtitle={t("kfdSubjectsSubtitle")}
      />
      <CardBody className="p-0">
        {notice ? (
          <p className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}
        {subjects.length === 0 ? (
          <EmptyState title={t("kfdSubjectsEmpty")} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {subjects.map((subject) => (
              <li key={subject.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: HEX_RE.test(subject.color) ? subject.color : FALLBACK_COLOR }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {subject.name}
                    {subject.code ? (
                      <span className="ml-2 text-xs font-medium text-slate-500">{subject.code}</span>
                    ) : null}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {subject.teachers.length === 0 ? (
                      <span className="text-xs text-slate-500">—</span>
                    ) : (
                      subject.teachers.map((teacher) => (
                        <Badge key={teacher.id}>{teacher.name}</Badge>
                      ))
                    )}
                  </span>
                </span>
                <Button type="button" size="sm" variant="secondary" onClick={() => openModal(subject)}>
                  {t("admDictTeachersButton")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("admDictAssignTeachers")}
        >
          <button
            type="button"
            aria-label={t("admClosePanel")}
            onClick={closeModal}
            className="animate-fade-in absolute inset-0 cursor-default bg-slate-900/45 backdrop-blur-sm"
          />
          <div className="animate-fade-up relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)]">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400" />
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{t("admDictAssignTeachers")}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{active.name}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label={t("admClose")}
                className="rounded-lg p-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto px-3 py-3">
              {teachers.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-slate-600">{t("admDictTeachersEmpty")}</p>
              ) : (
                teachers.map((teacher) => {
                  const checked = selected.includes(teacher.id);
                  return (
                    <label
                      key={teacher.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-150",
                        checked
                          ? "border-brand-200 bg-brand-50/70 shadow-[0_1px_2px_rgba(29,52,96,0.06)]"
                          : "border-transparent hover:bg-slate-50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(teacher.id)}
                        className="size-4 shrink-0 rounded border-slate-300 accent-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                        {teacher.name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            {error ? (
              <p className="mx-5 mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
              <Button type="button" variant="secondary" onClick={closeModal} disabled={busy}>
                {t("admCancel")}
              </Button>
              <Button type="button" onClick={save} disabled={busy}>
                {busy ? "…" : t("admSave")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
