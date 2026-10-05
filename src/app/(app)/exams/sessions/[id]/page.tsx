import { notFound } from "next/navigation";
import { isStaff, requireUser } from "@/lib/auth";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import {
  canManageSession,
  EXAM_MIN_PERCENT,
  getSessionById,
  getSessionSheetRows,
  getStudentSessionView,
  sessionTypeLabel,
} from "@/components/exams/session-data";
import { SessionStatusActions, SheetManager } from "@/components/exams/session-admin";
import {
  AttendanceBanner,
  SheetStatusBadge,
  SessionStateBadge,
  SessionTypeBadge,
} from "@/components/exams/session-badges";
import { ButtonLink, Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-3">
      <p className="text-[10px] font-semibold tracking-wider text-slate-600 uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

function sessionTime(startTime: string | null, endTime: string | null, notSetLabel: string) {
  if (!startTime) return notSetLabel;
  return endTime ? `${startTime}–${endTime}` : startTime;
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const statusLabels: Record<string, string> = {
    PASSED: dictionary.grdStatusPassed,
    FAILED: dictionary.grdStatusFailed,
    ABSENT: dictionary.grdStatusAbsent,
    PENDING: dictionary.grdStatusPending,
  };
  const { id } = await params;

  if (isStaff(user.role)) {
    const session = await getSessionById(id);
    if (!session) notFound();
    if (!canManageSession({ id: user.id, role: user.role }, session.course.teacherId)) notFound();

    const data = await getSessionSheetRows(id);
    if (!data) notFound();
    const rows = data.rows;
    const admitted = rows.filter((row) => row.admitted).length;
    const eligible = rows.filter((row) => row.attendance.eligible).length;
    const passed = rows.filter((row) => row.status === "PASSED").length;
    const failed = rows.filter((row) => row.status === "FAILED").length;
    const absent = rows.filter((row) => row.status === "ABSENT").length;

    return (
      <>
        <PageHeader
          title={session.title}
          eyebrow={session.course.title}
          subtitle={`${sessionTypeLabel(session.type)} · ${fmtDate(session.date)}`}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ButtonLink href={`/exams/sessions/${session.id}/print`} variant="secondary" size="sm">
                {dictionary.grdAdmissionListPrint}
              </ButtonLink>
              <SessionStatusActions sessionId={session.id} admissionOpen={session.admissionOpen} />
            </div>
          }
        />
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label={dictionary.grdAdmitted}
            value={admitted}
            hint={translate(locale, "grdOfStudents", { count: rows.length })}
          />
          <Stat
            label={dictionary.grdEligible}
            value={eligible}
            hint={translate(locale, "grdMinAttendancePercent", { percent: EXAM_MIN_PERCENT })}
          />
          <Stat
            label={dictionary.grdPassed}
            value={passed}
            hint={translate(locale, "grdFailedCount", { count: failed })}
          />
          <Stat
            label={dictionary.grdAbsent}
            value={absent}
            hint={translate(locale, "grdNotAdmittedCount", { count: rows.length - admitted })}
          />
        </div>
        <Card className="mb-6">
          <CardHeader
            title={dictionary.grdSessionInfo}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <SessionTypeBadge type={session.type} />
                <SessionStateBadge date={session.date} />
                <span className="text-xs text-slate-500">
                  {session.admissionOpen
                    ? dictionary.grdAdmissionOpen
                    : dictionary.grdAdmissionClosed}
                </span>
              </div>
            }
          />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoTile label={dictionary.grdDate} value={fmtDate(session.date)} />
              <InfoTile
                label={dictionary.grdTime}
                value={sessionTime(session.startTime, session.endTime, dictionary.grdNotSet)}
              />
              <InfoTile label={dictionary.grdRoom} value={session.room ?? "—"} />
              <InfoTile label={dictionary.grdTerm} value={session.term?.name ?? dictionary.grdNoTerm} />
            </div>
          </CardBody>
        </Card>
        <SheetManager sessionId={session.id} rows={rows} />
      </>
    );
  }

  const view = await getStudentSessionView(id, user.id);
  if (!view) notFound();
  const { session, sheet, attendance } = view;

  return (
    <>
      <PageHeader
        title={session.title}
        eyebrow={session.course.title}
        subtitle={`${sessionTypeLabel(session.type)} · ${fmtDate(session.date)}`}
        action={<SessionStateBadge date={session.date} />}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title={dictionary.grdExamInfo}
            action={<SessionTypeBadge type={session.type} />}
          />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label={dictionary.grdDate} value={fmtDate(session.date)} />
              <InfoTile
                label={dictionary.grdTime}
                value={sessionTime(session.startTime, session.endTime, dictionary.grdNotSet)}
              />
              <InfoTile label={dictionary.grdRoom} value={session.room ?? "—"} />
              <InfoTile label={dictionary.grdTerm} value={session.term?.name ?? dictionary.grdNoTerm} />
              <InfoTile label={dictionary.grdSeat} value={sheet?.seat ?? "—"} />
              <InfoTile
                label={dictionary.grdAdmissionWindow}
                value={session.admissionOpen ? dictionary.grdOpen : dictionary.grdClosed}
              />
            </div>
            <p className="mt-4 text-xs text-slate-600">
              {translate(locale, "grdTeacherLabel", { name: session.course.teacher.name })}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title={dictionary.grdMyStatus}
            action={sheet ? <SheetStatusBadge status={sheet.status} score={sheet.score} /> : null}
          />
          <CardBody>
            <AttendanceBanner attendance={attendance} compact />
            {sheet ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoTile label={dictionary.grdSeat} value={sheet.seat ?? "—"} />
                <InfoTile
                  label={dictionary.grdResult}
                  value={
                    sheet.score != null
                      ? translate(locale, "grdResultScore", {
                          status: statusLabels[sheet.status] ?? sheet.status,
                          score: sheet.score,
                        })
                      : statusLabels[sheet.status] ?? sheet.status
                  }
                />
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500">
                {dictionary.grdNotAdmittedNotice}
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
