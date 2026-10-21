"use client";

import Link from "next/link";
import { Avatar, Badge, Card } from "@/components/ui";
import { initials } from "@/lib/utils";
import { courseCoverStyle } from "@/components/courses/cover-tone";
import { useI18n } from "@/components/i18n/LocaleProvider";

export type CourseCardData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverColor: string;
  isPublished: boolean;
  teacherName: string;
  materialsCount: number;
  studentsCount: number;
};

function BookIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-600"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-600"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function ArrowIcon() {
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
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function CourseCard({ course, staff = false }: { course: CourseCardData; staff?: boolean }) {
  const { t } = useI18n();
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group block h-full rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
    >
      <Card className="relative flex h-full flex-col overflow-hidden transition-[transform,translate,box-shadow,border-color] duration-300 group-hover:-translate-y-1.5 group-hover:border-brand-200 group-hover:shadow-lift">
        <div
          className="relative h-24 shrink-0 overflow-hidden"
          style={courseCoverStyle(course.coverColor)}
        >
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_-10%,rgba(255,255,255,0.28),transparent_55%)]" />
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.95) 1px, transparent 1.4px)",
              backgroundSize: "16px 16px",
            }}
          />
          <span className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-white/10 blur-2xl transition-transform duration-300 hover-hover:group-hover:scale-125" />
          <span className="pointer-events-none absolute -bottom-16 left-1/3 size-36 rounded-full bg-gold-400/10 blur-2xl" />
          <span className="pointer-events-none absolute -bottom-8 -right-1 select-none text-[96px] font-black leading-none tracking-tighter text-white/10 transition-transform duration-300 hover-hover:group-hover:-translate-y-1.5 hover-hover:group-hover:scale-105">
            {initials(course.title)}
          </span>
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gold-400/70" />
          <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-400 ease-out hover-hover:group-hover:translate-x-[420%]" />
          <div className="absolute inset-x-0 top-3.5 flex items-center justify-between gap-2 px-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 ring-1 ring-inset ring-white/20 backdrop-blur">
              {t("crsBadgeCourse")}
            </span>
            {staff && !course.isPublished ? (
              <Badge tone="gold" className="shadow-sm ring-1 ring-inset ring-white/25">
                {t("crsDraft")}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start gap-3">
            <Avatar
              name={course.teacherName}
              className="relative z-10 -mt-11 size-11! shrink-0 text-xs shadow-md ring-4 ring-white"
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <h3
                title={course.title}
                className="truncate text-base font-semibold tracking-tight text-slate-900 transition-colors duration-150 group-hover:text-brand-800"
              >
                {course.title}
              </h3>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                {course.teacherName}
              </p>
            </div>
          </div>
          {course.description ? (
            <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-relaxed text-slate-500">
              {course.description}
            </p>
          ) : (
            <p className="mt-3 min-h-10 text-sm leading-relaxed text-slate-400">
              {t("crsNoDescription")}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200/70">
              <BookIcon />
              {t("crsMaterialsCount", { count: course.materialsCount })}
            </span>
            {staff ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200/70">
                <UsersIcon />
                {t("crsStudentsCount", { count: course.studentsCount })}
              </span>
            ) : (
              <Badge tone="green" className="gap-1">
                <CheckIcon />
                {t("crsEnrolledBadge")}
              </Badge>
            )}
            <span className="ml-auto inline-flex size-7 items-center justify-center rounded-full bg-brand-50 text-brand-700 opacity-0 transition-[transform,translate,opacity] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
              <ArrowIcon />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
