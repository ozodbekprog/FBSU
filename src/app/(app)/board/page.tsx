import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { BoardLoader } from "@/components/board/board-loader";

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
      {assignment ? (
        <Card className="mb-4">
          <CardBody className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {dictionary.brdAssignment}
            </p>
            <p className="text-sm font-semibold text-slate-800">{assignment.title}</p>
            {assignment.description ? (
              <p className="text-sm whitespace-pre-wrap text-slate-600">{assignment.description}</p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
      <BoardLoader assignmentId={assignment?.id ?? null} />
    </>
  );
}
