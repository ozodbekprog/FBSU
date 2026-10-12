import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  PageHeader,
  Stat,
  Table,
} from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { PublicationForm } from "@/components/research/publication-form";

const VIEW_ROLES: Role[] = [
  "TEACHER",
  "ADMIN",
  "DEKAN",
  "KAFEDRA_MUDIRI",
  "PRO_RECTOR",
  "REKTOR",
];

const KIND_LABEL_KEYS = {
  ARTICLE: "resKindArticle",
  CONFERENCE: "resKindConference",
  MONOGRAPH: "resKindMonograph",
  PATENT: "resKindPatent",
  TEXTBOOK: "resKindTextbook",
} as const;

const STATUS_LABEL_KEYS = {
  DRAFT: "resStatusDraft",
  SUBMITTED: "resStatusSubmitted",
  PUBLISHED: "resStatusPublished",
} as const;

const STATUS_TONES = {
  DRAFT: "slate",
  SUBMITTED: "amber",
  PUBLISHED: "green",
} as const;

const INDEX_LABEL_KEYS = {
  NONE: "resIndexNone",
  SCOPUS: "resIndexScopus",
  WOS: "resIndexWos",
  RINC: "resIndexRinc",
  LOCAL: "resIndexLocal",
} as const;

export default async function ResearchPage() {
  const user = await requireUser();
  if (!VIEW_ROLES.includes(user.role)) redirect("/dashboard");

  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const canManage = user.role === "TEACHER" || user.role === "ADMIN";

  const publications = await prisma.publication.findMany({
    include: {
      user: {
        select: { id: true, name: true, department: { select: { name: true } } },
      },
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
  });

  const currentYear = new Date().getFullYear();
  const published = publications.filter(
    (publication) => publication.status === "PUBLISHED",
  );
  const indexed = publications.filter(
    (publication) =>
      publication.indexing === "SCOPUS" || publication.indexing === "WOS",
  );

  return (
    <>
      <PageHeader
        title={dictionary.resTitle}
        subtitle={dictionary.resSubtitle}
        action={canManage ? <PublicationForm /> : undefined}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={dictionary.resStatTotal} value={publications.length} />
        <Stat label={dictionary.resStatPublished} value={published.length} />
        <Stat label={dictionary.resStatIndexed} value={indexed.length} />
        <Stat label={dictionary.resStatYear} value={currentYear} />
      </div>

      {publications.length === 0 ? (
        <EmptyState title={dictionary.resEmpty} />
      ) : (
        <Card>
          <CardBody>
            <Table>
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">{dictionary.resColTitle}</th>
                  <th className="px-4 py-3">{dictionary.resColKind}</th>
                  <th className="px-4 py-3">{dictionary.resColAuthors}</th>
                  <th className="px-4 py-3">{dictionary.resColJournal}</th>
                  <th className="px-4 py-3">{dictionary.resColYear}</th>
                  <th className="px-4 py-3">{dictionary.resColIndex}</th>
                  <th className="px-4 py-3">{dictionary.resColStatus}</th>
                  {canManage ? <th className="px-4 py-3" /> : null}
                </tr>
              </thead>
              <tbody>
                {publications.map((publication) => (
                  <tr
                    key={publication.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-4 py-3">
                      {publication.url ? (
                        <a
                          href={publication.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {publication.title}
                        </a>
                      ) : (
                        <span className="font-medium text-slate-900">
                          {publication.title}
                        </span>
                      )}
                      {publication.doi ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                          doi:{publication.doi}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {
                        KIND_LABEL_KEYS[
                          publication.kind as keyof typeof KIND_LABEL_KEYS
                        ]
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {publication.authors ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {publication.journal ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {publication.year ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          publication.indexing === "NONE" ||
                          publication.indexing === "LOCAL"
                            ? "slate"
                            : "brand"
                        }
                      >
                        {
                          INDEX_LABEL_KEYS[
                            publication.indexing as keyof typeof INDEX_LABEL_KEYS
                          ]
                        }
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          STATUS_TONES[
                            publication.status as keyof typeof STATUS_TONES
                          ]
                        }
                      >
                        {
                          STATUS_LABEL_KEYS[
                            publication.status as keyof typeof STATUS_LABEL_KEYS
                          ]
                        }
                      </Badge>
                    </td>
                    {canManage ? <td className="px-4 py-3" /> : null}
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}
    </>
  );
}
