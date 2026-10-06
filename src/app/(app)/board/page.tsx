import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { PageHeader } from "@/components/ui";
import { BoardWorkspace } from "@/components/board/board-workspace";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string }>;
}) {
  await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { assignment: assignmentId } = await searchParams;

  const assignment = assignmentId
    ? await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { id: true, title: true, description: true },
      })
    : null;

  return (
    <>
      <PageHeader title={dictionary.brdTitle} subtitle={dictionary.brdSubtitle} />
      <BoardWorkspace
        assignmentId={assignment?.id ?? null}
        assignmentTitle={assignment?.title ?? null}
        assignmentDescription={assignment?.description ?? null}
      />
    </>
  );
}
