import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { AwardHero, AwardHeroBadge } from "@/components/gpa/award-hero";
import { BonusAwardForm } from "@/components/gpa/bonus-award-form";
import { BonusAllocator } from "@/components/gpa/bonus-allocator";
import { BonusGrantHistory } from "@/components/gpa/bonus-grant-history";
import { BonusLedger } from "@/components/gpa/bonus-ledger";
import {
  BONUS_MAX_TENTHS,
  BONUS_MIN_TENTHS,
  BONUS_RECTOR_MIN_TENTHS,
  getStudentBonusOverview,
} from "@/app/api/gpa/data";
import { fmtDateTime } from "@/lib/utils";
import { formatPoints } from "@/lib/points";
import { getDictionary, getLocale } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getLocale());
  return { title: dictionary.grdBonusPoints };
}

export default async function BonusPointsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  if (user.role === "STUDENT") {
    const overview = await getStudentBonusOverview(user.id);

    // Faqat rektor bergan (fanga bog'lanmagan) va butun ball ishlatish mumkin bo'lgan grantlar.
    const walletGrants = overview.grants
      .filter((grant) => grant.courseId === null && grant.remainingTenths >= 10)
      .map((grant) => ({
        id: grant.id,
        totalTenths: grant.totalTenths,
        remainingTenths: grant.remainingTenths,
        reason: grant.reason,
        awardedByName: grant.awardedByName,
        createdAt: fmtDateTime(grant.createdAt),
      }));

    // 100% ga yetgan yoki butun ball sig'maydigan fanlar chiqariladi.
    const targets = overview.targets
      .filter((target) => target.headroomTenths >= 10)
      .sort((a, b) => {
        if (a.percent == null && b.percent == null) return a.title.localeCompare(b.title);
        if (a.percent == null) return 1;
        if (b.percent == null) return -1;
        return a.percent - b.percent;
      })
      .map((target) => ({
        courseId: target.courseId,
        title: target.title,
        percent: target.percent,
        score: target.score,
        maxScore: target.maxScore,
        appliedTenths: target.appliedTenths,
        headroomTenths: target.headroomTenths,
      }));

    // Hamyon kartasi faqat butun ball ishlatish mumkin bo'lgan grantlar bo'lsa ko'rsatiladi.
    const hasWalletGrant = walletGrants.length > 0;

    const historyRows = overview.grants.map((grant) => ({
      id: grant.id,
      courseTitle: grant.courseTitle,
      totalTenths: grant.totalTenths,
      allocatedTenths: grant.allocatedTenths,
      remainingTenths: grant.remainingTenths,
      reason: grant.reason,
      awardedByName: grant.awardedByName,
      createdAt: fmtDateTime(grant.createdAt),
      allocations: grant.allocations.map((allocation) => ({
        id: allocation.id,
        courseTitle: allocation.courseTitle,
        points: allocation.points,
      })),
    }));

    return (
      <>
        <AwardHero
          eyebrow={dictionary.grdAcademicResult}
          title={dictionary.grdMyBonusPoints}
          subtitle={dictionary.grdBonusStudentSubtitle}
          badge={<AwardHeroBadge icon="user" tone="blue">{dictionary.grdStudent}</AwardHeroBadge>}
          tone="blue"
          cardValue={`+${formatPoints(overview.walletTenths / 10)}`}
          cardLabel={dictionary.grdWalletBalance}
          cardEyebrow={dictionary.grdBonusWallet}
          holder={user.name}
          stats={[
            {
              label: dictionary.grdWalletBalance,
              value: `+${formatPoints(overview.walletTenths / 10)}`,
              hint: dictionary.grdBonusWalletBadge,
              accent: true,
            },
            {
              label: dictionary.grdAppliedBonus,
              value: `+${formatPoints(overview.appliedTenths / 10)}`,
            },
            { label: dictionary.grdStatRecords, value: overview.grants.length },
          ]}
        />

        <div className="grid gap-6">
          {hasWalletGrant ? (
            <BonusAllocator
              grants={walletGrants}
              targets={targets}
              walletTenths={overview.walletTenths}
            />
          ) : null}
          <BonusGrantHistory rows={historyRows} />
        </div>
      </>
    );
  }

  const isTeacher = user.role === "TEACHER";
  const isRector = user.role === "REKTOR";
  const canAward = isTeacher || isRector;

  const courses = isTeacher
    ? await prisma.course.findMany({
        where: { teacherId: user.id },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      })
    : [];

  const courseIds = courses.map((course) => course.id);

  // Rektor istalgan talabaga ball beradi; o'qituvchi faqat o'z fanidagilarga.
  const students = isTeacher
    ? courseIds.length > 0
      ? await prisma.user.findMany({
          where: {
            role: "STUDENT",
            isActive: true,
            enrollments: { some: { courseId: { in: courseIds }, status: "ACTIVE" } },
          },
          select: { id: true, name: true, group: { select: { name: true } } },
          orderBy: { name: "asc" },
          take: 400,
        })
      : []
    : isRector
      ? await prisma.user.findMany({
          where: {
            role: "STUDENT",
            isActive: true,
            enrollments: { some: { status: "ACTIVE" } },
          },
          select: { id: true, name: true, group: { select: { name: true } } },
          orderBy: { name: "asc" },
          take: 1000,
        })
      : [];

  const ledger = await prisma.bonusPoint.findMany({
    where: { awardedById: user.id },
    select: {
      id: true,
      tenths: true,
      reason: true,
      createdAt: true,
      courseId: true,
      student: { select: { id: true, name: true, group: { select: { name: true } } } },
      course: { select: { id: true, title: true } },
      awardedBy: { select: { name: true } },
      allocations: {
        select: { id: true, tenths: true, course: { select: { title: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const totalTenths = ledger.reduce((sum, row) => sum + row.tenths, 0);
  const uniqueStudents = new Set(ledger.map((row) => row.student.id)).size;

  return (
    <>
      <AwardHero
        eyebrow={dictionary.grdAcademicResult}
        title={dictionary.grdBonusPoints}
        subtitle={
          isTeacher
            ? dictionary.grdBonusPageSubtitle
            : isRector
              ? dictionary.grdRectorBonusPageSubtitle
              : dictionary.grdGivenBonusPoints
        }
        badge={
          canAward ? (
            <div className="flex flex-wrap items-center gap-2">
              <AwardHeroBadge icon={isRector ? "spark" : "user"} tone="blue">
                {isRector ? dictionary.grdHeroRectorBadge : dictionary.grdTeacherPanel}
              </AwardHeroBadge>
              {isRector ? (
                <AwardHeroBadge icon="shield" tone="gold">
                  {dictionary.grdRectorUnlimited}
                </AwardHeroBadge>
              ) : null}
            </div>
          ) : undefined
        }
        tone="blue"
        cardValue={`+${formatPoints(totalTenths / 10)}`}
        cardLabel={dictionary.grdStatTotalPoints}
        cardEyebrow={isRector ? dictionary.grdRectorBonusTitle : dictionary.grdGiveBonus}
        holder={user.name}
        stats={[
          {
            label: dictionary.grdStatTotalPoints,
            value: `+${formatPoints(totalTenths / 10)}`,
            accent: true,
          },
          { label: dictionary.grdStudents, value: uniqueStudents },
          { label: dictionary.grdStatRecords, value: ledger.length },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[25rem_minmax(0,1fr)]">
        <div className="min-w-0">
          {canAward ? (
            <BonusAwardForm
              courses={courses}
              students={students.map((student) => ({
                id: student.id,
                name: student.name,
                groupName: student.group?.name ?? null,
              }))}
              minTenths={isRector ? BONUS_RECTOR_MIN_TENTHS : BONUS_MIN_TENTHS}
              maxTenths={isRector ? undefined : BONUS_MAX_TENTHS}
              rectorMode={isRector}
            />
          ) : (
            <Card className="overflow-hidden">
              <CardHeader title={dictionary.grdView} subtitle={dictionary.grdGiveBonus} />
              <CardBody>
                <p className="text-sm text-slate-500">{dictionary.grdNoBonusPointsDesc}</p>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="min-w-0">
          <BonusLedger
            rows={ledger.map((row) => {
              const allocatedTenths = row.allocations.reduce(
                (sum, allocation) => sum + allocation.tenths,
                0,
              );
              return {
                id: row.id,
                studentName: row.student.name,
                groupName: row.student.group?.name ?? null,
                courseTitle: row.course?.title ?? null,
                points: row.tenths / 10,
                remainingPoints:
                  row.courseId === null
                    ? Math.max(0, row.tenths - allocatedTenths) / 10
                    : 0,
                allocations: row.allocations.map((allocation) => ({
                  id: allocation.id,
                  courseTitle: allocation.course.title,
                  points: allocation.tenths / 10,
                })),
                reason: row.reason,
                awardedByName: row.awardedBy.name,
                createdAt: fmtDateTime(row.createdAt),
              };
            })}
            showAwardedBy={isRector}
            title={isRector ? dictionary.grdRectorBonusLedger : undefined}
          />
        </div>
      </div>
    </>
  );
}
