"use client";

import { Card, CardBody, CardHeader } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { DAY_KEYS } from "@/components/schedule/week-utils";
import type { BuilderEntry } from "./types";

export function BuilderStats({ entries, weekParity }: { entries: BuilderEntry[]; weekParity: "odd" | "even" }) {
  const { t } = useI18n();
  const occupied = new Set(entries.map((entry) => `${entry.dayOfWeek}-${entry.slot}`)).size;
  const cancelled = entries.filter((entry) => entry.status === "CANCELLED").length;
  const sorted = entries
    .slice()
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.slot - b.slot);

  return (
    <Card>
      <CardHeader
        title={t("schWeekSummary")}
        subtitle={weekParity === "even" ? t("schEvenWeek") : t("schOddWeek")}
      />
      <CardBody className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-brand-50/70 px-2 py-2">
            <p className="text-xl font-semibold text-brand-900">{entries.length}</p>
            <p className="text-[11px] text-slate-500">{t("schLessons")}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-xl font-semibold text-brand-900">{48 - occupied}</p>
            <p className="text-[11px] text-slate-500">{t("schFreeSlots")}</p>
          </div>
          <div className="rounded-xl bg-rose-50/70 px-2 py-2">
            <p className="text-xl font-semibold text-rose-600">{cancelled}</p>
            <p className="text-[11px] text-slate-500">{t("schCancelled")}</p>
          </div>
        </div>

        <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
          {sorted.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-600">
              {t("schNoLessonsYet")}
            </p>
          ) : (
            sorted.map((entry) => (
              <div key={entry.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
                <span className="w-16 shrink-0 font-medium text-slate-500">
                  {`${t(DAY_KEYS[entry.dayOfWeek % 7]).slice(0, 3)} · ${t("schSlotLabel", { slot: entry.slot })}`}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                  {entry.subjectRef?.name ?? entry.subject}
                </span>
                {entry.room ? <span className="shrink-0 text-slate-600">{entry.room}</span> : null}
              </div>
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
}
