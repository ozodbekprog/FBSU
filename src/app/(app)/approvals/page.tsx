import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, Badge, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { GradeChangeActions } from "@/components/approvals/grade-change-actions";
import { EnrollmentActions } from "@/components/approvals/enrollment-actions";
import { fmtDateTime } from "@/lib/utils";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export default async function ApprovalsPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "REGISTRAR" && user.role !== "REKTOR") {
    redirect("/dashboard");
  }

  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const requests = await prisma.gradeChangeRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 60,
    include: {
      submission: {
        select: {
          student: { select: { id: true, name: true, avatarUrl: true } },
          assignment: {
            select: {
              id: true,
              title: true,
              maxScore: true,
              course: { select: { title: true } },
            },
          },
        },
      },
      requestedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  const pending = requests.filter((row) => row.status === "PENDING");
  const history = requests.filter((row) => row.status !== "PENDING").slice(0, 15);

  const enrollmentRequests = await prisma.enrollment.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true, group: { select: { name: true } } },
      },
      course: { select: { id: true, title: true, teacher: { select: { name: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        eyebrow={dictionary.admEyebrowManage}
        title={dictionary.admApprovalsTitle}
        subtitle={dictionary.admApprovalsSubtitle}
      />
      <div className="space-y-6">
        <Card>
          <CardHeader
            title={dictionary.admApprovalsPendingTitle}
            subtitle={translate(locale, "admCount", { count: pending.length })}
            action={pending.length > 0 ? <Badge tone="amber">{dictionary.admApprovalsInQueue}</Badge> : null}
          />
          <CardBody>
            {pending.length === 0 ? (
              <EmptyState
                title={dictionary.admApprovalsPendingEmptyTitle}
                description={dictionary.admApprovalsPendingEmptyDesc}
              />
            ) : (
              <div className="space-y-3">
                {pending.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-amber-200/70 bg-amber-50/40 px-4 py-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={row.submission.student.name}
                            src={row.submission.student.avatarUrl}
                            size={32}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {row.submission.student.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {row.submission.assignment.course.title} ·{" "}
                              {row.submission.assignment.title}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2.5 text-sm text-slate-700">
                          {dictionary.admApprovalsScore}{" "}
                          <span className="font-semibold text-slate-500">{row.oldScore ?? "—"}</span>
                          {" → "}
                          <span className="font-semibold text-amber-800">{row.newScore}</span>
                          <span className="text-slate-500"> / {row.submission.assignment.maxScore}</span>
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {translate(locale, "admApprovalsReason", { reason: row.reason })}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {row.requestedBy.name} · {fmtDateTime(row.createdAt)}
                        </p>
                      </div>
                      <GradeChangeActions requestId={row.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={dictionary.admApprovalsEnrollTitle}
            subtitle={translate(locale, "admCount", { count: enrollmentRequests.length })}
            action={
              enrollmentRequests.length > 0 ? <Badge tone="amber">{dictionary.admApprovalsInQueue}</Badge> : null
            }
          />
          <CardBody>
            {enrollmentRequests.length === 0 ? (
              <EmptyState
                title={dictionary.admApprovalsEnrollEmptyTitle}
                description={dictionary.admApprovalsEnrollEmptyDesc}
              />
            ) : (
              <div className="space-y-3">
                {enrollmentRequests.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-amber-200/70 bg-amber-50/40 px-4 py-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.user.name} src={row.user.avatarUrl} size={32} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {row.user.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {row.user.group?.name ?? dictionary.admNoGroup} · {row.course.title}
                            </p>
                          </div>
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-500">
                          {translate(locale, "admApprovalsTeacher", { name: row.course.teacher.name })} ·{" "}
                          {fmtDateTime(row.createdAt)}
                        </p>
                      </div>
                      <EnrollmentActions enrollmentId={row.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {history.length > 0 ? (
          <Card>
            <CardHeader
              title={dictionary.admApprovalsHistoryTitle}
              subtitle={translate(locale, "admCount", { count: history.length })}
            />
            <CardBody>
              <div className="space-y-2">
                {history.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/70 px-3.5 py-2.5 text-sm"
                  >
                    <div className="min-w-0 text-slate-700">
                      <span className="font-medium">{row.submission.student.name}</span> ·{" "}
                      {row.submission.assignment.title} · {row.oldScore ?? "—"} → {row.newScore}
                      {row.reviewedBy ? (
                        <span className="text-slate-500"> · {row.reviewedBy.name}</span>
                      ) : null}
                    </div>
                    <Badge tone={row.status === "APPROVED" ? "green" : "rose"}>
                      {row.status === "APPROVED" ? dictionary.admStatusApproved : dictionary.admStatusRejected}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </>
  );
}
