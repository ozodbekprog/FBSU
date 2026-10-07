import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import DiplomaBoard, {
  type DiplomaItem,
  type DiplomaStudent,
} from "@/components/diplomas/diploma-board";

const VIEW_ROLES: Role[] = ["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"];
const MANAGE_ROLES: Role[] = ["ADMIN", "REGISTRAR"];

export default async function DiplomasPage() {
  const user = await requireUser();
  if (!VIEW_ROLES.includes(user.role)) redirect("/dashboard");

  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const canManage = MANAGE_ROLES.includes(user.role);

  const [diplomas, students] = await Promise.all([
    prisma.diploma.findMany({
      orderBy: { issuedAt: "desc" },
      include: {
        student: { select: { id: true, name: true, group: { select: { name: true } } } },
      },
    }),
    canManage
      ? prisma.user.findMany({
          where: { role: "STUDENT" },
          orderBy: { name: "asc" },
          take: 300,
          select: { id: true, name: true, group: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const items: DiplomaItem[] = diplomas.map((diploma) => ({
    id: diploma.id,
    number: diploma.number,
    program: diploma.program,
    degree: diploma.degree,
    gpa: diploma.gpa,
    issuedAt: diploma.issuedAt.toISOString(),
    verifyCode: diploma.verifyCode,
    student: {
      id: diploma.student.id,
      name: diploma.student.name,
      group: diploma.student.group?.name ?? null,
    },
  }));

  const studentOptions: DiplomaStudent[] = students.map((student) => ({
    id: student.id,
    name: student.name,
    group: student.group?.name ?? null,
  }));

  return (
    <>
      <PageHeader title={dictionary.dipTitle} subtitle={dictionary.dipSubtitle} />
      <DiplomaBoard diplomas={items} students={studentOptions} canManage={canManage} />
    </>
  );
}
