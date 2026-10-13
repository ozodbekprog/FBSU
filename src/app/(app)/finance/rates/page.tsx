import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/i18n";
import { PageHeader } from "@/components/ui";
import { FIN_YEARS, loadFacultyBreakdown } from "@/components/finance/data";
import FacultyRateBoard from "@/components/finance/faculty-rate-board";

export default async function FinanceRatesPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  // Summa faqat admin belgilaydi — boshqalar ko'radi.
  const canManage = user.role === "ADMIN";
  if (user.role !== "ADMIN" && user.role !== "REGISTRAR" && user.role !== "REKTOR" && user.role !== "PRO_RECTOR") {
    redirect("/dashboard");
  }

  const currentYear = new Date().getFullYear();
  const year = FIN_YEARS.includes(currentYear)
    ? currentYear
    : FIN_YEARS[FIN_YEARS.length - 1];

  const data = await loadFacultyBreakdown(year);

  return (
    <>
      <PageHeader title={dictionary.finRatesTitle} subtitle={dictionary.finRatesSubtitle} />
      <FacultyRateBoard
        rows={data.rows}
        faculties={data.faculties}
        rates={data.rates}
        year={year}
        canManage={canManage}
      />
    </>
  );
}