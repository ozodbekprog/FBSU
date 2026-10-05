import { requireUser } from "@/lib/auth";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { CheckInForm } from "@/components/attendance/check-in-form";

export default async function AttendanceCheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; code?: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { t, code } = await searchParams;

  if (user.role !== "STUDENT") {
    return (
      <>
        <PageHeader title={dictionary.schQrAttendanceTitle} subtitle={dictionary.schForStudents} />
        <EmptyState
          title={dictionary.schPageForStudentsTitle}
          description={dictionary.schPageForStudentsDesc}
          action={
            <ButtonLink href="/courses" variant="secondary" size="sm" className="mt-2">
              {dictionary.schGoToCourses}
            </ButtonLink>
          }
        />
      </>
    );
  }

  const token = (t ?? "").trim();
  const codeValue = (code ?? "").trim().toUpperCase();
  const initialPayload = token ? { token } : codeValue ? { code: codeValue } : undefined;

  return (
    <>
      <PageHeader
        title={dictionary.schQrAttendanceTitle}
        subtitle={translate(locale, "schScanQrSubtitle", { name: user.name })}
      />
      <CheckInForm initialPayload={initialPayload} />
    </>
  );
}
