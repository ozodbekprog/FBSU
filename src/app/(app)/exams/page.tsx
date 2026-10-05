import { isStaff, requireUser } from "@/lib/auth";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { getStaffExams, getStudentExams } from "@/components/exams/data";
import { getStaffSessions, getStudentSessions } from "@/components/exams/session-data";
import { StaffExamCard, StudentExamCard } from "@/components/exams/cards";
import { ExamGroupSection } from "@/components/exams/group";
import { ExamStat } from "@/components/exams/stats";
import { StaffSessionCard, StudentSessionCard } from "@/components/exams/session-cards";
import { SectionHeading } from "@/components/exams/session-badges";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export default async function ExamsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const groupSections = [
    {
      key: "upcoming",
      title: dictionary.grdGroupUpcoming,
      tone: "blue",
      subtitle: dictionary.grdGroupUpcomingSubtitle,
    },
    {
      key: "today",
      title: dictionary.grdGroupToday,
      tone: "amber",
      subtitle: dictionary.grdGroupTodaySubtitle,
    },
    {
      key: "past",
      title: dictionary.grdGroupPast,
      tone: "slate",
      subtitle: dictionary.grdGroupPastSubtitle,
    },
  ] as const;

  if (isStaff(user.role)) {
    const [groups, sessions] = await Promise.all([
      getStaffExams({ id: user.id, role: user.role }),
      getStaffSessions({ id: user.id, role: user.role }),
    ]);
    const items = [...groups.upcoming, ...groups.today, ...groups.past];
    const submitted = items.reduce((sum, exam) => sum + exam.submittedCount, 0);
    const attempts = items.reduce((sum, exam) => sum + exam.attemptCount, 0);
    const published = items.filter((exam) => exam.isPublished).length;

    return (
      <>
        <PageHeader
          title={dictionary.grdExamsTitle}
          subtitle={
            user.role === "TEACHER"
              ? dictionary.grdExamsStaffSubtitleTeacher
              : dictionary.grdExamsStaffSubtitleAdmin
          }
        />
        <SectionHeading
          title={dictionary.grdExamSessions}
          subtitle={dictionary.grdExamSessionsSubtitle}
          action={
            <ButtonLink href="/exams/sessions" size="sm" variant="secondary">
              {dictionary.grdAllSessions}
            </ButtonLink>
          }
        />
        {sessions.length === 0 ? (
          <EmptyState
            title={dictionary.grdNoExamSessions}
            description={dictionary.grdNoExamSessionsDesc}
            action={
              <ButtonLink href="/exams/sessions" size="sm">
                {dictionary.grdCreateSession}
              </ButtonLink>
            }
          />
        ) : (
          <div className="mb-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sessions.slice(0, 3).map((session) => (
              <StaffSessionCard key={session.id} session={session} />
            ))}
          </div>
        )}

        <SectionHeading
          title={dictionary.grdAssessments}
          subtitle={dictionary.grdAssessmentsSubtitle}
        />
        <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExamStat
            icon="clipboard"
            label={dictionary.grdAssessments}
            value={items.length}
            hint={translate(locale, "grdPublishedCount", { count: published })}
          />
          <ExamStat
            icon="calendar"
            label={dictionary.grdActive}
            value={groups.upcoming.length + groups.today.length}
            hint={translate(locale, "grdTodayCount", { count: groups.today.length })}
            tone="amber"
          />
          <ExamStat
            icon="users"
            label={dictionary.grdSubmitters}
            value={submitted}
            hint={translate(locale, "grdAttemptsCount", { count: attempts })}
            tone="emerald"
          />
          <ExamStat
            icon="check"
            label={dictionary.grdTodayLoad}
            value={groups.today.length}
            hint={dictionary.grdTodayDeadlines}
            tone="rose"
          />
        </div>
        {items.length === 0 ? (
          <EmptyState
            title={dictionary.grdNoAssessments}
            description={dictionary.grdNoAssessmentsDescStaff}
            action={
              <ButtonLink href="/quizzes/new" size="sm">
                {dictionary.grdCreateAssessment}
              </ButtonLink>
            }
          />
        ) : (
          groupSections.map((group) => (
            <ExamGroupSection
              key={group.key}
              title={group.title}
              tone={group.tone}
              subtitle={group.subtitle}
              count={groups[group.key].length}
            >
              {groups[group.key].map((exam) => (
                <StaffExamCard key={exam.id} exam={exam} />
              ))}
            </ExamGroupSection>
          ))
        )}
      </>
    );
  }

  const [groups, sessions] = await Promise.all([
    getStudentExams(user.id),
    getStudentSessions(user.id),
  ]);
  const items = [...groups.upcoming, ...groups.today, ...groups.past];
  const eligible = items.filter((exam) => exam.attendance.eligible).length;
  const submitted = items.filter((exam) => exam.attempts.finished > 0).length;

  return (
    <>
      <PageHeader
        title={dictionary.grdExamsTitle}
        subtitle={translate(locale, "grdStudentExamsSubtitle", {
          group: user.group?.name ?? dictionary.grdStudent,
          sessions: sessions.length,
          assessments: items.length,
        })}
      />
      <SectionHeading
        title={dictionary.grdMyExams}
        subtitle={dictionary.grdMyExamsSubtitle}
        action={
          <ButtonLink href="/exams/sessions" size="sm" variant="secondary">
            {dictionary.grdAll}
          </ButtonLink>
        }
      />
      {sessions.length === 0 ? (
        <EmptyState
          title={dictionary.grdNoExamSessions}
          description={dictionary.grdNoExamSessionsStudentDesc}
        />
      ) : (
        <div className="mb-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <StudentSessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      <SectionHeading
        title={dictionary.grdAssessments}
        subtitle={dictionary.grdAssessmentsSubtitle}
      />
      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExamStat
          icon="clipboard"
          label={dictionary.grdAssessments}
          value={items.length}
          hint={translate(locale, "grdCompletedCount", { count: groups.past.length })}
        />
        <ExamStat
          icon="calendar"
          label={dictionary.grdUpcoming}
          value={groups.upcoming.length + groups.today.length}
          hint={translate(locale, "grdTodayCount", { count: groups.today.length })}
          tone="amber"
        />
        <ExamStat
          icon="shieldCheck"
          label={dictionary.grdHasPermission}
          value={eligible}
          hint={dictionary.grdAttendanceRequirementMet}
          tone="emerald"
        />
        <ExamStat
          icon="check"
          label={dictionary.grdSubmitted}
          value={submitted}
          hint={translate(locale, "grdNoPermissionCount", {
            count: items.length - eligible,
          })}
          tone="gold"
        />
      </div>
      {items.length === 0 ? (
        <EmptyState
          title={dictionary.grdNoAssessments}
          description={dictionary.grdNoAssessmentsStudentDesc}
        />
      ) : (
        groupSections.map((group) => (
          <ExamGroupSection
            key={group.key}
            title={group.title}
            tone={group.tone}
            subtitle={group.subtitle}
            count={groups[group.key].length}
          >
            {groups[group.key].map((exam) => (
              <StudentExamCard key={exam.id} exam={exam} />
            ))}
          </ExamGroupSection>
        ))
      )}
    </>
  );
}
