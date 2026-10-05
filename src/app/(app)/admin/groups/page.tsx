import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import GroupsManager from "@/components/admin/GroupsManager";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export default async function AdminGroupsPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const groups = await prisma.group.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });

  const data = groups.map((group) => ({
    id: group.id,
    name: group.name,
    year: group.year,
    userCount: group._count.users,
  }));

  const totalUsers = data.reduce((sum, group) => sum + group.userCount, 0);

  return (
    <>
      <PageHeader
        title={dictionary.admGroups}
        subtitle={translate(locale, "admGroupsSubtitle", { groups: data.length, members: totalUsers })}
      />
      <GroupsManager groups={data} />
    </>
  );
}
