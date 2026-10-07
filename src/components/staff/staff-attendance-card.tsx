"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Stat,
  Table,
} from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

export type StaffAttendanceRecord = {
  id: string;
  date: Date;
  checkInAt: Date | null;
  checkOutAt: Date | null;
};

export type StaffOverviewRow = {
  id: string;
  name: string;
  role: Role;
  department: string | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
};

export type StaffOverviewData = {
  stats: { present: number; left: number; notCame: number };
  rows: StaffOverviewRow[];
};

type Action = "in" | "out";

type ApiResult = { ok: boolean; error?: string };

export default function StaffAttendanceCard({
  today,
  history,
  overview,
}: {
  today: StaffAttendanceRecord | null;
  history: StaffAttendanceRecord[];
  overview: StaffOverviewData | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkedIn = Boolean(today?.checkInAt);
  const checkedOut = Boolean(today?.checkOutAt);

  async function submit(action: Action) {
    setBusy(action);
    setError(null);
    try {
      const res = await apiFetch("/api/staff-attendance", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => null)) as ApiResult | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("admErrorGeneric"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("admErrorGeneric"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t("stfToday")}
          action={
            <div className="flex items-center gap-2">
              <Button disabled={checkedIn || busy !== null} onClick={() => submit("in")}>
                {t("stfCheckIn")}
              </Button>
              <Button
                variant="secondary"
                disabled={!checkedIn || checkedOut || busy !== null}
                onClick={() => submit("out")}
              >
                {t("stfCheckOut")}
              </Button>
            </div>
          }
        />
        <CardBody className="space-y-4">
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3.5 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          {checkedIn ? (
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{t("stfInAt")}</p>
                <p className="mt-1 text-lg font-semibold text-emerald-600">{fmtDateTime(today?.checkInAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{t("stfOutAt")}</p>
                <p className="mt-1 text-lg font-semibold text-slate-700">{fmtDateTime(today?.checkOutAt)}</p>
              </div>
            </div>
          ) : (
            <Badge tone="slate">{t("stfNotChecked")}</Badge>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("stfHistory")} />
        {history.length === 0 ? (
          <CardBody>
            <EmptyState title={t("stfEmpty")} />
          </CardBody>
        ) : (
          <Table>
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("stfDate")}</th>
                <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("stfInAt")}</th>
                <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("stfOutAt")}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-50 transition-colors duration-150 last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-6 py-3 font-medium text-slate-900">{fmtDate(row.date)}</td>
                  <td className="px-6 py-3 text-slate-600">{fmtDateTime(row.checkInAt)}</td>
                  <td className="px-6 py-3 text-slate-600">{fmtDateTime(row.checkOutAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label={t("stfPresent")} value={overview.stats.present} />
            <Stat label={t("stfLeft")} value={overview.stats.left} />
            <Stat label={t("stfNotCame")} value={overview.stats.notCame} />
          </div>
          <Card>
            <CardHeader title={t("stfOverviewAll")} subtitle={t("stfOverviewSubtitle")} />
            {overview.rows.length === 0 ? (
              <CardBody>
                <EmptyState title={t("stfEmpty")} />
              </CardBody>
            ) : (
              <Table>
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("stfStaff")}</th>
                    <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("stfInAt")}</th>
                    <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("stfOutAt")}</th>
                    <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("stfOverview")}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-50 transition-colors duration-150 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3">
                        <span className="block font-medium text-slate-900">{row.name}</span>
                        {row.department ? (
                          <span className="block text-xs text-slate-500">{row.department}</span>
                        ) : null}
                      </td>
                      <td className="px-6 py-3 text-slate-600">{fmtDateTime(row.checkInAt)}</td>
                      <td className="px-6 py-3 text-slate-600">{fmtDateTime(row.checkOutAt)}</td>
                      <td className="px-6 py-3">
                        <Badge tone={row.checkOutAt ? "slate" : "green"}>
                          {row.checkOutAt ? t("stfLeft") : t("stfPresent")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
