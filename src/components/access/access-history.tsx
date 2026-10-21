"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AccessDirection, Role } from "@prisma/client";
import type { Dictionary } from "@/i18n/uz";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, Select, Stat, Table } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/utils";
import {
  type AccessHistoryLog,
  type AccessHistoryResult,
  type AccessHistoryStats,
  type AccessRangeFilter,
} from "@/modules/access/history";

const ROLE_LABEL_KEY: Record<Role, keyof Dictionary> = {
  ADMIN: "mscRoleAdmin",
  OWNER: "mscRoleAdmin",
  REKTOR: "mscRoleRector",
  PRO_RECTOR: "mscRoleProRector",
  DEKAN: "mscRoleDean",
  KAFEDRA_MUDIRI: "mscRoleHead",
  REGISTRAR: "mscRoleRegistrar",
  BUXGALTER: "payRoleBuxgalter",
  TYUTOR: "mscRoleTutor",
  TEACHER: "mscRoleTeacher",
  STUDENT: "mscRoleStudent",
  XODIM: "mscRoleStaff",
  OTA_ONA: "mscRoleParent",
  NAZORATCHI: "roleNazoratchi",
};

const SEARCH_DEBOUNCE_MS = 350;

type DirectionFilter = AccessDirection | "";

export function AccessHistory({
  initialLogs,
  initialStats,
  initialTotal,
}: {
  initialLogs: AccessHistoryLog[];
  initialStats: AccessHistoryStats;
  initialTotal: number;
}) {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AccessHistoryLog[]>(initialLogs);
  const [stats, setStats] = useState<AccessHistoryStats>(initialStats);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [direction, setDirection] = useState<DirectionFilter>("");
  const [range, setRange] = useState<AccessRangeFilter>("all");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [q]);

  const queryKey = `${debouncedQ}|${direction}|${range}`;

  const fetchPage = useCallback(
    async (nextPage: number): Promise<AccessHistoryResult | null> => {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (direction) params.set("direction", direction);
      if (range !== "all") params.set("range", range);
      params.set("page", String(nextPage));
      try {
        const response = await apiFetch(`/api/access/logs?${params.toString()}`);
        const json = (await response.json().catch(() => null)) as
          | { ok?: boolean; data?: AccessHistoryResult }
          | null;
        return json?.ok && json.data ? json.data : null;
      } catch {
        return null;
      }
    },
    [debouncedQ, direction, range],
  );

  const loadFirstPage = useCallback(async () => {
    const data = await fetchPage(1);
    if (data) {
      setLogs(data.logs);
      setStats(data.stats);
      setTotal(data.total);
      setPage(data.page);
    }
    return data;
  }, [fetchPage]);

  // Serverdan kelgan dastlabki ma'lumot filtrlarga mos — birinchi renderda qayta so'ramaymiz.
  const skipInitialRefetch = useRef(true);

  useEffect(() => {
    if (skipInitialRefetch.current) {
      skipInitialRefetch.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadFirstPage().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [queryKey, loadFirstPage]);

  const hasMore = logs.length < total;
  const isFiltered = Boolean(q || direction || range !== "all");

  async function onLoadMore() {
    if (loading || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchPage(page + 1);
    if (data) {
      setLogs((prev) => [...prev, ...data.logs]);
      setStats(data.stats);
      setTotal(data.total);
      setPage(data.page);
    }
    setLoadingMore(false);
  }

  async function onRefresh() {
    if (loading) return;
    setLoading(true);
    await loadFirstPage();
    setLoading(false);
  }

  function clearFilters() {
    setQ("");
    setDebouncedQ("");
    setDirection("");
    setRange("all");
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("accTodayIn")} value={stats.todayIn} />
        <Stat label={t("accTodayOut")} value={stats.todayOut} />
        <Stat label={t("accTodayUnique")} value={stats.uniqueToday} />
      </div>

      <Card>
        <CardHeader
          title={t("accHistoryTitle")}
          subtitle={t("accHistorySubtitle")}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void onRefresh()}
              disabled={loading}
              aria-label={t("accRefresh")}
            >
              ↻ {t("accRefresh")}
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={t("accSearchPlaceholder")}
              aria-label={t("accSearchPlaceholder")}
              maxLength={80}
              className="sm:max-w-xs"
            />
            <Select
              value={direction}
              onChange={(event) => setDirection(event.target.value as DirectionFilter)}
              aria-label={t("accDirection")}
              className="sm:w-44"
            >
              <option value="">{t("accFilterAll")}</option>
              <option value="IN">{t("accIn")}</option>
              <option value="OUT">{t("accOut")}</option>
            </Select>
            <Select
              value={range}
              onChange={(event) => setRange(event.target.value as AccessRangeFilter)}
              aria-label={t("accPeriod")}
              className="sm:w-44"
            >
              <option value="all">{t("accPeriodAll")}</option>
              <option value="today">{t("accPeriodToday")}</option>
              <option value="week">{t("accPeriodWeek")}</option>
              <option value="month">{t("accPeriodMonth")}</option>
            </Select>
          </div>

          {logs.length === 0 ? (
            <EmptyState
              title={isFiltered ? t("accNoResults") : t("accEmpty")}
              action={
                isFiltered ? (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    {t("accClearFilters")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className={loading ? "opacity-60" : undefined} aria-busy={loading}>
              <Table>
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("accPerson")}</th>
                    <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("accDirection")}</th>
                    <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("accGate")}</th>
                    <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("accTime")}</th>
                    <th className="border-b border-slate-100 px-6 py-3 font-semibold">{t("accAllowed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-50 transition-colors duration-150 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3">
                        <span className="block font-medium text-slate-900">{log.user?.name ?? "—"}</span>
                        {log.user ? (
                          <span className="block text-xs text-slate-500">
                            {t(ROLE_LABEL_KEY[log.user.role])}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-6 py-3">
                        <Badge tone={log.direction === "IN" ? "green" : "amber"}>
                          {log.direction === "IN" ? t("accIn") : t("accOut")}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{log.gate}</td>
                      <td className="px-6 py-3 text-slate-600">{fmtDateTime(log.at)}</td>
                      <td className="px-6 py-3">
                        <Badge tone={log.allowed ? "green" : "rose"}>
                          {log.allowed ? "✓" : t("accDenied")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{t("accShownOf", { shown: logs.length, total })}</p>
            {hasMore ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void onLoadMore()}
                disabled={loadingMore || loading}
              >
                {loadingMore ? "..." : t("accLoadMore")}
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
