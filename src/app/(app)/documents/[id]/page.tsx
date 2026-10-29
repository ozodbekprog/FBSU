import Link from "next/link";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import type { DocumentKind, DocumentStatus, Role } from "@prisma/client";
import { Badge } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale, type Dictionary } from "@/i18n";
import { isOfficeMeta } from "@/lib/office";
import { PrintButton } from "@/components/documents/document-board";

const PRINT_STYLES = `
@media print {
  @page { size: A4; margin: 14mm; }
  body * { visibility: hidden !important; }
  #ttpu-document, #ttpu-document * { visibility: visible !important; }
  #ttpu-document { position: fixed; inset: 0; padding: 0; background: #ffffff; }
}
`;

const KIND_LABELS: Record<DocumentKind, keyof Dictionary> = {
  ORDER: "docKindOrder",
  LETTER: "docKindLetter",
  REFERENCE: "docKindReference",
  PROTOCOL: "docKindProtocol",
  OTHER: "docKindOther",
};

const STATUS_LABELS: Record<DocumentStatus, keyof Dictionary> = {
  DRAFT: "docStatusDraft",
  PENDING: "docStatusPending",
  SIGNED: "docStatusSigned",
  REJECTED: "docStatusRejected",
  ARCHIVED: "docStatusArchived",
};

const STATUS_TONES: Record<DocumentStatus, "slate" | "amber" | "green" | "rose" | "blue"> = {
  DRAFT: "slate",
  PENDING: "amber",
  SIGNED: "green",
  REJECTED: "rose",
  ARCHIVED: "blue",
};

function roleTitle(role: Role, dict: Dictionary): string {
  switch (role) {
    case "ADMIN":
      return dict.roleAdmin;
    case "REKTOR":
      return dict.roleRector;
    case "PRO_RECTOR":
      return dict.roleProRector;
    case "REGISTRAR":
      return dict.roleRegistrar;
    case "DEKAN":
      return dict.roleDean;
    case "KAFEDRA_MUDIRI":
      return dict.roleHead;
    case "TYUTOR":
      return dict.roleTutor;
    case "TEACHER":
      return dict.roleTeacher;
    case "STUDENT":
      return dict.roleStudent;
    default:
      return dict.roleStaff;
  }
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
    </div>
  );
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.role === "STUDENT") redirect("/dashboard");

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      signer: { select: { id: true, name: true, role: true } },
      signedBy: { select: { id: true, name: true, role: true } },
    },
  });
  if (!document) notFound();
  if (isOfficeMeta(document.meta)) redirect(`/office/${document.id}`);

  const locale = await getLocale();
  const dict = getDictionary(locale);

  const isOfficial = document.status === "SIGNED" || document.status === "ARCHIVED";
  const signedUser = document.signedBy ?? document.signer;

  return (
    <>
      <style>{PRINT_STYLES}</style>

      <div className="print:hidden">
        <Link
          href="/documents"
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors duration-150 hover:text-brand-700"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {dict.docBack}
        </Link>

        <div className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-brand-950">
              {document.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone="purple">{dict[KIND_LABELS[document.kind]]}</Badge>
              <Badge tone={STATUS_TONES[document.status]}>
                {dict[STATUS_LABELS[document.status]]}
              </Badge>
              <span className="font-mono text-xs tracking-wider text-slate-500">
                {document.number ?? "—"}
              </span>
            </div>
          </div>
          <PrintButton />
        </div>

        <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <MetaItem label={dict.docNumber} value={document.number ?? "—"} />
          <MetaItem
            label={dict.docCreatedBy}
            value={`${document.createdBy.name} · ${fmtDateTime(document.createdAt)}`}
          />
          <MetaItem
            label={dict.docSigner}
            value={document.signer ? document.signer.name : dict.docNoSigner}
          />
          <MetaItem
            label={dict.docSignedAt}
            value={document.signedAt ? fmtDateTime(document.signedAt) : "—"}
          />
        </div>
      </div>

      {isOfficial ? (
        <div id="ttpu-document" className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none">
            <div className="border-b-2 border-brand-900 pb-4 text-center">
              <p className="font-serif text-2xl font-bold tracking-wide text-brand-950">TTPU</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                Turin Politexnika Universiteti
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {dict.docKind}: {dict[KIND_LABELS[document.kind]]}
              </span>
              <span className="font-mono tracking-wider">{document.number ?? "—"}</span>
            </div>
            <h2 className="mt-8 text-center text-xl font-semibold tracking-tight text-slate-900">
              {document.title}
            </h2>
            <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-800">
              {document.body}
            </p>
            {signedUser ? (
              <div className="mt-12 flex justify-end">
                <div className="w-64 text-center">
                  <p className="font-serif text-lg italic text-brand-900">{signedUser.name}</p>
                  <div className="mt-2 h-px bg-slate-400" />
                  <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">
                    {roleTitle(signedUser.role, dict)}
                  </p>
                  {document.signedAt ? (
                    <p className="mt-1 text-xs text-slate-500">{fmtDateTime(document.signedAt)}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {dict.docKind}: {dict[KIND_LABELS[document.kind]]}
              </span>
              <span className="font-mono tracking-wider">{document.number ?? "—"}</span>
            </div>
            <h2 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">
              {document.title}
            </h2>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-800">
              {document.body}
            </p>
            <p className="mt-10 border-t border-dashed border-slate-200 pt-4 text-xs text-slate-500">
              {dict[STATUS_LABELS[document.status]]}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
