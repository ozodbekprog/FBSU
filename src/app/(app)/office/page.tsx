import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { isOfficeMeta, type OfficeSummary } from "@/lib/office";
import { OfficeList } from "@/components/office/office-list";

export default async function OfficePage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const documents = await prisma.document.findMany({
    where: {
      kind: "OTHER",
      meta: { path: ["fbsuOffice"], equals: true },
      ...(user.role === "ADMIN" ? {} : { createdById: user.id }),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      meta: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
    },
  });

  const items: OfficeSummary[] = [];
  for (const document of documents) {
    if (!isOfficeMeta(document.meta)) continue;
    items.push({
      id: document.id,
      title: document.title,
      type: document.meta.officeType,
      updatedAt: document.updatedAt.toISOString(),
      author: document.createdBy.name,
    });
  }

  return (
    <>
      <PageHeader title={dictionary.ofsTitle} subtitle={dictionary.ofsSubtitle} />
      <OfficeList items={items} />
    </>
  );
}
