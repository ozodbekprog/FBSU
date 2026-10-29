import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { ApplyForm } from "@/components/admissions/apply-form";

export default async function ApplyPage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const programs = await prisma.admissionProgram.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand-700 uppercase">FBSU</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-brand-950">
            {dictionary.qblApplyTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{dictionary.qblApplySubtitle}</p>
        </div>
        <ApplyForm programs={programs} />
        <p className="mt-4 text-center text-xs text-slate-500">{dictionary.qblApplyContact}</p>
      </div>
    </div>
  );
}
