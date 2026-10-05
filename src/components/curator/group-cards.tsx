import Link from "next/link";
import { Badge, Card, CardBody } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { CuratorGroupSummary } from "@/app/api/curator/data";
import { getDictionary, getLocale, t as translate } from "@/i18n";

function attendanceTone(value: number | null) {
  if (value === null) return "text-slate-600";
  if (value >= 80) return "text-emerald-600";
  if (value >= 60) return "text-amber-600";
  return "text-rose-600";
}

export async function CuratorGroupCards({
  groups,
  showCurator,
}: {
  groups: CuratorGroupSummary[];
  showCurator: boolean;
}) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <Link
          key={group.id}
          href={`/curator/${group.id}`}
          className="group rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
        >
          <Card className="h-full transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-brand-200 group-hover:shadow-md">
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold tracking-tight text-slate-900 transition-colors duration-150 group-hover:text-brand-900">
                    {group.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {showCurator
                      ? group.curator
                        ? `${dictionary.admCuratorLabel}: ${group.curator.name}`
                        : dictionary.admCuratorNotAssigned
                      : translate(locale, "admCuratorStudentsSubtitle", { count: group.studentCount })}
                  </p>
                </div>
                {group.year ? <Badge tone="slate">{group.year}</Badge> : null}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 text-sm">
                <div>
                  <p className="text-xs text-slate-600">{dictionary.admStudents}</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-slate-800">
                    {group.studentCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">{dictionary.admCuratorStatAttendance}</p>
                  <p
                    className={cn(
                      "mt-0.5 font-semibold tabular-nums",
                      attendanceTone(group.averageAttendance),
                    )}
                  >
                    {group.averageAttendance !== null ? `${group.averageAttendance}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">{dictionary.admCuratorStatLowAttendance}</p>
                  <p
                    className={cn(
                      "mt-0.5 font-semibold tabular-nums",
                      group.lowAttendanceCount > 0 ? "text-rose-600" : "text-emerald-600",
                    )}
                  >
                    {translate(locale, "admCount", { count: group.lowAttendanceCount })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">{dictionary.admCuratorStatGpa}</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-slate-800">
                    {group.averageGpa !== null ? group.averageGpa.toFixed(2) : "—"}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}
