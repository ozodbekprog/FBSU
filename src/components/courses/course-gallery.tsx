"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui";
import { CourseCard, type CourseCardData } from "@/components/courses/course-card";
import { useI18n } from "@/components/i18n/LocaleProvider";

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function CourseGallery({ items, staff }: { items: CourseCardData[]; staff: boolean }) {
  const { t } = useI18n();
  const [term, setTerm] = useState("");

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (course) =>
        course.title.toLowerCase().includes(needle) ||
        course.teacherName.toLowerCase().includes(needle) ||
        (course.description ?? "").toLowerCase().includes(needle),
    );
  }, [items, term]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
            <SearchIcon />
          </span>
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t("crsSearchPlaceholder")}
            aria-label={t("crsSearchCoursesLabel")}
            className="h-11 rounded-2xl pl-10 pr-11"
          />
          {term ? (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label={t("crsClear")}
              className="absolute inset-y-0 right-2 my-auto inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors duration-150 hover:bg-slate-200 hover:text-slate-700"
            >
              <CloseIcon />
            </button>
          ) : null}
        </div>
        <span className="inline-flex items-center rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-inset ring-slate-200/70">
          {t("crsCoursesCount", { count: visible.length })}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
          <span className="mb-1 inline-flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <SearchIcon />
          </span>
          <p className="font-medium text-slate-800">{t("crsFilterNoResults")}</p>
          <p className="max-w-md text-sm text-slate-500">{t("crsFilterNoResultsDesc")}</p>
          <button
            type="button"
            onClick={() => setTerm("")}
            className="mt-2 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-[background-color,border-color] duration-150 hover:border-slate-400 hover:bg-slate-50"
          >
            {t("crsResetFilters")}
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((course) => (
            <CourseCard key={course.id} course={course} staff={staff} />
          ))}
        </div>
      )}
    </>
  );
}
