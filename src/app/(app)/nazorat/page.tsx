import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { EXAM_TONE, examStatusLabel } from "@/components/secure-exam/display";
import { formatExamCode } from "@/modules/secure-exam/code";
import { getDictionary, getLocale } from "@/i18n";

export default async function NazoratPage() {
  await requireRole(["ADMIN", "NAZORATCHI"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const exams = await prisma.secureExam.findMany({
    where: { status: { in: ["SCHEDULED", "ACTIVE"] } },
    orderBy: [{ startsAt: "desc" }],
    take: 30,
    include: {
      quiz: { select: { title: true } },
      course: { select: { title: true, teacher: { select: { name: true } } } },
      _count: { select: { runs: true } },
    },
  });

  return (
    <>
      <PageHeader title={dictionary.secNazoratTitle} subtitle={dictionary.secNazoratSubtitle} />
      {exams.length === 0 ? (
        <EmptyState title={dictionary.secNazoratNoExams} />
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              className="group relative overflow-hidden p-5 transition-[border-color,box-shadow] duration-200 hover:border-brand-200 hover:shadow-lift"
            >
              <Link
                href={`/nazorat/${exam.id}`}
                aria-label={exam.title}
                className="absolute inset-0 rounded-2xl"
              />
              <div className="relative flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold tracking-tight text-slate-900">
                    {exam.title}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {exam.quiz.title} · {exam.course.title} · {exam.course.teacher.name}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Badge tone={EXAM_TONE[exam.status]}>
                      {examStatusLabel(exam.status, dictionary)}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {fmtDateTime(exam.startsAt)} — {fmtDateTime(exam.endsAt)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {dictionary.secParticipants.replace("{count}", String(exam._count.runs))}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-semibold tracking-[0.2em] text-brand-950">
                    {formatExamCode(exam.code)}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 group-hover:underline">
                    {dictionary.secNazoratOpen}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
