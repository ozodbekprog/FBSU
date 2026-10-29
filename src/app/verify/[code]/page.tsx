import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { prisma } from "@/lib/prisma";
import { fmtDate } from "@/lib/utils";
import { getDictionary, getLocale } from "@/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getLocale());
  return {
    title: dictionary.dipVerifyTitle,
    robots: { index: false, follow: false },
  };
}

type DiplomaRow = { label: string; value: string };

export default async function VerifyDiplomaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const diploma = await prisma.diploma.findUnique({
    where: { verifyCode: code },
    include: { student: { select: { name: true, group: { select: { name: true } } } } },
  });

  const rows: DiplomaRow[] = diploma
    ? [
        {
          label: dictionary.dipStudent,
          value: `${diploma.student.name}${diploma.student.group ? ` · ${diploma.student.group.name}` : ""}`,
        },
        { label: dictionary.dipProgram, value: diploma.program },
        { label: dictionary.dipDegree, value: diploma.degree },
        { label: dictionary.dipGpa, value: diploma.gpa === null ? "—" : diploma.gpa.toFixed(2) },
        { label: dictionary.dipNumber, value: diploma.number },
        { label: dictionary.dipIssued, value: fmtDate(diploma.issuedAt) },
      ]
    : [];

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size={44} withText={false} />
          <div>
            <p className="font-serif text-lg font-semibold tracking-tight text-white">
              Turin Politexnika Universiteti
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold-300">
              FBSU
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-6 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {dictionary.dipVerifyTitle}
            </p>
          </div>

          {diploma ? (
            <div className="px-6 py-7">
              <div className="flex flex-col items-center text-center">
                <span className="inline-flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <p className="mt-4 text-base font-semibold text-emerald-700">
                  {dictionary.dipValid}
                </p>
                <p className="mt-1 text-xs text-slate-500">{dictionary.dipScan}</p>
              </div>

              <dl className="mt-7 divide-y divide-slate-100">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 py-3">
                    <dt className="text-sm text-slate-500">{row.label}</dt>
                    <dd className="text-right text-sm font-medium text-slate-900">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 text-center font-mono text-[11px] tracking-wide text-slate-500">
                {diploma.verifyCode}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="inline-flex size-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/60">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </span>
              <p className="mt-4 text-base font-semibold text-rose-700">
                {dictionary.dipInvalid}
              </p>
              <p className="mt-1.5 max-w-xs text-sm text-slate-500">{dictionary.dipScan}</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/60">
          Turin Politexnika Universiteti · FBSU
        </p>
      </div>
    </main>
  );
}
