import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { BonusAwardForm } from "@/components/gpa/bonus-award-form";
import { BonusLedger } from "@/components/gpa/bonus-ledger";
import { fmtDateTime } from "@/lib/utils";
import { getDictionary, getLocale } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getLocale());
  return { title: dictionary.grdBonusPoints };
}

export default async function BonusPointsPage() {
  const user = await requireUser();
  const dictionary = getDictionary(await getLocale());

  if (user.role === "STUDENT") {
    return (
      <>
        <PageHeader title={dictionary.grdBonusPoints} eyebrow={dictionary.grdAcademicResult} />
        <EmptyState
          title={dictionary.grdTeacherPanel}
          description={dictionary.grdStudentAccountDesc}
        />
      </>
    );
  }

  const isTeacher = user.role === "TEACHER";

  const courses = await prisma.course.findMany({
    where:
      isTeacher
        ? { OR: [{ teacherId: user.id }, { teacherIds: { has: user.id } }] }
        : {},
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const courseIds = courses.map((course) => course.id);

  const students =
    courseIds.length > 0
      ? await prisma.user.findMany({
          where: {
            role: "STUDENT",
            isActive: true,
            ...(isTeacher
              ? { enrollments: { some: { courseId: { in: courseIds }, status: "ACTIVE" } } }
              : {}),
          },
          select: { id: true, name: true, group: { select: { name: true } } },
          orderBy: { name: "asc" },
          take: 400,
        })
      : [];

  const ledger = await prisma.bonusPoint.findMany({
    where: isTeacher ? { awardedById: user.id } : {},
    select: {
      id: true,
      tenths: true,
      reason: true,
      createdAt: true,
      student: { select: { id: true, name: true, group: { select: { name: true } } } },
      course: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title={dictionary.grdBonusPoints}
        subtitle={isTeacher ? dictionary.grdGiveBonus : dictionary.grdGivenBonusPoints}
        eyebrow={dictionary.grdAcademicResult}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
        {isTeacher ? (
          <BonusAwardForm
            courses={courses}
            students={students.map((student) => ({
              id: student.id,
              name: student.name,
              groupName: student.group?.name ?? null,
            }))}
          />
        ) : (
          <Card>
            <CardHeader title={dictionary.grdView} subtitle={dictionary.grdGiveBonus} />
            <CardBody>
              <p className="text-sm text-slate-600">
                {dictionary.grdNoBonusPointsDesc}
              </p>
            </CardBody>
          </Card>
        )}

        <BonusLedger
          rows={ledger.map((row) => ({
            id: row.id,
            studentName: row.student.name,
            groupName: row.student.group?.name ?? null,
            courseTitle: row.course.title,
            points: row.tenths / 10,
            reason: row.reason,
            createdAt: fmtDateTime(row.createdAt),
          }))}
        />
      </div>
    </>
  );
}