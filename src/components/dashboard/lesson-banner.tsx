import Link from "next/link";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { prisma } from "@/lib/prisma";
import { currentLesson, lessonState, minutesUntilStart } from "@/modules/attendance/lesson-window";

export async function LessonBanner({ teacherId }: { teacherId: string }) {
  const entries = await prisma.scheduleEntry.findMany({
    where: { teacherId, approval: "APPROVED" },
    select: {
      id: true,
      dayOfWeek: true,
      slot: true,
      subject: true,
      room: true,
      subjectId: true,
      group: { select: { name: true } },
    },
  });
  const lesson = currentLesson(entries);
  if (!lesson) return null;

  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const bySubject = lesson.subjectId
    ? await prisma.course.findFirst({
        where: { subjectId: lesson.subjectId, teacherId },
        select: { slug: true },
      })
    : null;
  const course =
    bySubject ??
    (await prisma.course.findFirst({
      where: { teacherId, title: lesson.subject },
      select: { slug: true },
    }));
  const href = course ? `/courses/${course.slug}/attendance?start=1` : "/schedule";

  const state = lessonState(lesson);
  const title =
    state === "ongoing"
      ? translate(locale, "schLessonBannerOngoing", { subject: lesson.subject })
      : translate(locale, "schLessonBannerUpcoming", {
          subject: lesson.subject,
          minutes: minutesUntilStart(lesson),
        });
  const meta = [lesson.group?.name, lesson.room].filter(Boolean).join(" · ");

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-2xl border border-gold-300/50 bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 p-5 text-white shadow-lift">
      <span className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-gold-400/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-gold-400/30" />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M21 21v.01M17.5 21v.01M21 17.5v.01" />
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-300">
              {dictionary.schLessonBannerEyebrow}
            </p>
            <p className="mt-0.5 text-base font-semibold">{title}</p>
            <p className="mt-0.5 text-xs text-brand-100">
              {meta ? `${meta} · ` : ""}
              {dictionary.schLessonBannerText}
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-4 py-2.5 text-sm font-semibold text-brand-950 shadow-lg shadow-gold-400/25 transition-colors duration-150 hover:bg-gold-300"
        >
          {dictionary.schLessonBannerCta}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
