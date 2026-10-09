import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { AdmissionStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, ButtonLink, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { ScoresForm } from "@/components/admissions/scores-form";
import { StatusActions } from "@/components/admissions/status-actions";
import { ADMISSION_MANAGE_ROLES, ADMISSION_VIEW_ROLES } from "@/app/api/admissions/shared";
import type { Dictionary } from "@/i18n";

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

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{children}</span>
    </div>
  );
}

export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!ADMISSION_VIEW_ROLES.includes(user.role)) redirect("/dashboard");

  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const canManage = ADMISSION_MANAGE_ROLES.includes(user.role);
  const { id } = await params;

  const application = await prisma.admissionApplication.findUnique({
    where: { id },
    include: {
      program: { select: { id: true, name: true, code: true, quota: true } },
      student: { select: { id: true, name: true, email: true } },
    },
  });
  if (!application) notFound();

  const totalScore = (application.examScore1 ?? 0) + (application.examScore2 ?? 0);

  return (
    <>
      <PageHeader
        eyebrow={dictionary.qblTitle}
        title={application.applicantName}
        subtitle={application.program.name}
        action={
          <ButtonLink href="/admissions" variant="secondary" size="sm">
            {dictionary.qblBack}
          </ButtonLink>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title={dictionary.qblDetailTitle}
              action={
                <Badge tone={STATUS_TONES[application.status]}>
                  {dictionary[STATUS_KEYS[application.status]]}
                </Badge>
              }
            />
            <CardBody className="divide-y divide-slate-100 py-1.5">
              <InfoRow label={dictionary.qblPhone}>{application.phone}</InfoRow>
              <InfoRow label={dictionary.qblEmail}>{application.email ?? "—"}</InfoRow>
              <InfoRow label={dictionary.qblSchool}>{application.school ?? "—"}</InfoRow>
              <InfoRow label={dictionary.qblProgram}>
                {application.program.name}
                {application.program.code ? ` · ${application.program.code}` : ""}
              </InfoRow>
              <InfoRow label={dictionary.qblAppliedAt}>{fmtDateTime(application.createdAt)}</InfoRow>
              {application.note ? <InfoRow label={dictionary.qblNotes}>{application.note}</InfoRow> : null}
              {application.student ? (
                <InfoRow label={dictionary.qblStatusEnrolled}>
                  <Link href={`/users/${application.student.id}`} className="text-brand-700 underline-offset-2 hover:underline">
                    {application.student.name}
                  </Link>
                </InfoRow>
              ) : null}
            </CardBody>
          </Card>

          {canManage ? (
            <Card>
              <CardHeader title={dictionary.qblScores} subtitle={dictionary.qblScoresSubtitle} />
              <CardBody>
                <ScoresForm
                  applicationId={application.id}
                  initial={{
                    examScore1: application.examScore1,
                    examScore2: application.examScore2,
                    interviewScore: application.interviewScore,
                    decisionNote: application.decisionNote,
                  }}
                  labels={{
                    score1: dictionary.qblScore1,
                    score2: dictionary.qblScore2,
                    interview: dictionary.qblInterview,
                    total: dictionary.qblTotal,
                    decisionNote: dictionary.qblDecisionNote,
                    save: dictionary.qblSaveScores,
                    saved: dictionary.qblSaved,
                  }}
                />
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader title={dictionary.qblScores} subtitle={dictionary.qblScoresSubtitle} />
              <CardBody className="divide-y divide-slate-100 py-1.5">
                <InfoRow label={dictionary.qblScore1}>{application.examScore1 ?? "—"}</InfoRow>
                <InfoRow label={dictionary.qblScore2}>{application.examScore2 ?? "—"}</InfoRow>
                <InfoRow label={dictionary.qblInterview}>{application.interviewScore ?? "—"}</InfoRow>
                <InfoRow label={dictionary.qblTotal}>{totalScore}/200</InfoRow>
                {application.decisionNote ? (
                  <InfoRow label={dictionary.qblDecisionNote}>{application.decisionNote}</InfoRow>
                ) : null}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={dictionary.qblStatusFlow} />
            <CardBody>
              {canManage ? (
                <StatusActions
                  applicationId={application.id}
                  status={application.status}
                  hasStudent={Boolean(application.studentId)}
                  labels={{
                    documents: dictionary.qblActionDocuments,
                    exam: dictionary.qblActionExam,
                    pass: dictionary.qblActionPass,
                    reject: dictionary.qblActionReject,
                    enroll: dictionary.qblActionEnroll,
                    enrollHint: dictionary.qblActionEnrollHint,
                    restore: dictionary.qblActionRestore,
                    needEmail: dictionary.qblEnrollNeedEmail,
                  }}
                />
              ) : (
                <p className="text-sm text-slate-500">{dictionary.qblSubtitle}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={dictionary.qblProgram} />
            <CardBody className="space-y-2.5">
              <p className="font-semibold tracking-tight text-slate-900">{application.program.name}</p>
              <p className="text-xs text-slate-500">
                {dictionary.qblQuota}: {application.program.quota}
              </p>
              <p className="text-xs text-slate-500">
                {dictionary.qblAppliedAt}: {fmtDate(application.createdAt)}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
