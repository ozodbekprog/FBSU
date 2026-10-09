"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui";
import { CatalogCourseCard, type CatalogCourse } from "@/components/catalog/catalog-course-card";
import { ElectiveCourseCard } from "@/components/electives/elective-course-card";
import { useI18n } from "@/components/i18n/LocaleProvider";

type CourseFilter = "all" | "enrolled" | "open";

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

export function CourseBrowser({
  items,
  staff,
  variant,
  search,
  searchable = false,
  empty,
}: {
  items: CatalogCourse[];
  staff: boolean;
  variant: "catalog" | "elective";
  search?: ReactNode;
  searchable?: boolean;
  empty?: ReactNode;
}) {
  const { t } = useI18n();
  const filters: { key: CourseFilter; label: string }[] = [
    { key: "all", label: t("crsFilterAll") },
    { key: "enrolled", label: t("crsFilterEnrolled") },
    { key: "open", label: t("crsFilterOpen") },
  ];
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [term, setTerm] = useState("");

  const counts = useMemo(
    () => ({
      all: items.length,
      enrolled: items.filter((course) => course.isEnrolled).length,
      open: items.filter((course) => !course.isEnrolled).length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return items.filter((course) => {
      if (filter === "enrolled" && !course.isEnrolled) return false;
      if (filter === "open" && course.isEnrolled) return false;
      if (!needle) return true;
      return (
        course.title.toLowerCase().includes(needle) ||
        course.teacherName.toLowerCase().includes(needle)
      );
    });
  }, [items, filter, term]);

  function reset() {
    setFilter("all");
    setTerm("");
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {search ? (
          <div className="min-w-72 flex-1">{search}</div>
        ) : searchable ? (
          <div className="relative min-w-64 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-500">
              <SearchIcon />
            </span>
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t("crsSearchPlaceholder")}
              aria-label={t("crsSearchElectivesLabel")}
              className="h-11 rounded-2xl pl-10 pr-4"
            />
          </div>
        ) : null}
        <span className="inline-flex items-center rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-inset ring-slate-200/70">
          {t("crsCoursesCount", { count: visible.length })}
        </span>
      </div>

      {!staff && items.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {filters.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-[background-color,color,box-shadow] duration-150",
                  active
                    ? "bg-brand-900 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] font-bold",
                    active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {counts[item.key]}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {items.length === 0 && empty ? (
        empty
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
          <span className="mb-1 inline-flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <SearchIcon />
          </span>
          <p className="font-medium text-slate-800">{t("crsFilterNoResults")}</p>
          <p className="max-w-md text-sm text-slate-500">
            {t("crsFilterNoResultsDesc")}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-[background-color,border-color] duration-150 hover:border-slate-400 hover:bg-slate-50"
          >
            {t("crsResetFilters")}
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((course) => (
            <div key={course.id} className="h-full">
              {variant === "elective" ? (
                <ElectiveCourseCard course={course} staff={staff} />
              ) : (
                <CatalogCourseCard course={course} staff={staff} />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
