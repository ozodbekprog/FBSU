export type JournalStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "SUSPICIOUS";

export type JournalStudent = {
  id: string;
  name: string;
  avatarUrl: string | null;
  subGroup: string | null;
};

export type JournalSummaryRow = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  suspicious: number;
  total: number;
  percent: number;
  eligible: boolean;
};

export type JournalDateTotal = {
  date: string;
  attended: number;
  total: number;
};

export type JournalData = {
  students: JournalStudent[];
  dates: string[];
  records: Record<string, Record<string, JournalStatus>>;
  summary: Record<string, JournalSummaryRow>;
  dateTotals: JournalDateTotal[];
};

export const JOURNAL_MIN_PERCENT = 80;

export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name.trim();
  const last = parts[parts.length - 1];
  return `${parts.slice(0, -1).join(" ")} ${last.charAt(0).toUpperCase()}.`;
}

export const JOURNAL_STATUS_ORDER: JournalStatus[] = ["PRESENT", "SUSPICIOUS", "LATE", "EXCUSED", "ABSENT"];

export const JOURNAL_STATUS_STYLE: Record<JournalStatus, { chip: string; badge: string }> = {
  PRESENT: {
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
    badge: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
  },
  ABSENT: {
    chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80",
    badge: "bg-rose-500 text-white shadow-sm shadow-rose-500/30",
  },
  LATE: {
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80",
    badge: "bg-amber-500 text-white shadow-sm shadow-amber-500/30",
  },
  EXCUSED: {
    chip: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80",
    badge: "bg-slate-400 text-white shadow-sm shadow-slate-400/30",
  },
  SUSPICIOUS: {
    chip: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/80",
    badge: "bg-violet-500 text-white shadow-sm shadow-violet-500/30",
  },
};

export const JOURNAL_STATUS_LABEL_KEYS = {
  PRESENT: "schJournalPresent",
  ABSENT: "schJournalAbsent",
  LATE: "schJournalLate",
  EXCUSED: "schJournalExcused",
  SUSPICIOUS: "schJournalSuspicious",
} as const;

export const JOURNAL_STATUS_SHORT_KEYS = {
  PRESENT: "schShortPresent",
  ABSENT: "schShortAbsent",
  LATE: "schShortLate",
  EXCUSED: "schShortExcused",
  SUSPICIOUS: "schShortSuspicious",
} as const;

export function journalDateParts(iso: string, weekdays: readonly string[]) {
  const date = new Date(`${iso}T00:00:00.000Z`);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return { label: `${day}.${month}`, weekday: weekdays[date.getUTCDay()] ?? "" };
}

export function journalMonthKey(iso: string) {
  return iso.slice(0, 7);
}

export function journalMonthLabel(key: string, months: readonly string[]) {
  const [year, month] = key.split("-");
  const index = Number(month) - 1;
  const name = months[index] ?? month;
  return `${name} ${year}`;
}

export function journalMonthKeys(dates: string[]) {
  const keys: string[] = [];
  for (const date of dates) {
    const key = journalMonthKey(date);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}
