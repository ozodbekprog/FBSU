import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export default async function AdminAnnouncementsPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const announcements = await prisma.announcement.findMany({
    where: { courseId: null },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  const items = announcements.map((announcement) => ({
    id: announcement.id,
    courseId: announcement.courseId,
    authorId: announcement.authorId,
    title: announcement.title,
    body: announcement.body,
    audience: (announcement.audience ?? null) as unknown,
    createdAt: announcement.createdAt.toISOString(),
    author: announcement.author
      ? {
          id: announcement.author.id,
          name: announcement.author.name,
          email: announcement.author.email,
        }
      : null,
  }));

  return (
    <>
      <PageHeader
        eyebrow={dictionary.admEyebrowAdmin}
        title={dictionary.admAnnouncementsTitle}
        subtitle={translate(locale, "admAnnouncementsSubtitle", {
          count: items.length,
        })}
      />
      <div className="mt-6">
        <AnnouncementsManager announcements={items} />
      </div>
    </>
  );
}
