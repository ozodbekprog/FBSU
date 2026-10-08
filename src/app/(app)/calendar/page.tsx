import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { UniversalCalendar } from "@/components/calendar/universal-calendar";
import { getLocale, t } from "@/i18n";

export default async function CalendarPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const canManage = user.role === "TEACHER" || user.role === "ADMIN";
  return (
    <>
      <PageHeader
        eyebrow={t(locale, "dashAcademicEyebrow")}
        title={t(locale, "dashCalendarTitle")}
        subtitle={
          canManage
            ? t(locale, "dashCalendarSubtitleStaff")
            : t(locale, "dashCalendarSubtitleStudent")
        }
      />
      <UniversalCalendar canManage={canManage} />
    </>
  );
}
