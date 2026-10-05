import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { BonusAwardForm } from "@/components/gpa/bonus-award-form";
import { BonusLedger } from "@/components/gpa/bonus-ledger";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Bonus ballar" };

export default async function BonusPointsPage() {
  const user = await requireUser();

  // Talaba uchun bu sahifa emas — o'z ballari GPA bo'limida ko'rinadi.
  if (user.role === "STUDENT") {
    return (
      <>
        <PageHeader title="Bonus ballar" eyebrow="Akademik natija" />
        <EmptyState
          title="Bu sahifa o'qituvchilar uchun"
          description="Sizning bonus ballaringiz GPA sahifasida, har bir fan kesimida ko'rsatiladi."
        />
      </>
    );
  }

  const isTeacher = user.role === "TEACHER";

  // O'qituvchi faqat o'z fanlari, admin barchasi.
  const courses = await prisma.course.findMany({
    where: isTeacher ? { teacherId: user.id } : {},
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const courseIds = courses.map((course) => course.id);

  // Talabalar: o'qituvchi uchun — o'z fanlariga yozilganlar.
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
        title="Bonus ballar"
        subtitle={
          isTeacher
            ? "O'z faningizdan o'quvchiga qo'shimcha GPA ball berish"
            : "Barcha berilgan bonus balllar — faqat ko'rish"
        }
        eyebrow="Akademik natija"
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
            <CardHeader title="Ko'rish rejimi" subtitle="Faqat o'qituvchi ball bera oladi" />
            <CardBody>
              <p className="text-sm text-slate-600">
                Siz berilgan barcha bonus ballarni ko&apos;rib chiqishingiz mumkin.
                Yangi ball qo&apos;shish huquqi faqat o&apos;qituvchilarda bor.
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