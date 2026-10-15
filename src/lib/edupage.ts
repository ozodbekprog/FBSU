import { unstable_cache } from "next/cache";

const DEFAULT_BASE_URL = "https://ttpu.edupage.org";
const GS_HASH = "00000000";
const REQUEST_TIMEOUT_MS = 20_000;

export const EDUPAGE_CACHE_TAG = "edupage-timetable";
export const EDUPAGE_REVALIDATE_SECONDS = 900;

export const EDU_PAGE_SOURCE = "edupage";

export type EduPagePeriod = { period: number; start: string | null; end: string | null };

export type EduPageClass = { id: string; name: string; lessonCount: number };

export type EduPageTeacher = { id: string; name: string; display: string };

export type EduPageRoom = { id: string; name: string };

export type EduPageSubject = { name: string; color: string | null };

export type EduPageLesson = {
  id: string;
  classId: string;
  className: string;
  dayOfWeek: number;
  slot: number;
  subject: string;
  subjectRaw: string;
  subjectShort: string;
  color: string | null;
  lessonType: string | null;
  teacher: string | null;
  teacherRaw: string | null;
  room: string | null;
  subGroup: string | null;
  parity: "odd" | "even" | null;
};

export type EduPageTimetable = {
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  ttNum: string;
  year: number;
  label: string;
  dateFrom: string | null;
  validity: string | null;
  periods: EduPagePeriod[];
  days: string[];
  classes: EduPageClass[];
  teachers: EduPageTeacher[];
  rooms: EduPageRoom[];
  subjects: EduPageSubject[];
  lessons: EduPageLesson[];
};

export type EduPageClassTimetable = Omit<EduPageTimetable, "lessons" | "classes" | "teachers" | "rooms" | "subjects"> & {
  className: string;
  classId: string;
  lessons: EduPageLesson[];
};

type RawRow = Record<string, unknown>;
type RawTable = { id: string; data_rows?: RawRow[] };

type RegularData = { dbiAccessorRes?: { tables?: RawTable[] } };

type ViewerData = {
  regular?: {
    default_num?: string;
    timetables?: { tt_num?: string; year?: number; text?: string; datefrom?: string; hidden?: boolean }[];
  };
};

export function edupageBaseUrl(): string {
  const configured = process.env.EDUPAGE_BASE_URL?.trim();
  return (configured && configured.length > 0 ? configured : DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function fieldText(row: RawRow | undefined, key: string): string {
  const value = row?.[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function fieldList(row: RawRow | undefined, key: string): string[] {
  const value = row?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 600;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function edupageRpc<T>(file: string, func: string, args: unknown[]): Promise<T> {
  const base = edupageBaseUrl();
  const url = `${base}/timetable/server/${file}.js?__func=${func}`;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          Referer: `${base}/timetable/`,
        },
        body: JSON.stringify({ __args: args, __gsh: GS_HASH }),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.status >= 500) {
        throw new Error(`EduPage javob bermadi (HTTP ${response.status})`);
      }
      if (!response.ok) {
        throw new Error(`EduPage so'rovi rad etildi (HTTP ${response.status})`);
      }

      const payload = (await response.json()) as { r?: T; e?: string; em?: string };
      if (payload.e) throw new Error(`EduPage xatosi: ${payload.em ?? payload.e}`);
      if (!payload.r) throw new Error("EduPage bo'sh javob qaytardi");
      return payload.r;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  const message = lastError instanceof Error ? lastError.message : "noma'lum xato";
  throw new Error(`EduPage bilan aloqa xatosi: ${message}`);
}

const SUBJECT_TYPE_PATTERN = /\(([a-z]{2,10})\)\s*$/i;

const LESSON_TYPE_LABELS: Record<string, string> = {
  lec: "Ma'ruza",
  prac: "Amaliy",
  lab: "Laboratoriya",
  sem: "Seminar",
  tut: "Tutorlik",
};

function splitSubjectType(raw: string): { subject: string; lessonType: string | null } {
  const match = SUBJECT_TYPE_PATTERN.exec(raw);
  if (!match) return { subject: raw.trim(), lessonType: null };
  const code = (match[1] ?? "").toLowerCase();
  const subject = raw.slice(0, match.index).trim();
  const lessonType = LESSON_TYPE_LABELS[code] ?? null;
  if (!subject || !lessonType) return { subject: raw.trim(), lessonType: null };
  return { subject, lessonType };
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s'’-])([a-zа-яё])/g, (_, prefix: string, letter: string) => prefix + letter.toUpperCase());
}

function nameTokens(value: string): string[] {
  return value
    .split(/[.,]+|\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function formatTeacherName(raw: string): string {
  const tokens = nameTokens(raw);
  if (tokens.length === 0) return raw.trim();
  if (tokens.length === 1) return titleCase(tokens[0] ?? "");
  const surname = titleCase(tokens[0] ?? "");
  const initials = tokens
    .slice(1)
    .map((token) => `${(token[0] ?? "").toUpperCase()}.`)
    .join(" ");
  return `${initials} ${surname}`;
}

export function teacherMatchKey(raw: string): string {
  const tokens = nameTokens(raw).map((token) => token.toUpperCase());
  if (tokens.length === 0) return "";
  const compact = raw.replace(/\./g, " ").split(/\s+/).filter((token) => token.length > 0);
  const looksShortForm = raw.includes(".") && tokens.length >= 2;
  const surname = looksShortForm ? tokens[tokens.length - 1] ?? "" : tokens[0] ?? "";
  const givenRaw = looksShortForm
    ? compact.slice(0, -1).map((token) => token.replace(/[^A-Za-z]/g, "")).join("")
    : (compact[1] ?? "").slice(0, 1);
  const initials = givenRaw.toUpperCase();
  return `${surname}|${initials}`;
}

export function teacherKeyMatches(appKey: string, eduKey: string): boolean {
  const [appSurname, appInitials] = appKey.split("|");
  const [eduSurname, eduInitials] = eduKey.split("|");
  if (!appSurname || !eduSurname || appSurname !== eduSurname) return false;
  if (!appInitials || !eduInitials) return false;
  return appInitials.startsWith(eduInitials) || eduInitials.startsWith(appInitials);
}

export function teacherGivenKey(raw: string): string {
  const compact = raw.replace(/\./g, " ").split(/\s+/).filter((token) => token.length > 0);
  if (compact.length < 2 || raw.includes(".")) return "";
  const given = (compact[1] ?? "").toUpperCase();
  if (!given) return "";
  return `${given}|${given.slice(0, 1)}`;
}

export function staffGivenKey(raw: string): string {
  const compact = raw.replace(/\./g, " ").split(/\s+/).filter((token) => token.length > 0);
  if (compact.length < 2) return "";
  if (raw.includes(".")) {
    const given = (compact[compact.length - 1] ?? "").toUpperCase();
    const initials = compact
      .slice(0, -1)
      .join("")
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase();
    return given ? `${given}|${initials}` : "";
  }
  const given = (compact[1] ?? "").toUpperCase();
  if (!given) return "";
  return `${given}|${given.slice(0, 1)}`;
}

export function normalizeClassName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findEduPageClass(
  classes: EduPageClass[],
  names: (string | null | undefined)[],
): EduPageClass | null {
  for (const name of names) {
    if (!name) continue;
    const wanted = normalizeClassName(name);
    const matched = classes.find((item) => normalizeClassName(item.name) === wanted);
    if (matched) return matched;
  }
  return null;
}

function weeksParity(weeks: string): "odd" | "even" | null {
  const active = [...weeks].reduce<number[]>((acc, char, index) => {
    if (char === "1") acc.push(index);
    return acc;
  }, []);
  if (weeks.length < 2 || active.length !== 1) return null;
  const index = active[0] ?? 0;
  if (index > 1) return null;
  return index === 0 ? "odd" : "even";
}

function dayIndexes(days: string): number[] {
  return [...days].reduce<number[]>((acc, char, index) => {
    if (char === "1") acc.push(index);
    return acc;
  }, []);
}

function pickTimetable(data: ViewerData) {
  const list = (data.regular?.timetables ?? []).filter((item) => item.hidden !== true);
  const fallback = list[list.length - 1];
  const preferred = list.find((item) => item.tt_num && item.tt_num === data.regular?.default_num);
  const chosen = preferred ?? fallback;
  if (!chosen?.tt_num) {
    throw new Error("EduPage'da ommaviy dars jadvali topilmadi");
  }
  return chosen;
}

export async function fetchEduPageTimetable(): Promise<EduPageTimetable> {
  const base = edupageBaseUrl();
  const viewer = await edupageRpc<ViewerData>("ttviewer", "getTTViewerData", [null, new Date().getFullYear()]);
  const chosen = pickTimetable(viewer);
  const raw = await edupageRpc<RegularData>("regulartt", "regularttGetData", [null, chosen.tt_num]);

  const tables = new Map<string, RawRow[]>();
  for (const table of raw.dbiAccessorRes?.tables ?? []) {
    tables.set(table.id, table.data_rows ?? []);
  }
  const rows = (id: string) => tables.get(id) ?? [];

  const subjectById = new Map<string, { name: string; short: string; color: string | null }>();
  for (const row of rows("subjects")) {
    const id = fieldText(row, "id");
    if (!id) continue;
    subjectById.set(id, {
      name: fieldText(row, "name"),
      short: fieldText(row, "short"),
      color: fieldText(row, "color") || null,
    });
  }

  const teacherById = new Map<string, string>();
  for (const row of rows("teachers")) {
    const id = fieldText(row, "id");
    const name = fieldText(row, "name");
    if (id && name) teacherById.set(id, name);
  }

  const roomById = new Map<string, string>();
  for (const row of rows("classrooms")) {
    const id = fieldText(row, "id");
    const name = fieldText(row, "name");
    if (id && name) roomById.set(id, name);
  }

  const groupById = new Map<string, { name: string; classId: string }>();
  for (const row of rows("groups")) {
    const id = fieldText(row, "id");
    if (!id) continue;
    groupById.set(id, { name: fieldText(row, "name"), classId: fieldText(row, "classid") });
  }

  const lessonById = new Map<
    string,
    { subjectId: string; teacherIds: string[]; classIds: string[]; groupIds: string[] }
  >();
  for (const row of rows("lessons")) {
    const id = fieldText(row, "id");
    if (!id) continue;
    lessonById.set(id, {
      subjectId: fieldText(row, "subjectid"),
      teacherIds: fieldList(row, "teacherids"),
      classIds: fieldList(row, "classids"),
      groupIds: fieldList(row, "groupids"),
    });
  }

  const classNames = new Map<string, string>();
  for (const row of rows("classes")) {
    const id = fieldText(row, "id");
    const name = fieldText(row, "name");
    if (id && name) classNames.set(id, name);
  }

  const periods: EduPagePeriod[] = rows("periods")
    .map((row) => ({
      period: Number(fieldText(row, "period")),
      start: fieldText(row, "starttime") || null,
      end: fieldText(row, "endtime") || null,
    }))
    .filter((item) => Number.isFinite(item.period) && item.period > 0)
    .sort((a, b) => a.period - b.period);

  const days = rows("days").map((row) => fieldText(row, "name"));

  const teacherList: EduPageTeacher[] = [...teacherById.entries()]
    .map(([id, name]) => ({ id, name, display: formatTeacherName(name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const roomList: EduPageRoom[] = [...roomById.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const subjectCatalog = new Map<string, EduPageSubject>();
  for (const [id, subject] of subjectById) {
    if (!id || !subject.name) continue;
    const base = splitSubjectType(subject.name).subject;
    const key = normalizeClassName(base);
    if (!key || subjectCatalog.has(key)) continue;
    subjectCatalog.set(key, { name: base, color: subject.color });
  }
  const subjectList = [...subjectCatalog.values()].sort((a, b) => a.name.localeCompare(b.name));

  const lessons: EduPageLesson[] = [];
  const lessonCountByClass = new Map<string, number>();

  for (const card of rows("cards")) {
    const cardId = fieldText(card, "id");
    const slot = Number(fieldText(card, "period"));
    if (!cardId || !Number.isFinite(slot) || slot <= 0) continue;

    const lesson = lessonById.get(fieldText(card, "lessonid"));
    if (!lesson) continue;

    const subjectRef = subjectById.get(lesson.subjectId);
    const subjectRaw = subjectRef?.name ?? "";
    if (!subjectRaw) continue;
    const { subject, lessonType } = splitSubjectType(subjectRaw);

    const teacherNames = lesson.teacherIds
      .map((id) => teacherById.get(id) ?? "")
      .filter((name) => name.length > 0);
    const teachers = teacherNames.map((name) => formatTeacherName(name));

    const rooms = fieldList(card, "classroomids")
      .map((id) => roomById.get(id) ?? "")
      .filter((name) => name.length > 0);

    const parity = weeksParity(fieldText(card, "weeks"));
    const dayList = dayIndexes(fieldText(card, "days"));

    for (const classId of lesson.classIds) {
      const className = classNames.get(classId);
      if (!className) continue;

      const subGroups = lesson.groupIds
        .map((id) => groupById.get(id))
        .filter((group): group is { name: string; classId: string } => Boolean(group))
        .filter((group) => group.classId === classId && group.name.toLowerCase() !== "entire class")
        .map((group) => group.name);

      lessonCountByClass.set(classId, (lessonCountByClass.get(classId) ?? 0) + dayList.length);

      for (const dayIndex of dayList) {
        lessons.push({
          id: `${cardId}:${classId}:${dayIndex}`,
          classId,
          className,
          dayOfWeek: dayIndex + 1,
          slot,
          subject,
          subjectRaw,
          subjectShort: subjectRef?.short ?? subject,
          color: subjectRef?.color ?? null,
          lessonType,
          teacher: teachers.length > 0 ? teachers.join(", ") : null,
          teacherRaw: teacherNames.length > 0 ? teacherNames.join(", ") : null,
          room: rooms.length > 0 ? rooms.join(", ") : null,
          subGroup: subGroups.length > 0 ? [...new Set(subGroups)].join(", ") : null,
          parity,
        });
      }
    }
  }

  const classes: EduPageClass[] = [...classNames.entries()]
    .map(([id, name]) => ({ id, name, lessonCount: lessonCountByClass.get(id) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const settings = rows("globals")[0];
  const validity = settings ? fieldText(settings, "tt_datefrom") : "";

  lessons.sort(
    (a, b) =>
      a.className.localeCompare(b.className) ||
      a.dayOfWeek - b.dayOfWeek ||
      a.slot - b.slot ||
      a.subject.localeCompare(b.subject),
  );

  return {
    source: base,
    sourceUrl: `${base}/timetable/`,
    fetchedAt: new Date().toISOString(),
    ttNum: chosen.tt_num ?? "",
    year: typeof chosen.year === "number" ? chosen.year : new Date().getFullYear(),
    label: chosen.text?.trim() ?? "",
    dateFrom: chosen.datefrom ?? null,
    validity: validity || null,
    periods,
    days,
    classes,
    teachers: teacherList,
    rooms: roomList,
    subjects: subjectList,
    lessons,
  };
}

export const getEduPageTimetable = unstable_cache(fetchEduPageTimetable, ["edupage-timetable"], {
  revalidate: EDUPAGE_REVALIDATE_SECONDS,
  tags: [EDUPAGE_CACHE_TAG],
});

export async function getEduPageClassTimetable(className?: string | null): Promise<EduPageClassTimetable> {
  const timetable = await getEduPageTimetable();
  const wanted = className?.trim().toLowerCase();
  const target =
    (wanted ? timetable.classes.find((item) => item.name.toLowerCase() === wanted) : undefined) ??
    timetable.classes[0];

  if (!target) throw new Error("EduPage sinflari topilmadi");

  return {
    source: timetable.source,
    sourceUrl: timetable.sourceUrl,
    fetchedAt: timetable.fetchedAt,
    ttNum: timetable.ttNum,
    year: timetable.year,
    label: timetable.label,
    dateFrom: timetable.dateFrom,
    validity: timetable.validity,
    periods: timetable.periods,
    days: timetable.days,
    className: target.name,
    classId: target.id,
    lessons: timetable.lessons.filter((lesson) => lesson.classId === target.id),
  };
}
