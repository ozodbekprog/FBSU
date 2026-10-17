"use client";

import Link from "next/link";
import { cn, initials } from "@/lib/utils";
import { Avatar, Badge, ButtonLink, Card, CardBody } from "@/components/ui";
import { EnrollButton } from "@/components/catalog/enroll-button";
import { useI18n } from "@/components/i18n/LocaleProvider";

export type CatalogCourse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverColor: string;
  teacherName: string;
  materialsCount: number;
  studentsCount: number;
  isEnrolled: boolean;
  enrollmentStatus?: "PENDING" | "ACTIVE" | "REJECTED" | null;
  isElective?: boolean;
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
      className="transition-transform duration-200 group-hover/action:translate-x-0.5"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
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

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.6l2.6 5.9 6.4.6-4.8 4.2 1.4 6.3L12 16.4l-5.6 3.2 1.4-6.3L3 9.1l6.4-.6z" />
    </svg>
  );
}

export function CatalogCourseCard({
  course,
  staff,
  variant = "catalog",
}: {
  course: CatalogCourse;
  staff: boolean;
  variant?: "catalog" | "elective";
}) {
  const { t } = useI18n();
  const isElective = variant === "elective" || course.isElective === true;

  return (
    <Card
      className={cn(
        "group flex h-full flex-col overflow-hidden transition-[border-color] duration-300",
        isElective ? "hover:border-gold-300/80" : "hover:border-brand-200/80",
      )}
    >
      <div
        className="relative isolate h-20 shrink-0 overflow-hidden"
        style={{ background: `linear-gradient(125deg, ${course.coverColor} 0%, #131f3c 94%)` }}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_-10%,rgba(255,255,255,0.28),transparent_55%)]" />
        <span
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.95) 1px, transparent 1.4px)",
            backgroundSize: "16px 16px",
          }}
        />
        <span className="pointer-events-none absolute -right-10 -top-16 size-36 rounded-full bg-white/10 blur-2xl transition-transform duration-300 hover-hover:group-hover:scale-125" />
        <span className="pointer-events-none absolute -bottom-16 left-1/3 size-32 rounded-full bg-gold-400/10 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-6 -right-1 select-none text-[80px] font-black leading-none tracking-tighter text-white/10 transition-transform duration-300 hover-hover:group-hover:-translate-y-1.5 hover-hover:group-hover:scale-105">
          {initials(course.title)}
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 h-px bg-gold-400/70" />
        <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-400 ease-out hover-hover:group-hover:translate-x-[420%]" />
        <span className="absolute left-4 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 ring-1 ring-inset ring-white/20 backdrop-blur">
          {t("crsBadgeCourse")}
        </span>
        {isElective ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 px-2.5 py-1 text-[11px] font-semibold text-brand-950 shadow-sm ring-1 ring-inset ring-white/40">
            <StarIcon />
            {t("crsElectiveBadge")}
          </span>
        ) : null}
      </div>

      <CardBody className="flex flex-1 flex-col">
        <div className="relative z-10 flex items-start gap-3">
          <Avatar
            name={course.teacherName}
            className="relative z-10 -mt-11 size-13 shrink-0 text-sm shadow-md ring-4 ring-white"
          />
          <div className="min-w-0 flex-1 pt-1">
            <h3
              title={course.title}
              className="truncate text-[15px] leading-snug font-semibold tracking-tight text-slate-900"
            >
              <Link
                href={`/courses/${course.slug}`}
                className="transition-colors duration-150 hover:text-brand-700"
              >
                {course.title}
              </Link>
            </h3>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
              {course.teacherName}
            </p>
          </div>
        </div>

        {course.description ? (
          <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-relaxed break-words text-slate-500">
            {course.description}
          </p>
        ) : (
          <p className="mt-3 min-h-10 text-sm leading-relaxed text-slate-500">{t("crsNoDescription")}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200/70">
            <BookIcon />
            {t("crsMaterialsCount", { count: course.materialsCount })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200/70">
            <UsersIcon />
            {t("crsStudentsCount", { count: course.studentsCount })}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          {staff ? (
            <ButtonLink
              href={`/courses/${course.slug}`}
              variant="secondary"
              size="sm"
              className="group/action w-full justify-center"
            >
              {t("crsManage")}
              <ArrowIcon />
            </ButtonLink>
          ) : course.isEnrolled ? (
            <>
              <Badge tone="green" className="shrink-0 gap-1">
                <CheckIcon />
                {t("crsEnrolledBadge")}
              </Badge>
              <ButtonLink
                href={`/courses/${course.slug}`}
                variant="secondary"
                size="sm"
                className="group/action min-w-32 flex-1 justify-center"
              >
                {t("crsGoToCourse")}
                <ArrowIcon />
              </ButtonLink>
            </>
          ) : course.enrollmentStatus === "PENDING" ? (
            <Badge tone="amber" className="w-full justify-center px-3 py-2">
              {t("crsPendingApproval")}
            </Badge>
          ) : (
            <EnrollButton courseId={course.id} />
          )}
        </div>
      </CardBody>
    </Card>
  );
}
