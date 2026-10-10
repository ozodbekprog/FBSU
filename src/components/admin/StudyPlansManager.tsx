"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Select } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch } from "@/lib/api";

export type StudyPlanItem = {
  id: string;
  createdAt: string;
  group: { id: string; name: string; _count: { users: number } };
  course: {
    id: string;
    title: string;
    slug: string;
    teacher: { id: string; name: string };
    _count: { enrollments: number };
  };
  term: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
};

export type StudyPlanGroup = { id: string; name: string; studentCount: number };
export type StudyPlanCourse = { id: string; title: string; teacherName: string };
export type StudyPlanTerm = { id: string; name: string; isActive: boolean };

export default function StudyPlansManager({
  plans,
  groups,
  courses,
  terms,
}: {
  plans: StudyPlanItem[];
  groups: StudyPlanGroup[];
  courses: StudyPlanCourse[];
  terms: StudyPlanTerm[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [groupId, setGroupId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [termId, setTermId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function create() {
    if (!groupId || !courseId || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch("/api/admin/study-plans", {
        method: "POST",
        body: JSON.stringify({ groupId, courseId, termId: termId || null }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string; data?: { enrolledCount: number } }
        | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("admErrorGeneric"));
        return;
      }
      setNotice(t("admStudyPlansEnrolled", { count: json.data?.enrolledCount ?? 0 }));
      setGroupId("");
      setCourseId("");
      setTermId("");
      router.refresh();
    } catch {
      setError(t("admNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("admStudyPlansDeleteConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/admin/study-plans", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      const json = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("admErrorGeneric"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("admNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t("admStudyPlansTitle")} subtitle={t("admStudyPlansSubtitle")} />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <Select value={groupId} onChange={(event) => setGroupId(event.target.value)} aria-label={t("admGroups")}>
              <option value="">{t("admStudyPlansSelectGroup")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} · {group.studentCount}
                </option>
              ))}
            </Select>
            <Select value={courseId} onChange={(event) => setCourseId(event.target.value)} aria-label={t("admCourses")}>
              <option value="">{t("admStudyPlansSelectCourse")}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} · {course.teacherName}
                </option>
              ))}
            </Select>
            <Select value={termId} onChange={(event) => setTermId(event.target.value)} aria-label={t("admStudyPlansTerm")}>
              <option value="">{t("admStudyPlansNoTerm")}</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </Select>
            <Button type="button" onClick={create} disabled={busy || !groupId || !courseId}>
              {t("admStudyPlansCreate")}
            </Button>
          </div>
          {error ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {plans.length === 0 ? (
            <EmptyState title={t("admStudyPlansEmpty")} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <li key={plan.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {plan.group.name} → {plan.course.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <Badge>{plan.course.teacher.name}</Badge>
                      {plan.term ? <Badge>{plan.term.name}</Badge> : null}
                      <span>
                        {t("admStudents")}: {plan.course._count.enrollments}
                      </span>
                    </span>
                  </span>
                  <Button type="button" size="sm" variant="danger" onClick={() => remove(plan.id)} disabled={busy}>
                    {t("admDelete")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
