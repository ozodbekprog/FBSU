import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import CohortsManager from "@/components/admin/cohorts-manager";

export default async function AdminCohortsPage() {
  await requireRole(["ADMIN", "REGISTRAR"]);

  const [cohorts, groups, courses] = await Promise.all([
    prisma.cohort.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    }),
    prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Kohortlar"
        subtitle="Global guruhlar: a'zolarni yig'ib, bir amalda kursga yozing"
      />
      <CohortsManager
        cohorts={cohorts.map((cohort) => ({
          id: cohort.id,
          name: cohort.name,
          description: cohort.description,
          memberCount: cohort._count.members,
        }))}
        groups={groups}
        courses={courses}
      />
    </>
  );
}
