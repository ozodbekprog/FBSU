"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, Input, Label, Progress } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n";
import type { GenerateCountKey, GenerateResult, GeneratorStats } from "@/server/generator";

type ApiResponse = { ok: boolean; data?: GenerateResult; error?: string };

const RESULT_ITEMS: { key: GenerateCountKey; label: keyof Dictionary; hint: keyof Dictionary; tone: string; icon: ReactNode }[] = [
  {
    key: "subjects",
    label: "admSubjects",
    hint: "admGenSubjectsHint",
    tone: "from-brand-500 to-brand-900",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    key: "teachers",
    label: "admColTeachers",
    hint: "admGenTeachersHint",
    tone: "from-sky-400 to-brand-700",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10 12 5 2 10l10 5 10-5z" />
        <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      </svg>
    ),
  },
  {
    key: "groups",
    label: "admGroups",
    hint: "admGenGroupsHint",
    tone: "from-violet-400 to-purple-700",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 2 9 5-9 5-9-5 9-5" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </svg>
    ),
  },
  {
    key: "students",
    label: "admStudents",
    hint: "admGenStudentsHint",
    tone: "from-emerald-400 to-teal-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "courses",
    label: "admCourses",
    hint: "admGenCoursesHint",
    tone: "from-amber-300 to-gold-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    key: "scheduleEntries",
    label: "admGenSchedule",
    hint: "admGenScheduleHint",
    tone: "from-rose-400 to-pink-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="2.5" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    key: "attendance",
    label: "admGenAttendance",
    hint: "admGenAttendanceHint",
    tone: "from-teal-400 to-cyan-700",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l2 2 4-4" />
        <rect x="3" y="4" width="18" height="17" rx="2.5" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
  },
];

const PRESETS: { label: keyof Dictionary; groups: string; students: string }[] = [
  { label: "admGenPresetSmall", groups: "2", students: "5" },
  { label: "admGenPresetStandard", groups: "5", students: "8" },
  { label: "admGenPresetLarge", groups: "10", students: "15" },
];

export default function GeneratorManager({ initial }: { initial: GeneratorStats }) {
  const router = useRouter();
  const { t } = useI18n();
  const [groups, setGroups] = useState("5");
  const [studentsPerGroup, setStudentsPerGroup] = useState("8");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!result) {
      setRevealed(false);
      return;
    }
    const timer = setTimeout(() => setRevealed(true), 40);
    return () => clearTimeout(timer);
  }, [result]);

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: Number(groups),
          studentsPerGroup: Number(studentsPerGroup),
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.error ?? t("admGenFailed"));
        return;
      }
      setResult(json.data);
      router.refresh();
    } catch {
      setError(t("admNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  const createdTotal = result ? RESULT_ITEMS.reduce((sum, item) => sum + result[item.key], 0) : 0;
  const estimate = (Number(groups) || 0) * (Number(studentsPerGroup) || 0);
  const resultItems = result
    ? RESULT_ITEMS.map((item) => ({
        ...item,
        value: result[item.key],
        share: createdTotal > 0 ? Math.round((result[item.key] / createdTotal) * 100) : 0,
      }))
    : [];

  return (
    <div className="space-y-6">
      <Card className="animate-fade-up relative overflow-hidden border-amber-200/70 bg-amber-50/50">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 via-gold-400 to-amber-500" />
        <CardBody className="flex items-start gap-3.5">
          <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-gold-500 text-white shadow-lg shadow-gold-500/30">
            <span className="animate-pulse-ring absolute inset-0 rounded-2xl bg-amber-400/50" />
            <svg className="relative" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-semibold tracking-tight text-amber-900">{t("admGenWarning")}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-amber-800/90">
{t("admGenWarningText")}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {RESULT_ITEMS.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 shadow-[0_0_0_1px_rgba(217,119,6,0.16)]"
                >
                  <span className={cn("size-1.5 rounded-full bg-gradient-to-br", item.tone)} />
                  {t(item.label)}
                </span>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="animate-fade-up lg:col-span-2" >
          <CardHeader
            title={t("admGenParamsTitle")}
            subtitle={t("admGenParamsSubtitle")}
            action={
              busy ? (
                <Badge tone="amber" className="animate-pulse">{t("admGenInProgress")}</Badge>
              ) : (
                <Badge tone="green">{t("admGenReady")}</Badge>
              )
            }
          />
          <CardBody className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-600">{t("admGenPresetLabel")}</span>
              {PRESETS.map((preset) => {
                const active = groups === preset.groups && studentsPerGroup === preset.students;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setGroups(preset.groups);
                      setStudentsPerGroup(preset.students);
                    }}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
                      active
                        ? "bg-brand-900 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800",
                    )}
                  >
                    {t(preset.label)} · {preset.groups}×{preset.students}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label className="mb-1.5">{t("admGenGroupsLabel")}</Label>
                  <span className="text-xs font-semibold tabular-nums text-brand-700">{groups || "—"}</span>
                </div>
                <Input
                  id="generator-groups"
                  type="number"
                  min={1}
                  max={10}
                  value={groups}
                  disabled={busy}
                  onChange={(event) => setGroups(event.target.value)}
                />
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={groups || "1"}
                  disabled={busy}
                  aria-label={t("admGenGroupsAria")}
                  onChange={(event) => setGroups(event.target.value)}
                  className="mt-2.5 w-full accent-brand-900 disabled:opacity-50"
                />
                <p className="mt-1.5 text-xs text-slate-600">{t("admGenGroupsHint")}</p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label className="mb-1.5">{t("admGenStudentsLabel")}</Label>
                  <span className="text-xs font-semibold tabular-nums text-brand-700">{studentsPerGroup || "—"}</span>
                </div>
                <Input
                  id="generator-students"
                  type="number"
                  min={4}
                  max={20}
                  value={studentsPerGroup}
                  disabled={busy}
                  onChange={(event) => setStudentsPerGroup(event.target.value)}
                />
                <input
                  type="range"
                  min={4}
                  max={20}
                  value={studentsPerGroup || "4"}
                  disabled={busy}
                  aria-label={t("admGenStudentsAria")}
                  onChange={(event) => setStudentsPerGroup(event.target.value)}
                  className="mt-2.5 w-full accent-brand-900 disabled:opacity-50"
                />
                <p className="mt-1.5 text-xs text-slate-600">{t("admGenStudentsHint")}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">
                  {busy ? t("admGenGenerating") : result ? t("admGenCompleted") : t("admGenWaiting")}
                </span>
                <span className="tabular-nums text-slate-600">
                  {result ? t("admGenEntriesAdded", { count: createdTotal }) : t("admGenEstimate", { count: estimate })}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400 transition-all duration-700",
                    busy ? "w-2/3 animate-pulse" : result ? "w-full" : "w-0",
                  )}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" disabled={busy} onClick={generate}>
                {busy ? (
                  <span className="inline-flex size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v3M18.4 5.6l-2.1 2.1M21 12h-3M18.4 18.4l-2.1-2.1M12 18v3M7.8 16.3l-2.2 2.1M3 12h3M7.8 7.7 5.6 5.6" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                )}
                {busy ? t("admGenGenerating") : t("admGenRun")}
              </Button>
              {error ? (
                <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  {error}
                </span>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader title={t("admGenBaseTitle")} subtitle={t("admGenBaseSubtitle")} />
          <CardBody className="space-y-3">
            {initial.checks.map((check) => {
              const pct =
                check.target > 0
                  ? Math.min(100, Math.round((check.value / check.target) * 100))
                  : check.done
                    ? 100
                    : 0;
              return (
                <div key={check.key} className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-slate-700">{check.label}</span>
                    <Badge tone={check.done ? "green" : "amber"}>{check.done ? t("admGenReady") : t("admGenIncomplete")}</Badge>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2.5">
                    <Progress value={pct} max={100} className="flex-1" />
                    <span className="w-14 text-right text-xs tabular-nums text-slate-600">
                      {check.target > 0 ? `${check.value}/${check.target}` : check.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {result ? (
        <section
          className={cn(
            "transition-all duration-500",
            revealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          )}
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-brand-950">{t("admGenResultTitle")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("admGenResultSubtitle")}</p>
            </div>
            <Badge tone="purple">{t("admGenTotalBadge", { count: createdTotal })}</Badge>
          </div>

          <Card className="relative mb-4 overflow-hidden border-brand-200/70">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400" />
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-brand-950 text-white shadow-lg shadow-brand-900/25">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-500">{t("admGenTotalNew")}</p>
                  <p className="mt-0.5 text-4xl font-semibold tabular-nums tracking-tight text-brand-950">
                    {createdTotal}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="green">{t("admGenSuccess")}</Badge>
                <Badge tone="slate">
                  {t("admGenResourceTypes", { count: resultItems.filter((item) => item.value > 0).length })}
                </Badge>
              </div>
            </CardBody>
          </Card>

          <Card className="relative mb-4 overflow-hidden border-amber-200/70 bg-amber-50/40">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 via-gold-400 to-amber-500" />
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-gold-500 text-white shadow-lg shadow-gold-500/25">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2.5" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-500">{t("admGenTempPassword")}</p>
                  <p className="mt-0.5 font-mono text-xl font-semibold tracking-tight text-brand-950">
                    {result.password}
                  </p>
                </div>
              </div>
              <Badge tone="amber">{t("admGenShownOnce")}</Badge>
            </CardBody>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {resultItems.map((item, index) => (
              <div
                key={item.key}
                className={cn(
                  "transition-all duration-500",
                  revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                )}
                style={{ transitionDelay: `${index * 45}ms` }}
              >
                <Card className="group relative h-full overflow-hidden p-5 transition-shadow duration-200 hover:shadow-lift">
                  <span className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", item.tone)} />
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-200 group-hover:scale-105",
                        item.tone,
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="text-2xl font-semibold tabular-nums tracking-tight text-brand-950">
                      {item.value}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">{t(item.label)}</p>
                  <p className="text-xs text-slate-600">{t(item.hint)}</p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", item.tone)}
                      style={{ width: revealed ? `${item.share}%` : "0%" }}
                    />
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
