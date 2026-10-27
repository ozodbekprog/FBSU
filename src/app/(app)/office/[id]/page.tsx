import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOfficeMeta } from "@/lib/office";
import { OfficeEditor } from "@/components/office/office-editor";

type PageProps = { params: Promise<{ id: string }> };

export default async function OfficeDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      meta: true,
      createdById: true,
      updatedAt: true,
    },
  });

  if (!document || !isOfficeMeta(document.meta)) notFound();
  if (document.createdById !== user.id && user.role !== "ADMIN") notFound();

  return (
    <OfficeEditor
      id={document.id}
      type={document.meta.officeType}
      initialTitle={document.title}
      initialBody={document.body}
      updatedAt={document.updatedAt.toISOString()}
    />
  );
}
