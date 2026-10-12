"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

type BackupCounts = Record<string, number>;

type StatsResult = { ok: boolean; data?: { counts: BackupCounts }; error?: string };
type MaintenanceResult = { ok: boolean; data?: { enabled: boolean }; error?: string };

const ROW_META: { key: string; label: string; tone: "brand" | "blue" | "green" | "purple" | "gold" }[] = [
  { key: "users", label: "Foydalanuvchilar", tone: "brand" },
  { key: "groups", label: "Gruhlar", tone: "blue" },
  { key: "faculties", label: "Fakultetlar", tone: "purple" },
  { key: "departments", label: "Kafedralar", tone: "green" },
  { key: "subjects", label: "Fanlar", tone: "gold" },
  { key: "courses", label: "Kurslar", tone: "blue" },
  { key: "contracts", label: "Shartnomalar", tone: "gold" },
  { key: "payments", label: "To'lovlar", tone: "green" },
];

export default function BackupManager({
  initialCounts,
  initialMaintenance,
}: {
  initialCounts: BackupCounts;
  initialMaintenance: boolean;
}) {
  const { t } = useI18n();
  const [counts, setCounts] = useState<BackupCounts>(initialCounts);
  const [maintenance, setMaintenance] = useState<boolean>(initialMaintenance);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/backup/stats");
      const json = (await res.json().catch(() => null)) as StatsResult | null;
      if (res.ok && json?.ok && json.data) setCounts(json.data.counts);
    } catch {
      // stats yangilanmasa ham sahifa ishlaydi
    }
  }, []);

  async function handleExport() {
    setExporting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as StatsResult | null;
        setError(json?.error ?? t("admBackupExportFailed"));
        return;
      }
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "fbsu-backup.json";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice(t("admBackupExported"));
      await refreshStats();
    } catch {
      setError(t("admBackupExportFailed"));
    } finally {
      setExporting(false);
    }
  }

  async function handleToggleMaintenance() {
    const next = !maintenance;
    setMaintenance(next);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const json = (await res.json().catch(() => null)) as MaintenanceResult | null;
      if (!res.ok || !json?.ok || typeof json.data?.enabled !== "boolean") {
        setMaintenance(!next);
        setError(json?.error ?? t("admMaintenanceSaveFailed"));
        return;
      }
      setMaintenance(json.data.enabled);
      setNotice(json.data.enabled ? t("admMaintenanceEnabled") : t("admMaintenanceDisabled"));
    } catch {
      setMaintenance(!next);
      setError(t("admMaintenanceSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  const totalRows = ROW_META.reduce((sum, row) => sum + (counts[row.key] ?? 0), 0);

  return (
    <div className="space-y-4">
      <Card className="animate-fade-up">
        <CardHeader
          title="Zaxira holati"
          subtitle={t("admBackupStatusSubtitle")}
          action={
            <Button
              variant="primary"
              size="sm"
              disabled={exporting}
              onClick={handleExport}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="m7 10 5 5 5-5" />
                <path d="M12 15V3" />
              </svg>
              {exporting ? t("admBackupExporting") : t("admBackupExport")}
            </Button>
          }
        />
        <CardBody>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge tone="slate">{t("admBackupTotalRows", { count: totalRows })}</Badge>
            {notice ? <Badge tone="green">{notice}</Badge> : null}
            {error ? <Badge tone="rose">{error}</Badge> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ROW_META.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3"
              >
                <span className="text-sm text-slate-600">{row.label}</span>
                <Badge tone={row.tone} className="tabular-nums">
                  {counts[row.key] ?? 0}
                </Badge>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card className="animate-fade-up">
        <CardHeader
          title="Texnik xizmat rejimi"
          subtitle={t("admMaintenanceSubtitle")}
          action={
            <Badge tone={maintenance ? "amber" : "green"}>
              {maintenance ? t("admMaintenanceOn") : t("admMaintenanceOff")}
            </Badge>
          }
        />
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-sm leading-relaxed text-slate-500">
              {maintenance
                ? t("admMaintenanceOnHint")
                : t("admMaintenanceOffHint")}
            </p>
            <Button
              variant={maintenance ? "ghost" : "primary"}
              size="sm"
              disabled={busy}
              onClick={handleToggleMaintenance}
              className={cn(maintenance && "text-rose-600")}
            >
              {maintenance ? t("admMaintenanceTurnOff") : t("admMaintenanceTurnOn")}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
