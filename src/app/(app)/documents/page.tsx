import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import DocumentBoard, {
  type DocumentItem,
  type StudentOption,
} from "@/components/documents/document-board";

const CREATOR_ROLES: Role[] = ["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"];

export default async function DocumentsPage() {
  const user = await requireUser();
  if (user.role === "STUDENT") redirect("/dashboard");

  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const [documents, staff, students] = await Promise.all([
    prisma.document.findMany({
      where: { NOT: { meta: { path: ["fbsuOffice"], equals: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        createdBy: { select: { id: true, name: true } },
        signer: { select: { id: true, name: true } },
        signedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: ["REKTOR", "PRO_RECTOR", "ADMIN"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: "STUDENT" },
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true, group: { select: { name: true } } },
    }),
  ]);

  const items: DocumentItem[] = documents.map((document) => ({
    id: document.id,
    kind: document.kind,
    number: document.number,
    title: document.title,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    createdById: document.createdById,
    createdBy: document.createdBy,
    signerId: document.signerId,
    signer: document.signer,
    signedBy: document.signedBy,
    signedAt: document.signedAt ? document.signedAt.toISOString() : null,
    archivedAt: document.archivedAt ? document.archivedAt.toISOString() : null,
  }));

  const studentOptions: StudentOption[] = students.map((student) => ({
    id: student.id,
    name: student.name,
    group: student.group ? student.group.name : null,
  }));

  return (
    <>
      <PageHeader title={dictionary.docTitle} subtitle={dictionary.docSubtitle} />
      <DocumentBoard
        documents={items}
        staff={staff}
        students={studentOptions}
        currentUserId={user.id}
        canCreate={CREATOR_ROLES.includes(user.role)}
        isManager={user.role === "ADMIN" || user.role === "REGISTRAR"}
        isAdmin={user.role === "ADMIN"}
      />
    </>
  );
}
