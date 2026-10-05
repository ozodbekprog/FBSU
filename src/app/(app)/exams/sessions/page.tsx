import { isStaff, requireUser } from "@/lib/auth";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import {
  getSessionFormOptions,
  getStaffSessions,
  getStudentSessions,
} from "@/components/exams/session-data";
import { StaffSessionCard, StudentSessionCard } from "@/components/exams/session-cards";
import { SectionHeading } from "@/components/exams/session-badges";
import { SessionCreateForm } from "@/components/exams/session-form";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function ExamSessionsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  if (isStaff(user.role)) {
    const [sessions, options] = await Promise.all([
      getStaffSessions({ id: user.id, role: user.role }),
      getSessionFormOptions({ id: user.id, role: user.role }),
    ]);

    return (
      <>
        <PageHeader
          title={dictionary.grdExamSessions}
          subtitle={translate(locale, "grdSessionsCoursesSubtitle", {
            sessions: sessions.length,
            courses: options.courses.length,
          })}
        />
        <SessionCreateForm courses={options.courses} terms={options.terms} />
        <SectionHeading title={dictionary.grdSessions} subtitle={dictionary.grdSessionsSubtitle} />
        {sessions.length === 0 ? (
          <EmptyState
            title={dictionary.grdNoSessions}
            description={dictionary.grdNoSessionsDesc}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => (
              <StaffSessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </>
    );
  }

  const sessions = await getStudentSessions(user.id);

  return (
    <>
      <PageHeader
        title={dictionary.grdMyExams}
        subtitle={translate(locale, "grdMyExamSessionsSubtitle", {
          group: user.group?.name ?? dictionary.grdStudent,
          count: sessions.length,
        })}
      />
      {sessions.length === 0 ? (
        <EmptyState
          title={dictionary.grdNoExamSessions}
          description={dictionary.grdNoExamSessionsStudentDesc}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <StudentSessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </>
  );
}
