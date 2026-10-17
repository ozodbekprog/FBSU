import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { cn, fmtDateTime } from "@/lib/utils";
import { getDictionary, getLocale, t as translate } from "@/i18n";

const PAGE_SIZE = 50;

type ChangeFile = {
  path: string;
  status: string;
  insertions: number;
  deletions: number;
};

type UpdateChanges = {
  files: ChangeFile[];
  insertions: number;
  deletions: number;
};

const FILE_STATUS: Record<string, { label: string; className: string }> = {
  A: { label: "A", className: "bg-emerald-50 text-emerald-700" },
  M: { label: "M", className: "bg-amber-50 text-amber-700" },
  D: { label: "D", className: "bg-rose-50 text-rose-700" },
  R: { label: "R", className: "bg-purple-50 text-purple-700" },
};

function readChanges(value: unknown): UpdateChanges {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { files: [], insertions: 0, deletions: 0 };
  }
  const record = value as Record<string, unknown>;
  const rawFiles = Array.isArray(record.files) ? record.files : [];
  const files: ChangeFile[] = [];
  for (const raw of rawFiles) {
    if (typeof raw !== "object" || raw === null) continue;
    const file = raw as Record<string, unknown>;
    if (typeof file.path !== "string") continue;
    files.push({
      path: file.path,
      status: typeof file.status === "string" ? file.status : "M",
      insertions: typeof file.insertions === "number" ? file.insertions : 0,
      deletions: typeof file.deletions === "number" ? file.deletions : 0,
    });
  }
  const insertions = files.reduce((sum, file) => sum + file.insertions, 0);
  const deletions = files.reduce((sum, file) => sum + file.deletions, 0);
  return { files, insertions, deletions };
}

const PAGE_LINK =
  "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-brand-900";

export default async function AdminUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const params = await searchParams;
  const pageParam = Number(params.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const [total, logs] = await Promise.all([
    prisma.updateLog.count(),
    prisma.updateLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow={dictionary.admEyebrowAdmin}
        title={dictionary.admUpdatesTitle}
        subtitle={translate(locale, "admUpdatesSubtitle", { total })}
      />

      {logs.length === 0 ? (
        <EmptyState
          title={dictionary.admUpdatesEmptyTitle}
          description={dictionary.admUpdatesEmptyDesc}
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const changes = readChanges(log.changes);
            return (
              <Card key={log.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold tracking-tight text-slate-900">{log.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {fmtDateTime(log.createdAt)}
                        {log.author ? ` · ${log.author}` : ""}
                        {log.branch ? ` · ${log.branch}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {log.commit ? (
                        <Badge tone="brand" className="font-mono">
                          {log.commit}
                        </Badge>
                      ) : null}
                      {log.node ? <Badge tone="blue">{log.node}</Badge> : null}
                      {log.bugId ? <Badge tone="amber">bug {log.bugId.slice(-6)}</Badge> : null}
                    </div>
                  </div>

                  {log.summary ? <p className="text-sm text-slate-600">{log.summary}</p> : null}

                  {changes.files.length > 0 ? (
                    <details className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50">
                      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-slate-700">
                        {translate(locale, "admUpdatesFilesChanged", { count: changes.files.length })}
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          +{changes.insertions} / −{changes.deletions}
                        </span>
                      </summary>
                      <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-white">
                        {changes.files.map((file) => {
                          const status = FILE_STATUS[file.status] ?? {
                            label: file.status.slice(0, 1),
                            className: "bg-slate-100 text-slate-600",
                          };
                          return (
                            <li key={file.path} className="flex items-center gap-2.5 px-4 py-1.5">
                              <span
                                className={cn(
                                  "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                                  status.className,
                                )}
                              >
                                {status.label}
                              </span>
                              <span className="truncate font-mono text-xs text-slate-600">{file.path}</span>
                              {file.insertions > 0 || file.deletions > 0 ? (
                                <span className="ml-auto shrink-0 font-mono text-[11px] text-slate-500">
                                  +{file.insertions} −{file.deletions}
                                </span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {pageCount > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={`/admin/updates?page=${page - 1}`} className={PAGE_LINK}>
              {dictionary.admPreviousArrow}
            </Link>
          ) : (
            <span className={cn(PAGE_LINK, "pointer-events-none opacity-40")}>{dictionary.admPreviousArrow}</span>
          )}
          <span className="text-sm text-slate-500">{translate(locale, "admPagination", { page, pageCount })}          </span>
          {page < pageCount ? (
            <Link href={`/admin/updates?page=${page + 1}`} className={PAGE_LINK}>
              {dictionary.admNextArrow}
            </Link>
          ) : (
            <span className={cn(PAGE_LINK, "pointer-events-none opacity-40")}>{dictionary.admNextArrow}</span>
          )}
        </div>
      ) : null}
    </>
  );
}
