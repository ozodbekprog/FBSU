import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, Badge, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { GradeChangeActions } from "@/components/approvals/grade-change-actions";
import { fmtDateTime } from "@/lib/utils";

export default async function ApprovalsPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "REGISTRAR") redirect("/dashboard");

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

  return (
    <>
      <PageHeader
        eyebrow="Boshqaruv"
        title="Tasdiqlashlar"
        subtitle="Baho o'zgartirish so'rovlari — o'qituvchi so'raydi, o'quv bo'limi tasdiqlaydi"
      />
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Tasdiq kutayotgan so'rovlar"
            subtitle={`${pending.length} ta`}
            action={pending.length > 0 ? <Badge tone="amber">Navbatda</Badge> : null}
          />
          <CardBody>
            {pending.length === 0 ? (
              <EmptyState
                title="Tasdiq kutayotgan so'rov yo'q"
                description="O'qituvchilar baho tuzatish so'rovini yuborganda shu yerda paydo bo'ladi."
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
                          Ball:{" "}
                          <span className="font-semibold text-slate-500">{row.oldScore ?? "—"}</span>
                          {" → "}
                          <span className="font-semibold text-amber-800">{row.newScore}</span>
                          <span className="text-slate-500"> / {row.submission.assignment.maxScore}</span>
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          Sabab: {row.reason}
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

        {history.length > 0 ? (
          <Card>
            <CardHeader title="Oxirgi ko'rib chiqilganlar" subtitle={`${history.length} ta`} />
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
                      {row.status === "APPROVED" ? "Tasdiqlangan" : "Rad etilgan"}
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
