import { isStaff, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { CalendarView } from "@/components/calendar/calendar-view";
import { getLocale, t } from "@/i18n";

export default async function CalendarPage() {
  const user = await requireUser();
  const locale = await getLocale();
  return (
    <>
      <PageHeader
        title={t(locale, "dashCalendarTitle")}
        subtitle={
          isStaff(user.role)
            ? t(locale, "dashCalendarSubtitleStaff")
            : t(locale, "dashCalendarSubtitleStudent")
        }
      />
      <CalendarView />
    </>
  );
}
