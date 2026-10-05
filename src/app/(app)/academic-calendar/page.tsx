import { isStaff, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AcademicCalendarView } from "@/components/academic-calendar/academic-calendar-view";
import { getLocale, t } from "@/i18n";

export default async function AcademicCalendarPage() {
  const user = await requireUser();
  const locale = await getLocale();
  return (
    <>
      <PageHeader
        eyebrow={t(locale, "dashAcademicEyebrow")}
        title={t(locale, "dashAcademicTitle")}
        subtitle={
          isStaff(user.role)
            ? t(locale, "dashAcademicSubtitleStaff")
            : t(locale, "dashAcademicSubtitleStudent")
        }
      />
      <AcademicCalendarView canManage={isStaff(user.role)} />
    </>
  );
}
