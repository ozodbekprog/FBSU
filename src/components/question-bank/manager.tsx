"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
  Label,
  Select,
  Skeleton,
} from "@/components/ui";
import { cn, fmtDate } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch } from "@/components/quiz/api";
import {
  QUESTION_TYPE_KEY,
  QUESTION_TYPE_TONE,
  type QuestionType,
} from "@/components/quiz/shared";
import { BankQuestionForm, type BankCourseOption, type BankSubjectOption } from "@/components/question-bank/form";
import {
  DIFFICULTY_LABEL_KEYS,
  DIFFICULTY_TONE,
  type BankQuestionItem,
} from "@/components/question-bank/shared";

export function QuestionBankManager({
  courses,
  subjects,
}: {
  courses: BankCourseOption[];
  subjects: BankSubjectOption[];
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<BankQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [type, setType] = useState<"" | QuestionType>("");
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankQuestionItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!formOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFormOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (courseId) params.set("courseId", courseId);
    if (subjectId) params.set("subjectId", subjectId);
    if (type) params.set("type", type);
    if (difficulty) params.set("difficulty", difficulty);
    if (query) params.set("q", query);
    const suffix = params.toString();
    const load = async () => {
      setLoading(true);
      const result = await apiFetch<BankQuestionItem[]>(
        `/api/question-bank${suffix ? `?${suffix}` : ""}`,
        "GET",
      );
      if (!active) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setItems(result.data);
    };
    void load();
    return () => {
      active = false;
    };
  }, [courseId, subjectId, type, difficulty, query, refreshKey]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
    setError(null);
  }

  function openEdit(item: BankQuestionItem) {
    setEditing(item);
    setFormOpen(true);
    setError(null);
  }

  function handleSaved(item: BankQuestionItem, created: boolean) {
    setFormOpen(false);
    setEditing(null);
    setNotice(created ? t("grdQbAdded") : t("grdQbUpdated"));
    setRefreshKey((key) => key + 1);
  }

  async function remove(item: BankQuestionItem) {
    if (!window.confirm(t("grdQbDeleteConfirm"))) return;
    const result = await apiFetch(`/api/question-bank/${item.id}`, "DELETE");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    setNotice(t("grdQbDeleted"));
  }

  const activeFilters = courseId !== "" || subjectId !== "" || type !== "" || difficulty !== "" || query !== "";

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
            <div>
              <Label>{t("grdQbSearch")}</Label>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("grdQbSearchPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("grdCourse")}</Label>
              <Select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                <option value="">{t("grdAll")}</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("grdSubject")}</Label>
              <Select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                <option value="">{t("grdAll")}</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("grdQbType")}</Label>
              <Select
                value={type}
                onChange={(event) => setType(event.target.value as "" | QuestionType)}
              >
                <option value="">{t("grdAll")}</option>
                {(Object.keys(QUESTION_TYPE_KEY) as QuestionType[]).map((value) => (
                  <option key={value} value={value}>
                    {t(QUESTION_TYPE_KEY[value])}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={openCreate} disabled={courses.length === 0 && subjects.length === 0}>
                {t("crsQuizNewQuestion")}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["", "1", "2", "3"].map((value) => {
              const active = difficulty === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDifficulty(value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150",
                    active
                      ? "bg-brand-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {value === "" ? t("grdQbAllDifficulty") : t(DIFFICULTY_LABEL_KEYS[Number(value)])}
                </button>
              );
            })}
            <span className="ml-auto text-xs text-slate-600">
              {loading ? t("commonLoading") : t("grdQbQuestionCount", { count: items.length })}
            </span>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {notice ? <p className="animate-fade-in text-sm text-emerald-600">{notice}</p> : null}
        </CardBody>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Card key={key} className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={t("grdQbNotFound")}
          description={
            activeFilters
              ? t("grdQbNotFoundFiltered")
              : t("grdQbNotFoundEmpty")
          }
          action={
            <Button onClick={openCreate} disabled={courses.length === 0 && subjects.length === 0}>
              {t("crsQuizNewQuestion")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="flex h-full flex-col p-5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={QUESTION_TYPE_TONE[item.type]}>{t(QUESTION_TYPE_KEY[item.type])}</Badge>
                <Badge tone={DIFFICULTY_TONE[item.difficulty] ?? "slate"}>
                  {DIFFICULTY_LABEL_KEYS[item.difficulty] ? t(DIFFICULTY_LABEL_KEYS[item.difficulty]) : "—"}
                </Badge>
                {item.courseTitle ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {item.courseTitle}
                  </span>
                ) : null}
                {item.subjectName ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    {item.subjectName}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-900">{item.text}</p>
              {item.type === "TEXT" || item.type === "ESSAY" ? (
                <p className="mt-3 text-xs text-slate-600">
                  {item.type === "ESSAY" ? t("crsQuizEssayManual") : t("crsQuizTextManual")}
                </p>
              ) : item.type === "CLOZE" ? (
                <ul className="mt-3 space-y-1.5">
                  {item.options.map((option, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 rounded-lg border border-fuchsia-200 bg-fuchsia-50/60 px-2.5 py-1.5 text-xs text-fuchsia-900"
                    >
                      <span className="inline-flex shrink-0 items-center justify-center rounded bg-fuchsia-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{option}</span>
                    </li>
                  ))}
                </ul>
              ) : item.type === "SHORT_ANSWER" || item.type === "NUMERIC" ? (
                <p className="mt-3 text-xs font-medium text-emerald-700">
                  {item.correct.map((value) => String(value)).join(", ")}
                </p>
              ) : item.type === "MATCHING" ? (
                <ul className="mt-3 space-y-1.5">
                  {item.options.map((left, index) => {
                    const paired = item.correct[index];
                    return (
                      <li
                        key={index}
                        className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/60 px-2.5 py-1.5 text-xs text-teal-900"
                      >
                        <span className="min-w-0 flex-1 truncate">{left}</span>
                        <span className="shrink-0 text-teal-500">→</span>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {typeof paired === "string" ? paired : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : item.type === "ORDERING" ? (
                <ol className="mt-3 space-y-1.5">
                  {item.options.map((value, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-2.5 py-1.5 text-xs text-indigo-900"
                    >
                      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded bg-indigo-500 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{value}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {item.options.map((option, index) => {
                    const isCorrect = item.correct.includes(index);
                    return (
                      <li
                        key={index}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50/80 font-medium text-emerald-900"
                            : "border-slate-200 bg-white text-slate-600",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex size-4 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                            isCorrect ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {isCorrect ? (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          ) : (
                            String.fromCharCode(65 + index)
                          )}
                        </span>
                        <span className="truncate">{option}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-600">{fmtDate(item.createdAt)}</span>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                    {t("grdQbEdit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-600! hover:bg-rose-50! hover:text-rose-600!"
                    onClick={() => void remove(item)}
                  >
                    {t("grdQbDelete")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {formOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("grdQbBankQuestionAria")}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-950/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-3xl py-4">
            <BankQuestionForm
              courses={courses}
              subjects={subjects}
              initial={editing}
              onSaved={handleSaved}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
