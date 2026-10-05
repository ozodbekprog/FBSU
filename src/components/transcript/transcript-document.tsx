import { fmtDate } from "@/lib/utils";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import type { TranscriptData } from "@/components/transcript/transcript-data";

function percent(value: number | null) {
  return value !== null ? `${value}%` : "—";
}

function letterTone(letter: string) {
  if (letter === "A") return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (letter === "B") return "border-brand-300 bg-brand-50 text-brand-700";
  if (letter === "C") return "border-amber-300 bg-amber-50 text-amber-700";
  if (letter === "D") return "border-orange-300 bg-orange-50 text-orange-700";
  if (letter === "F") return "border-rose-300 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">{label}</p>
      <p className="mt-1 font-serif text-[15px] font-semibold leading-snug text-slate-800">{value}</p>
    </div>
  );
}

function Signature({ role, label }: { role: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="font-serif text-sm italic text-slate-600">{role}</p>
      <div className="mt-10 h-px w-44 bg-slate-500" />
      <p className="mt-1.5 text-[9px] uppercase tracking-[0.24em] text-slate-600">{label}</p>
    </div>
  );
}

function Stamp({ label }: { label: string }) {
  return (
    <div className="flex size-24 items-center justify-center rounded-full border-2 border-dashed border-brand-900/40">
      <div className="flex size-[74px] flex-col items-center justify-center rounded-full border border-brand-900/30 text-center">
        <span className="font-serif text-[13px] font-bold tracking-[0.22em] text-brand-900/60">
          FBSU
        </span>
        <span className="mt-0.5 text-[6.5px] font-semibold uppercase tracking-[0.2em] text-brand-900/50">
          {label}
        </span>
      </div>
    </div>
  );
}

export async function TranscriptDocument({ data }: { data: TranscriptData }) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const issuedAt = new Date();
  const gpaPercent = data.gpa !== null ? Math.max(0, Math.min(100, (data.gpa / 4) * 100)) : 0;

  return (
    <div id="ttpu-transcript" className="mx-auto w-full max-w-[210mm]">
      <div className="transcript-sheet relative overflow-hidden rounded-lg border-[5px] border-brand-950 bg-white shadow-xl">
        <div className="relative border-2 border-gold-400/80">
          <img
            src="/logo.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 w-[300px] -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
          />

          <div className="relative z-10">
            <header className="flex flex-wrap items-center justify-between gap-5 bg-brand-950 px-6 py-6 text-white sm:px-8">
              <div className="flex items-center gap-4">
                <div className="shrink-0 rounded-full border-2 border-gold-400 bg-white p-1">
                  <img
                    src="/logo.svg"
                    alt={dictionary.grdTrLogoAlt}
                    width={64}
                    height={64}
                    className="h-16 w-16"
                  />
                </div>
                <div>
                  <p className="font-serif text-lg font-semibold leading-tight tracking-wide sm:text-xl">
                    Turin Politexnika Universiteti
                  </p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-gold-300">
                    Turin Polytechnic University in Tashkent
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/55">
                    {dictionary.grdTrCountry}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-serif text-3xl font-bold uppercase tracking-[0.18em] text-gold-300">
                  {dictionary.grdTrHeading}
                </p>
                <div className="mt-2 flex items-center gap-2 sm:justify-end">
                  <span className="h-px w-8 bg-gold-400/60" />
                  <p className="font-mono text-[10px] tracking-[0.16em] text-white/75">
                    {data.serial}
                  </p>
                </div>
              </div>
            </header>

            <div className="h-1 bg-gold-400" />

            <div className="grid gap-4 border-b border-slate-200 px-6 py-5 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-slate-200 sm:px-8">
              <Info className="sm:pr-5" label={dictionary.grdTrStudent} value={data.student.name} />
              <Info className="sm:px-5" label={dictionary.grdTrGroup} value={data.student.group ?? "—"} />
              <Info
                className="sm:px-5"
                label={dictionary.grdTrStudentId}
                value={`FBSU-${data.student.id.slice(-8).toUpperCase()}`}
              />
              <Info className="sm:pl-5" label={dictionary.grdTrIssuedAt} value={fmtDate(issuedAt)} />
            </div>

            <div className="px-6 py-6 sm:px-8">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-serif text-base font-semibold text-brand-950">
                    {dictionary.grdTrResults}
                  </h2>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-600">
                    {dictionary.grdTrResultsSubtitle}
                  </p>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {translate(locale, "grdTrCourseCount", { count: data.courses.length })}
                </p>
              </div>

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="divide-x divide-white/10 bg-brand-900 text-left text-white">
                    <th className="w-10 border-b-2 border-gold-400 px-2.5 py-3 text-center text-[11px] font-semibold">
                      #
                    </th>
                    <th className="border-b-2 border-gold-400 px-3 py-3 text-[11px] font-semibold">
                      {dictionary.grdTrCourse}
                    </th>
                    <th className="border-b-2 border-gold-400 px-3 py-3 text-[11px] font-semibold">
                      {dictionary.grdTrTeacher}
                    </th>
                    <th className="border-b-2 border-gold-400 px-2.5 py-3 text-right text-[11px] font-semibold">
                      {dictionary.grdTrAssignments}
                    </th>
                    <th className="border-b-2 border-gold-400 px-2.5 py-3 text-right text-[11px] font-semibold">
                      {dictionary.grdTrQuizzes}
                    </th>
                    <th className="border-b-2 border-gold-400 px-2.5 py-3 text-right text-[11px] font-semibold">
                      {dictionary.grdTrAttendance}
                    </th>
                    <th className="border-b-2 border-gold-400 px-2.5 py-3 text-right text-[11px] font-semibold">
                      {dictionary.grdTrFinal}
                    </th>
                    <th className="w-14 border-b-2 border-gold-400 px-2.5 py-3 text-center text-[11px] font-semibold">
                      {dictionary.grdTrGrade}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.courses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="border-b border-slate-200 px-3 py-10 text-center text-sm text-slate-600"
                      >
                        {dictionary.grdTrNoCourses}
                      </td>
                    </tr>
                  ) : (
                    data.courses.map((course, index) => (
                      <tr
                        key={course.courseId}
                        className={`divide-x divide-slate-100 ${
                          index % 2 === 1 ? "bg-slate-50/70" : "bg-white"
                        }`}
                      >
                        <td className="border-b border-slate-200 px-2.5 py-2.5 text-center text-xs tabular-nums text-slate-600">
                          {index + 1}
                        </td>
                        <td className="border-b border-slate-200 px-3 py-2.5 font-medium text-slate-800">
                          {course.title}
                        </td>
                        <td className="border-b border-slate-200 px-3 py-2.5 text-slate-600">
                          {course.teacher}
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-2.5 text-right tabular-nums text-slate-600">
                          {percent(course.assignments)}
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-2.5 text-right tabular-nums text-slate-600">
                          {percent(course.quizzes)}
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-2.5 text-right tabular-nums text-slate-600">
                          {percent(course.attendance)}
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-2.5 text-right font-semibold tabular-nums text-brand-900">
                          {percent(course.final)}
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-2.5 text-center">
                          <span
                            className={`inline-flex size-7 items-center justify-center rounded-full border text-xs font-bold ${letterTone(course.letter)}`}
                          >
                            {course.letter}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-5 border-t border-slate-200 px-6 py-6 sm:grid-cols-[1.5fr_1fr] sm:px-8">
              <div className="rounded-lg border border-l-4 border-slate-200 border-l-gold-400 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                      {dictionary.grdTrTotalGpa}
                    </p>
                    <p className="mt-1 font-serif text-4xl font-bold tracking-tight text-brand-950">
                      {data.gpa !== null ? data.gpa.toFixed(2) : "—"}
                      <span className="ml-1.5 text-sm font-medium text-slate-600">/ 4.00</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {dictionary.grdTrGradedCourses}
                    </p>
                    <p className="mt-1 font-serif text-2xl font-semibold text-brand-900">
                      {data.courses.length}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-brand-800"
                    style={{ width: `${gpaPercent}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-[0.16em] text-slate-600">
                  <span>0.00</span>
                  <span>2.00</span>
                  <span>4.00</span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                  {dictionary.grdTrScale}
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  {dictionary.grdTrScaleText}
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                  {dictionary.grdTrLetterText}
                </p>
              </div>
            </div>

            <div className="grid gap-6 border-t border-slate-200 px-6 py-7 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-8">
              <Signature role={dictionary.grdTrRegistrar} label={dictionary.grdTrSignature} />
              <Stamp label={dictionary.grdTrStamp} />
              <Signature role={dictionary.grdTrHead} label={dictionary.grdTrSignature} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5 sm:px-8">
              <p className="max-w-xl text-[10px] leading-relaxed text-slate-600">
                {dictionary.grdTrFooter}
              </p>
              <p className="font-mono text-[10px] tracking-[0.14em] text-slate-600">
                {data.serial} · {fmtDate(issuedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
