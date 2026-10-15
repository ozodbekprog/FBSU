"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ensureCsrfToken } from "@/lib/api";
import { Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

type SyncOutcome = {
  created: number;
  updated: number;
  removed: number;
  groupsCreated: number;
  manualRemoved: number;
  teachersCreated: number;
  subjectsCreated: number;
  roomsCreated: number;
};

function timeLabel(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const shifted = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${day}.${month} ${hours}:${minutes}`;
}

export function EduPageSyncCard({
  lastSyncAt,
  label,
  stats,
  sourceUrl,
}: {
  lastSyncAt: string | null;
  label: string | null;
  stats: { groups: number; teachers: number; subjects: number; rooms: number; lessons: number };
  sourceUrl: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [running, startRunning] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSync = useCallback(async () => {
    setState("idle");
    setMessage("");
    try {
      const token = await ensureCsrfToken();
      const response = await fetch("/api/edupage/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": token },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as { ok: boolean; data?: SyncOutcome; error?: string };
      if (!payload.ok || !payload.data) {
        setState("error");
        setMessage(payload.error ?? t("schEduPageSyncError"));
        return;
      }
      setState("done");
      setMessage(
        t("schEduPageSyncDone", {
          created: payload.data.created,
          updated: payload.data.updated,
          removed: payload.data.removed,
          groups: payload.data.groupsCreated,
          teachers: payload.data.teachersCreated,
          subjects: payload.data.subjectsCreated,
          rooms: payload.data.roomsCreated,
          manual: payload.data.manualRemoved,
        }),
      );
      router.refresh();
    } catch {
      setState("error");
      setMessage(t("schEduPageSyncError"));
    }
  }, [router, t]);

  return (
    <Card className="mb-4">
      <CardHeader
        title={t("admEduPageTitle")}
        subtitle={t("admEduPageSubtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => startRunning(() => void onSync())}
              disabled={running}
            >
              {running ? t("admEduPageSyncing") : t("admEduPageSyncNow")}
            </Button>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900"
            >
              {t("admEduPageSource")}
            </a>
          </div>
        }
      />
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Badge tone="blue">{t("admEduPageLastSync", { time: timeLabel(lastSyncAt) })}</Badge>
          <span>
            {t("admEduPageCounts", {
              groups: stats.groups,
              teachers: stats.teachers,
              subjects: stats.subjects,
              rooms: stats.rooms,
              lessons: stats.lessons,
            })}
          </span>
        </div>
        {label ? <p className="text-xs text-slate-500">{label}</p> : null}
        <p className="text-xs text-slate-500">{t("admEduPageAuto")}</p>
        {message ? (
          <p
            className={
              state === "error"
                ? "text-sm font-medium text-rose-600"
                : "text-sm font-medium text-emerald-600"
            }
          >
            {message}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
