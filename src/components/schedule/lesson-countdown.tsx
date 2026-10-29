"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function tashkentNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  const weekday = WEEKDAY_INDEX[map.weekday ?? "Mon"] ?? 1;
  const hours = Number(map.hour ?? "0") % 24;
  const minutes = Number(map.minute ?? "0");
  return { weekday, totalMinutes: hours * 60 + minutes };
}

function parseTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function LessonCountdown({
  dayOfWeek,
  start,
  end,
  variant = "chip",
}: {
  dayOfWeek: number;
  start: string;
  end: string;
  variant?: "chip" | "banner";
}) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => tashkentNow());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(tashkentNow()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (now.weekday !== dayOfWeek % 7) return null;

  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  const minutes = now.totalMinutes;

  let tone: "upcoming" | "ongoing" | "ended";
  let text: string;
  if (minutes < startMinutes) {
    tone = "upcoming";
    const diff = startMinutes - minutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    const human = [hours > 0 ? `${hours} ${t("schLessonHourUnit")}` : null, mins > 0 ? `${mins} ${t("schLessonMinuteUnit")}` : null]
      .filter(Boolean)
      .join(" ");
    text = t("schLessonStartsIn").replace("{time}", human || `0 ${t("schLessonMinuteUnit")}`);
  } else if (minutes <= endMinutes) {
    tone = "ongoing";
    text = t("schLessonOngoing");
  } else {
    tone = "ended";
    text = t("schLessonEnded");
  }

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium",
          tone === "upcoming" && "border-brand-100 bg-brand-50/70 text-brand-800",
          tone === "ongoing" && "border-emerald-100 bg-emerald-50/70 text-emerald-800",
          tone === "ended" && "border-slate-200 bg-slate-50 text-slate-600",
        )}
      >
        <span
          className={cn(
            "relative flex size-2.5 shrink-0",
            tone === "ongoing" ? "" : "opacity-80",
          )}
        >
          {tone === "ongoing" ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          ) : null}
          <span
            className={cn(
              "relative inline-flex size-2.5 rounded-full",
              tone === "upcoming" && "bg-brand-500",
              tone === "ongoing" && "bg-emerald-500",
              tone === "ended" && "bg-slate-400",
            )}
          />
        </span>
        {text}
        <span className="ml-auto hidden text-xs font-normal text-slate-500 sm:block">
          {start}–{end}
        </span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium",
        tone === "upcoming" && "text-brand-700",
        tone === "ongoing" && "text-emerald-700",
        tone === "ended" && "text-slate-500",
      )}
    >
      <span
        className={cn(
          "inline-flex size-1.5 rounded-full",
          tone === "upcoming" && "bg-brand-500",
          tone === "ongoing" && "bg-emerald-500",
          tone === "ended" && "bg-slate-300",
        )}
      />
      {text}
    </span>
  );
}
