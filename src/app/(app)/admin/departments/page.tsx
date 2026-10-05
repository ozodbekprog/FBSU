import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { DepartmentsManager } from "@/components/admin/DepartmentsManager";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export default async function AdminDepartmentsPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const [departments, faculties] = await Promise.all([
    prisma.department.findMany({
      include: {
        faculty: { select: { id: true, name: true } },
        _count: { select: { users: true, subjects: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.faculty.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const rows = departments.map((department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    facultyId: department.facultyId,
    facultyName: department.faculty?.name ?? null,
    usersCount: department._count.users,
    subjectsCount: department._count.subjects,
  }));

  return (
    <>
      <PageHeader
        eyebrow={dictionary.admEyebrowStructure}
        title={dictionary.admDepartments}
        subtitle={translate(locale, "admDepartmentsSubtitle", { count: rows.length })}
      />
      <DepartmentsManager departments={rows} faculties={faculties} />
    </>
  );
}
