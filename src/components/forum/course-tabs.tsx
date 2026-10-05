import Link from "next/link";
import { cn } from "@/lib/utils";
import { getDictionary, getLocale } from "@/i18n";

export type CourseTabKey =
  | "materials"
  | "assignments"
  | "attendance"
  | "announcements"
  | "forum"
  | "students";

export async function CourseTabs({
  slug,
  active,
  canManage,
}: {
  slug: string;
  active: CourseTabKey;
  canManage: boolean;
}) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const tabs: Array<{ id: CourseTabKey; href: string; label: string }> = [
    { id: "materials", href: `/courses/${slug}`, label: dictionary.msgTabMaterials },
    { id: "assignments", href: `/courses/${slug}/assignments`, label: dictionary.msgTabAssignments },
    { id: "attendance", href: `/courses/${slug}/attendance`, label: dictionary.msgTabAttendance },
    {
      id: "announcements",
      href: `/courses/${slug}/announcements`,
      label: dictionary.msgTabAnnouncements,
    },
    { id: "forum", href: `/courses/${slug}/forum`, label: dictionary.msgTabForum },
    ...(canManage
      ? [
          {
            id: "students" as const,
            href: `/courses/${slug}?tab=students`,
            label: dictionary.msgTabStudents,
          },
        ]
      : []),
  ];

  return (
    <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-1.5 shadow-card">
      <nav className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150",
              tab.id === active
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
