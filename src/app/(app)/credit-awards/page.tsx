import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AwardHero, AwardHeroBadge } from "@/components/gpa/award-hero";
import { CreditAwardForm } from "@/components/gpa/credit-award-form";
import { CreditLedger } from "@/components/gpa/credit-ledger";
import { fmtDateTime } from "@/lib/utils";
import { getDictionary, getLocale } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getLocale());
  return { title: dictionary.grdGiveCredit };
}

export default async function CreditAwardsPage() {
  const user = await requireRole(["REKTOR", "PRO_RECTOR"]);
  const dictionary = getDictionary(await getLocale());

  const [students, ledger] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true },
      select: { id: true, name: true, group: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 1000,
    }),
    prisma.creditAward.findMany({
      select: {
        id: true,
        credits: true,
        reason: true,
        createdAt: true,
        student: { select: { id: true, name: true, group: { select: { name: true } } } },
        awardedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const totalCredits = ledger.reduce((sum, row) => sum + row.credits, 0);
  const uniqueStudents = new Set(ledger.map((row) => row.student.id)).size;

  return (
    <>
      <AwardHero
        eyebrow={dictionary.grdAcademicResult}
        title={dictionary.grdGiveCredit}
        subtitle={dictionary.grdCreditPageSubtitle}
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <AwardHeroBadge icon="shield" tone="gold">
              {dictionary.grdCreditHeroBadge}
            </AwardHeroBadge>
            <AwardHeroBadge icon="spark" tone="neutral">
              {dictionary.grdCreditUnlimited}
            </AwardHeroBadge>
          </div>
        }
        icon="credit"
        tone="gold"
        cardValue={`+${totalCredits.toFixed(2)}`}
        cardLabel={dictionary.grdStatTotalCredits}
        cardEyebrow={dictionary.grdCreditCardTitle}
        holder={user.name}
        stats={[
          {
            label: dictionary.grdStatTotalCredits,
            value: `+${totalCredits.toFixed(2)}`,
            accent: true,
          },
          { label: dictionary.grdStudents, value: uniqueStudents },
          { label: dictionary.grdStatRecords, value: ledger.length },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[25rem_minmax(0,1fr)]">
        <div className="min-w-0">
          <CreditAwardForm
            students={students.map((student) => ({
              id: student.id,
              name: student.name,
              groupName: student.group?.name ?? null,
            }))}
          />
        </div>

        <div className="min-w-0">
          <CreditLedger
            rows={ledger.map((row) => ({
              id: row.id,
              studentName: row.student.name,
              groupName: row.student.group?.name ?? null,
              credits: row.credits,
              reason: row.reason,
              awardedByName: row.awardedBy.name,
              createdAt: fmtDateTime(row.createdAt),
            }))}
          />
        </div>
      </div>
    </>
  );
}
