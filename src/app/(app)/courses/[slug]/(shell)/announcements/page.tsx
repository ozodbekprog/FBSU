import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { Avatar, Card, CardBody, EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import { canManageCourse } from "@/components/courses/course-access";
import { AnnouncementsCreate } from "@/components/forum/announcements-create";
import { AnnouncementsActions } from "@/components/forum/announcements-actions";

export default async function CourseAnnouncementsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { slug } = await params;

  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course) notFound();

  const management = canManageCourse(user, course);
  if (user.role === "STUDENT") {
    const enrolled = await prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId: user.id }, status: "ACTIVE" },
    });
    if (!enrolled) notFound();
  } else if (!management) {
    notFound();
  }

  const announcements = await prisma.announcement.findMany({
    where: { courseId: course.id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });

  return (
    <>
      {management ? <AnnouncementsCreate courseId={course.id} /> : null}

      {announcements.length === 0 ? (
        <EmptyState
          title={dictionary.crsNoAnnouncements}
          description={dictionary.crsNoAnnouncementsDesc}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const canModify = management || announcement.author.id === user.id;
            return (
              <Card
                key={announcement.id}
                className="transition-all duration-200 hover:shadow-lift"
              >
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar name={announcement.author.name} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p className="text-sm font-semibold text-slate-900">
                            {announcement.author.name}
                          </p>
                          <span className="text-xs text-slate-500">·</span>
                          <p className="text-xs text-slate-500">
                            {fmtDateTime(announcement.createdAt)}
                          </p>
                        </div>
                        <h3 className="mt-1 font-semibold tracking-tight text-slate-900">
                          {announcement.title}
                        </h3>
                      </div>
                    </div>
                    {canModify ? (
                      <AnnouncementsActions
                        announcement={{
                          id: announcement.id,
                          title: announcement.title,
                          body: announcement.body,
                        }}
                      />
                    ) : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {announcement.body}
                  </p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
