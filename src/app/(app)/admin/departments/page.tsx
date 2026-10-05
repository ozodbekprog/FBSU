import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { DepartmentsManager } from "@/components/admin/DepartmentsManager";

export default async function AdminDepartmentsPage() {
  await requireRole(["ADMIN"]);

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
        eyebrow="Tuzilma"
        title="Kafedralar"
        subtitle={`${rows.length} ta kafedra — fanlar va o'qituvchilar birlashmasi`}
      />
      <DepartmentsManager departments={rows} faculties={faculties} />
    </>
  );
}
