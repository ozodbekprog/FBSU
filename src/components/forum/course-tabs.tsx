"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";

export type CourseTabKey =
  | "materials"
  | "assignments"
  | "attendance"
  | "announcements"
  | "forum"
  | "students";

export function CourseTabs({
  slug,
  canManage,
  canGrade,
  isEnrolled,
}: {
  slug: string;
  canManage: boolean;
  canGrade: boolean;
  isEnrolled: boolean;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const base = `/courses/${slug}`;
  const rest = pathname.startsWith(base)
    ? pathname.slice(base.length).split("/").filter(Boolean)
    : [];

  const tabs: Array<{ id: CourseTabKey; href: string; label: string }> = [
    { id: "materials", href: base, label: t("msgTabMaterials") },
  ];
  if (canGrade || isEnrolled) {
    tabs.push(
      { id: "assignments", href: `${base}/assignments`, label: t("msgTabAssignments") },
      { id: "attendance", href: `${base}/attendance`, label: t("msgTabAttendance") },
    );
  }
  tabs.push(
    { id: "announcements", href: `${base}/announcements`, label: t("msgTabAnnouncements") },
    { id: "forum", href: `${base}/forum`, label: t("msgTabForum") },
  );
  if (canManage || canGrade) {
    tabs.push({ id: "students", href: `${base}/students`, label: t("msgTabStudents") });
  }

  function isActive(id: CourseTabKey) {
    if (id === "materials") return rest.length === 0;
    return rest[0] === id;
  }

  return (
    <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-1.5 shadow-card">
      <nav className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-150",
              isActive(tab.id)
                ? "bg-brand-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-brand-800",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
