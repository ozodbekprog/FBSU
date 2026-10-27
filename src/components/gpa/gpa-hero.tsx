import { Badge, Card, CardBody } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import type { StudentGpa } from "@/app/api/gpa/data";
import { GpaRing } from "./gpa-ring";

type StatusTone = "green" | "blue" | "amber" | "rose";

function gpaStatus(
  gpa: number,
  labels: { excellent: string; good: string; satisfactory: string; unsatisfactory: string },
): { label: string; tone: StatusTone } {
  if (gpa >= 3.5) return { label: labels.excellent, tone: "green" };
  if (gpa >= 3.0) return { label: labels.good, tone: "blue" };
  if (gpa >= 2.0) return { label: labels.satisfactory, tone: "amber" };
  return { label: labels.unsatisfactory, tone: "rose" };
}

function percentAccent(percent: number | null) {
  if (percent == null) return "bg-slate-400";
  if (percent >= 80) return "bg-emerald-400";
  if (percent >= 60) return "bg-gold-400";
  return "bg-rose-400";
}

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.1]">
      <p className="flex items-center gap-2 text-xs font-medium text-brand-200">
        <span className={cn("size-1.5 rounded-full", accent)} />
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

export async function GpaHero({ data, delay = 0 }: { data: StudentGpa; delay?: number }) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  if (data.gpa == null) return null;
  const status = gpaStatus(data.gpa, {
    excellent: dictionary.grdGpaStatusExcellent,
    good: dictionary.grdGpaStatusGood,
    satisfactory: dictionary.grdGpaStatusSatisfactory,
    unsatisfactory: dictionary.grdGpaStatusUnsatisfactory,
  });
  const scalePercent = Math.round((data.gpa / 4) * 100);

  return (
    <div className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <Card className="relative overflow-hidden border-brand-800/50 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-gold-400 to-brand-500" />
        <span className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-gold-400/10 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-brand-400/20 blur-3xl" />
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(212,175,55,0.14),transparent_45%)]" />
        <CardBody className="relative grid items-center gap-8 py-8 sm:grid-cols-[minmax(0,15.5rem)_1fr]">
          <div className="flex justify-center">
            <GpaRing gpa={data.gpa} variant="dark" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">
                {dictionary.grdOverallGpa}
              </p>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {data.gpa.toFixed(2)}
              </h2>
              <span className="pb-1 text-sm font-medium text-brand-300">/ 4.0</span>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-brand-200">
              {dictionary.grdGpaHeroDesc}
            </p>
            {data.creditBoost > 0 ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 text-xs font-semibold text-gold-200">
                <span className="size-1.5 rounded-full bg-gold-400" />
                {translate(locale, "grdCreditBoostLine", {
                  credits: data.creditBoost.toFixed(2),
                })}
              </p>
            ) : null}
            <div className="mt-5">
              <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.14em] text-brand-300">
                <span>0.0</span>
                <span>{translate(locale, "grdScalePercent", { percent: scalePercent })}</span>
                <span>4.0</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 via-gold-400 to-emerald-400 transition-[width] duration-700"
                  style={{ width: `${scalePercent}%` }}
                />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroStat label={dictionary.grdCourses} value={data.courses.length} accent="bg-brand-400" />
              <HeroStat label={dictionary.grdCredits} value={data.totalCredits} accent="bg-gold-400" />
              <HeroStat
                label={dictionary.grdAverage}
                value={data.overallPercent != null ? `${data.overallPercent}%` : "—"}
                accent={percentAccent(data.overallPercent)}
              />
              <HeroStat
                label={dictionary.grdGraded}
                value={data.gradedCount}
                accent="bg-emerald-400"
              />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
