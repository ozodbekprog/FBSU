import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Table } from "@/components/ui";
import { BonusAwardForm } from "@/components/gpa/bonus-award-form";
import { BonusLedger } from "@/components/gpa/bonus-ledger";
import { fmtDateTime } from "@/lib/utils";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getLocale());
  return { title: dictionary.grdBonusPoints };
}

export default async function BonusPointsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  if (user.role === "STUDENT") {
    const bonuses = await prisma.bonusPoint.findMany({
      where: { studentId: user.id },
      select: {
        id: true,
        tenths: true,
        reason: true,
        createdAt: true,
        course: { select: { id: true, title: true, slug: true } },
        awardedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalTenths = bonuses.reduce((sum, bonus) => sum + bonus.tenths, 0);

    return (
      <>
        <PageHeader
          title={dictionary.grdMyBonusPoints}
          subtitle={dictionary.grdBonusStudentSubtitle}
          eyebrow={dictionary.grdAcademicResult}
        />

        {bonuses.length === 0 ? (
          <EmptyState
            title={dictionary.grdNoBonusPoints}
            description={dictionary.grdNoBonusPointsDesc}
          />
        ) : (
          <Card>
            <CardHeader
              title={dictionary.grdGivenBonusPoints}
              subtitle={translate(locale, "grdBonusStudentSummary", {
                count: bonuses.length,
                points: (totalTenths / 10).toFixed(1),
              })}
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 font-medium">{dictionary.grdSubject}</th>
                      <th className="px-3 py-2 font-medium">{dictionary.grdScore}</th>
                      <th className="px-3 py-2 font-medium">{dictionary.grdBonusEffect}</th>
                      <th className="px-3 py-2 font-medium">{dictionary.grdReason}</th>
                      <th className="px-3 py-2 font-medium">{dictionary.grdAwardedBy}</th>
                      <th className="px-4 py-2 font-medium">{dictionary.grdDate}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bonuses.map((bonus) => (
                      <tr key={bonus.id} className="text-sm text-slate-700">
                        <td className="px-4 py-3">
                          <Link
                            href={`/courses/${bonus.course.slug}`}
                            className="font-medium text-slate-900 transition-colors duration-150 hover:text-brand-700"
                          >
                            {bonus.course.title}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone="blue">+{(bonus.tenths / 10).toFixed(1)}</Badge>
                        </td>
                        <td className="px-3 py-3 font-medium text-gold-700 dark:text-gold-300">
                          {translate(locale, "grdBonusPercent", { percent: bonus.tenths })}
                        </td>
                        <td className="max-w-xs px-3 py-3 text-slate-600">{bonus.reason}</td>
                        <td className="px-3 py-3 text-slate-600">{bonus.awardedBy.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {fmtDateTime(bonus.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        )}
      </>
    );
  }

  const isTeacher = user.role === "TEACHER";

  const courses = await prisma.course.findMany({
    where: isTeacher ? { teacherId: user.id } : {},
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
        subtitle={isTeacher ? dictionary.grdBonusPageSubtitle : dictionary.grdGivenBonusPoints}
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