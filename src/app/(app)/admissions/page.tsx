import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdmissionStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Progress } from "@/components/ui";
import { getDictionary, getLocale, t as translate, type Dictionary } from "@/i18n";
import { cn, fmtDate } from "@/lib/utils";
import { textMatches } from "@/lib/encrypted-search";
import { ProgramForm } from "@/components/admissions/program-form";
import { ADMISSION_MANAGE_ROLES, ADMISSION_VIEW_ROLES } from "@/app/api/admissions/shared";

const STATUS_TONES: Record<AdmissionStatus, "slate" | "amber" | "blue" | "green" | "rose" | "purple"> = {
  NEW: "slate",
  DOCUMENTS: "amber",
  EXAM: "blue",
  PASSED: "green",
  REJECTED: "rose",
  ENROLLED: "purple",
};

const STATUS_KEYS: Record<AdmissionStatus, keyof Dictionary> = {
  NEW: "qblStatusNew",
  DOCUMENTS: "qblStatusDocuments",
  EXAM: "qblStatusExam",
  PASSED: "qblStatusPassed",
  REJECTED: "qblStatusRejected",
  ENROLLED: "qblStatusEnrolled",
};

const STATUS_ORDER: AdmissionStatus[] = ["NEW", "DOCUMENTS", "EXAM", "PASSED", "REJECTED", "ENROLLED"];

export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireUser();
  if (!ADMISSION_VIEW_ROLES.includes(user.role)) redirect("/dashboard");

  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const canManage = ADMISSION_MANAGE_ROLES.includes(user.role);
  const { q, status } = await searchParams;
  const query = (q ?? "").trim();
  const statusFilter = STATUS_ORDER.includes(status as AdmissionStatus)
    ? (status as AdmissionStatus)
    : undefined;

  const [applications, programs, statusCounts] = await Promise.all([
    prisma.admissionApplication
      .findMany({
        where: { status: statusFilter },
        orderBy: { createdAt: "desc" },
        include: {
          program: { select: { name: true } },
          student: { select: { name: true } },
        },
      })
      .then((rows) =>
        (query
          ? rows.filter((row) => textMatches(query, [row.applicantName, row.phone, row.email]))
          : rows
        ).slice(0, 200),
      ),
    prisma.admissionProgram.findMany({
      orderBy: { createdAt: "asc" },
      include: { applications: { select: { status: true } } },
    }),
    prisma.admissionApplication.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countOf = (key: AdmissionStatus) =>
    statusCounts.find((row) => row.status === key)?._count._all ?? 0;
  const total = statusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const inReview = countOf("NEW") + countOf("DOCUMENTS") + countOf("EXAM");
  const accepted = countOf("PASSED") + countOf("ENROLLED");
  const enrolledByProgram = new Map(
    programs.map((program) => [
      program.id,
      program.applications.filter((row) => row.status === "ENROLLED").length,
    ]),
  );
  const vacancies = programs.reduce((sum, program) => {
    const enrolled = enrolledByProgram.get(program.id) ?? 0;
    return sum + Math.max(0, program.quota - enrolled);
  }, 0);

  const stats = [
    { label: dictionary.qblStatApplications, value: total, tone: "bg-brand-50 text-brand-700 ring-brand-100" },
    { label: dictionary.qblStatInReview, value: inReview, tone: "bg-amber-50 text-amber-600 ring-amber-100" },
    { label: dictionary.qblStatAccepted, value: accepted, tone: "bg-emerald-50 text-emerald-600 ring-emerald-100" },
    { label: dictionary.qblStatVacancies, value: vacancies, tone: "bg-gold-300/20 text-gold-800 ring-gold-300/40" },
  ];

  return (
    <>
      <PageHeader title={dictionary.qblTitle} subtitle={dictionary.qblSubtitle} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex items-center gap-3.5 p-4">
            <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ring-1 tabular-nums", stat.tone)}>
              {stat.value}
            </span>
            <p className="truncate text-sm font-medium text-slate-600">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader
          title={dictionary.qblPrograms}
          subtitle={dictionary.qblProgramsSubtitle}
          action={canManage ? <ProgramForm /> : null}
        />
        <CardBody>
          {programs.length === 0 ? (
            <EmptyState title={dictionary.qblEmpty} description={dictionary.qblEmptyDesc} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {programs.map((program) => {
                const enrolled = enrolledByProgram.get(program.id) ?? 0;
                const percent = Math.min(100, Math.round((enrolled / Math.max(1, program.quota)) * 100));
                return (
                  <div key={program.id} className="rounded-2xl border border-slate-200/70 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold tracking-tight text-slate-900">{program.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {program.code ? `${program.code} · ` : ""}
                          {program.degree} · {program.educationForm}
                        </p>
                      </div>
                      <Badge tone={percent >= 100 ? "rose" : "green"}>{percent}%</Badge>
                    </div>
                    <div className="mt-3">
                      <Progress value={percent} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                      <span className="tabular-nums">
                        {dictionary.qblEnrolled}: {enrolled}/{program.quota}
                      </span>
                      <span className="tabular-nums text-slate-700">
                        {dictionary.qblVacancies}: {Math.max(0, program.quota - enrolled)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={dictionary.qblApplications}
          subtitle={translate(locale, "admCount", { count: total })}
        />
        <CardBody className="space-y-4">
          <form className="flex flex-wrap items-center gap-2" method="get">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder={dictionary.qblSearchPlaceholder}
              className="h-10 min-w-64 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition-colors focus:border-brand-400"
            />
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            <button
              type="submit"
              className="h-10 rounded-xl bg-brand-900 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800"
            >
              {dictionary.qblSearch}
            </button>
            {query || statusFilter ? (
              <Link
                href="/admissions"
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {dictionary.qblClear}
              </Link>
            ) : null}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={query ? `/admissions?q=${encodeURIComponent(query)}` : "/admissions"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                !statusFilter
                  ? "bg-brand-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {dictionary.qblAllStatuses}
              <span className={cn("rounded-full px-1.5 text-[11px] font-bold", !statusFilter ? "bg-white/15" : "bg-white")}>
                {total}
              </span>
            </Link>
            {STATUS_ORDER.map((key) => {
              const active = statusFilter === key;
              const href = `/admissions?status=${key}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
              return (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    active ? "bg-brand-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {dictionary[STATUS_KEYS[key]]}
                  <span className={cn("rounded-full px-1.5 text-[11px] font-bold", active ? "bg-white/15" : "bg-white")}>
                    {countOf(key)}
                  </span>
                </Link>
              );
            })}
          </div>

          {applications.length === 0 ? (
            <EmptyState title={dictionary.qblNoMatch} description={dictionary.qblNoMatchDesc} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-3 py-2.5 font-medium">{dictionary.qblApplicant}</th>
                    <th className="px-3 py-2.5 font-medium">{dictionary.qblProgram}</th>
                    <th className="px-3 py-2.5 font-medium">{dictionary.qblScores}</th>
                    <th className="px-3 py-2.5 font-medium">{dictionary.qblAppliedAt}</th>
                    <th className="px-3 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => {
                    const totalScore =
                      (application.examScore1 ?? 0) + (application.examScore2 ?? 0);
                    return (
                      <tr key={application.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/70">
                        <td className="px-3 py-3">
                          <Link href={`/admissions/${application.id}`} className="block">
                            <span className="font-medium text-slate-900">{application.applicantName}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">{application.phone}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{application.program.name}</td>
                        <td className="px-3 py-3 tabular-nums text-slate-600">
                          {application.examScore1 != null || application.examScore2 != null
                            ? `${totalScore}/200`
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">{fmtDate(application.createdAt)}</td>
                        <td className="px-3 py-3 text-right">
                          <Badge tone={STATUS_TONES[application.status]}>
                            {dictionary[STATUS_KEYS[application.status]]}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
