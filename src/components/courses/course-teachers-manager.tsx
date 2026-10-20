"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Label,
  Select,
} from "@/components/ui";

type TeacherRole = "LEAD" | "CO_TEACHER" | "ASSISTANT" | "OBSERVER";
type AssignableRole = Exclude<TeacherRole, "LEAD">;

type Teacher = {
  id: string;
  userId: string;
  role: TeacherRole;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
};

type Candidate = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type TeachersResponse = {
  ok?: boolean;
  data?: { teachers?: Teacher[] };
  error?: string;
};

type CandidatesResponse = {
  ok?: boolean;
  data?: { users?: Candidate[] };
  error?: string;
};

export function CourseTeachersManager({ courseId }: { courseId: string }) {
  const { t } = useI18n();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AssignableRole>("CO_TEACHER");
  const [candidates, setCandidates] = useState<{ term: string; users: Candidate[] }>({
    term: "",
    users: [],
  });
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await apiFetch(`/api/courses/${courseId}/teachers`);
    const json = (await response.json().catch(() => null)) as TeachersResponse | null;
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("crsActionError"));
      return;
    }
    setTeachers(json.data?.teachers ?? []);
    setError(null);
  }, [courseId, t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await apiFetch(`/api/courses/${courseId}/teachers`);
      const json = (await response.json().catch(() => null)) as TeachersResponse | null;
      if (cancelled) return;
      if (!response.ok || !json?.ok) {
        setError(json?.error ?? t("crsActionError"));
      } else {
        setTeachers(json.data?.teachers ?? []);
        setError(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, t]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await apiFetch(
          `/api/courses/${courseId}/teachers/candidates?q=${encodeURIComponent(term)}`,
        );
        const json = (await response.json().catch(() => null)) as CandidatesResponse | null;
        if (!cancelled) {
          setCandidates({
            term,
            users: response.ok && json?.ok ? (json.data?.users ?? []) : [],
          });
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [courseId, query]);

  async function add(userId: string) {
    setBusy(userId);
    setError(null);
    setNotice(null);
    const response = await apiFetch(`/api/courses/${courseId}/teachers`, {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    });
    const json = (await response.json().catch(() => null)) as TeachersResponse | null;
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("crsActionError"));
      setBusy(null);
      return;
    }
    setQuery("");
    setCandidates({ term: "", users: [] });
    await load();
    setNotice(t("crsTeacherSaved"));
    setBusy(null);
  }

  async function updateRole(userId: string, nextRole: AssignableRole) {
    setBusy(userId);
    setError(null);
    setNotice(null);
    const response = await apiFetch(`/api/courses/${courseId}/teachers`, {
      method: "PATCH",
      body: JSON.stringify({ userId, role: nextRole }),
    });
    const json = (await response.json().catch(() => null)) as TeachersResponse | null;
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("crsActionError"));
      setBusy(null);
      return;
    }
    await load();
    setNotice(t("crsTeacherSaved"));
    setBusy(null);
  }

  async function remove(teacher: Teacher) {
    if (!window.confirm(t("crsTeacherRemoveConfirm", { name: teacher.user.name }))) return;

    setBusy(teacher.userId);
    setError(null);
    setNotice(null);
    const response = await apiFetch(`/api/courses/${courseId}/teachers`, {
      method: "DELETE",
      body: JSON.stringify({ userId: teacher.userId }),
    });
    const json = (await response.json().catch(() => null)) as TeachersResponse | null;
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("crsActionError"));
      setBusy(null);
      return;
    }
    await load();
    setNotice(t("crsTeacherSaved"));
    setBusy(null);
  }

  const searchTerm = query.trim();
  const visibleCandidates = candidates.term === searchTerm ? candidates.users : [];

  return (
    <Card className="mt-6 max-w-3xl overflow-hidden">
      <CardHeader title={t("crsTeachersTitle")} subtitle={t("crsTeachersSubtitle")} />
      <CardBody className="space-y-5">
        {loading ? (
          <p className="text-sm text-slate-500">{t("crsLoading")}</p>
        ) : teachers.length === 0 ? (
          <p className="text-sm text-slate-500">{t("crsTeacherEmpty")}</p>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {teachers.map((teacher) => {
              const lead = teacher.role === "LEAD";
              return (
                <div key={teacher.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar
                    name={teacher.user.name}
                    src={teacher.user.avatarUrl}
                    className="size-9"
                  />
                  <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {teacher.user.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">{teacher.user.email}</p>
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                    {lead ? (
                      <Badge tone="gold">{t("crsTeacherLead")}</Badge>
                    ) : (
                      <Select
                        value={teacher.role}
                        onChange={(event) =>
                          void updateRole(teacher.userId, event.target.value as AssignableRole)
                        }
                        disabled={busy === teacher.userId}
                        aria-label={t("crsTeacherRole")}
                        className="min-w-0 flex-1 sm:w-auto! sm:flex-none"
                      >
                        <option value="CO_TEACHER">{t("crsTeacherCo")}</option>
                        <option value="ASSISTANT">{t("crsTeacherAssistant")}</option>
                        <option value="OBSERVER">{t("crsTeacherObserver")}</option>
                      </Select>
                    )}
                    {lead ? (
                      <span className="hidden text-xs text-slate-400 sm:inline">
                        {t("crsTeacherLeadLocked")}
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void remove(teacher)}
                        disabled={busy === teacher.userId}
                        className="text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                      >
                        {t("crsDelete")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Label htmlFor="course-teacher-search">{t("crsTeacherAdd")}</Label>
              <Input
                id="course-teacher-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("crsTeacherSearchPlaceholder")}
                autoComplete="off"
              />
            </div>
            <div className="sm:w-44">
              <Label htmlFor="course-teacher-role">{t("crsTeacherRole")}</Label>
              <Select
                id="course-teacher-role"
                value={role}
                onChange={(event) => setRole(event.target.value as AssignableRole)}
              >
                <option value="CO_TEACHER">{t("crsTeacherCo")}</option>
                <option value="ASSISTANT">{t("crsTeacherAssistant")}</option>
                <option value="OBSERVER">{t("crsTeacherObserver")}</option>
              </Select>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">{t("crsTeacherSearchHint")}</p>

          {searching ? (
            <p className="mt-3 text-sm text-slate-500">{t("crsLoading")}</p>
          ) : visibleCandidates.length > 0 ? (
            <div className="mt-3 space-y-2">
              {visibleCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => void add(candidate.id)}
                  disabled={busy === candidate.id}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-[border-color,background-color,opacity] duration-150 hover:border-brand-200 hover:bg-brand-50/40 disabled:opacity-60"
                >
                  <Avatar
                    name={candidate.name}
                    src={candidate.avatarUrl}
                    className="size-8 text-[10px]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {candidate.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {candidate.email}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-brand-700">
                    {busy === candidate.id ? t("crsSaving") : t("crsAdd")}
                  </span>
                </button>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <p className="mt-3 text-sm text-slate-500">{t("crsTeacherNoResults")}</p>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>
        ) : null}
        {notice ? (
          <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
