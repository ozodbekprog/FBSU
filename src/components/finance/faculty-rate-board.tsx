"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Select,
  Stat,
  Table,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { FacultyBreakdown, FacultyRow } from "./faculty-rates";
import { breakdownTotals, FIN_YEARS } from "./faculty-rates";

function money(value: number) {
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return rounded < 0 ? `-${grouped}` : grouped;
}

export default function FacultyRateBoard({
  rows,
  faculties,
  rates,
  year,
  canManage,
}: {
  rows: FacultyBreakdown[];
  faculties: FacultyRow[];
  rates: Record<string, number>;
  year: number;
  canManage: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();

  const [selectedYear, setSelectedYear] = useState(String(year));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = breakdownTotals(rows);

  function draftValue(facultyId: string) {
    if (facultyId in drafts) return drafts[facultyId];
    const current = rates[facultyId] ?? 0;
    return current ? String(current) : "";
  }

  async function saveRates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const payload: Record<string, number> = {};
    for (const faculty of faculties) {
      const raw = draftValue(faculty.id).trim();
      if (!raw) continue;
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 0) {
        setError(`${faculty.name}: noto'g'ri summa`);
        return;
      }
      payload[faculty.id] = parsed;
    }

    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch("/api/finance/rates", {
        method: "POST",
        body: JSON.stringify({ year: Number(selectedYear), rates: payload }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: string }
        | null;
      if (!res.ok || !json || !json.ok) {
        setError(json && !json.ok ? (json.error ?? null) : null);
        return;
      }
      setDrafts({});
      setSaved(true);
      router.refresh();
    } catch {
      setError(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("finFaculty")} value={money(faculties.length)} />
        <Stat label={t("finStudents")} value={money(totals.students)} />
        <Stat label={t("finExpected")} value={money(totals.expected)} />
        <Stat label={t("finCurrentDebt")} value={money(totals.debt)} />
      </div>

      <Card>
        <CardHeader title={t("finRatesTitle")} subtitle={t("finRatesSubtitle")} />
        <CardBody>
          {canManage ? (
            <form onSubmit={saveRates} className="mb-5 flex flex-wrap items-end gap-3">
              <div className="w-40">
                <Label>{t("finYear")}</Label>
                <Select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setDrafts({});
                    setSaved(false);
                  }}
                >
                  {FIN_YEARS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={busy}>
                {t("crsSave")}
              </Button>
            </form>
          ) : null}
          {saved ? (
            <p className="mb-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
              {t("finRateSaved")}
            </p>
          ) : null}
          {error ? (
            <p className="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {rows.length === 0 ? (
            <EmptyState title={t("finRateNoData")} />
          ) : (
            <div className="-mx-6 overflow-x-auto">
              <Table>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-2 font-medium">{t("finFaculty")}</th>
                    <th className="px-3 py-2 font-medium">{t("finStudents")}</th>
                    <th className="px-3 py-2 font-medium">{t("finRate")}</th>
                    <th className="px-3 py-2 font-medium">{t("finExpected")}</th>
                    <th className="px-3 py-2 font-medium">{t("finAmount")}</th>
                    <th className="px-3 py-2 font-medium">{t("finPaid")}</th>
                    <th className="px-6 py-2 font-medium">{t("finCurrentDebt")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.facultyId} className="text-sm text-slate-700">
                      <td className="px-6 py-3">
                        <span className="font-medium text-slate-900">{row.name}</span>
                        {row.code ? (
                          <span className="ml-2 text-xs text-slate-400">{row.code}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{row.students}</td>
                      <td className="px-3 py-3">
                        {canManage ? (
                          <Input
                            type="number"
                            min={0}
                            step={1000}
                            value={draftValue(row.facultyId)}
                            onChange={(e) =>
                              setDrafts((current) => ({
                                ...current,
                                [row.facultyId]: e.target.value,
                              }))
                            }
                            className="w-36"
                            placeholder="0"
                          />
                        ) : (
                          <span className="font-medium text-slate-900">
                            {row.rate ? money(row.rate) : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {money(row.expected)}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {money(row.contracted)}
                      </td>
                      <td className="px-3 py-3 text-emerald-600">{money(row.paid)}</td>
                      <td
                        className={cn(
                          "px-6 py-3 font-medium",
                          row.debt > 0 ? "text-rose-600" : "text-slate-500",
                        )}
                      >
                        {money(row.debt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}