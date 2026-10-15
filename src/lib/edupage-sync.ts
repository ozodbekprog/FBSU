import { prisma } from "@/lib/prisma";
import {
  EDU_PAGE_SOURCE,
  fetchEduPageTimetable,
  findEduPageClass,
  normalizeClassName,
  staffGivenKey,
  teacherGivenKey,
  teacherKeyMatches,
  teacherMatchKey,
  type EduPageLesson,
} from "@/lib/edupage";

const MAX_REPORTED = 25;

export type EduPageSyncResult = {
  ttNum: string;
  label: string;
  classesTotal: number;
  groupsTotal: number;
  groupsSynced: string[];
  groupsWithoutClass: string[];
  classesWithoutGroup: string[];
  lessonsImported: number;
  created: number;
  updated: number;
  removed: number;
  teachersLinked: number;
  subjectsLinked: number;
};

type IncomingEntry = {
  groupId: string;
  dayOfWeek: number;
  slot: number;
  subject: string;
  subjectId: string | null;
  lessonType: string | null;
  teacher: string | null;
  teacherId: string | null;
  room: string | null;
  parity: string | null;
  subGroup: string | null;
  source: string;
  externalId: string;
  status: "NORMAL";
  approval: "APPROVED";
};

function entryDiffers(existing: Record<string, unknown>, incoming: IncomingEntry): boolean {
  const keys: (keyof IncomingEntry)[] = [
    "dayOfWeek",
    "slot",
    "subject",
    "subjectId",
    "lessonType",
    "teacher",
    "teacherId",
    "room",
    "parity",
    "subGroup",
  ];
  return keys.some((key) => (existing[key] ?? null) !== (incoming[key] ?? null));
}

export async function syncEduPageSchedule(): Promise<EduPageSyncResult> {
  const timetable = await fetchEduPageTimetable();

  const groups = await prisma.group.findMany({
    select: { id: true, name: true, edupageName: true },
    orderBy: { name: "asc" },
  });

  const groupsSynced: string[] = [];
  const groupsWithoutClass: string[] = [];
  const groupByClassId = new Map<string, string>();

  for (const group of groups) {
    const matched = findEduPageClass(timetable.classes, [group.edupageName, group.name]);
    if (!matched || groupByClassId.has(matched.id)) {
      groupsWithoutClass.push(group.name);
      continue;
    }
    groupByClassId.set(matched.id, group.id);
    groupsSynced.push(`${group.name} ← ${matched.name}`);
  }

  const syncedClassIds = new Set(groupByClassId.keys());
  const classesWithoutGroup = timetable.classes
    .filter((item) => !syncedClassIds.has(item.id) && item.lessonCount > 0)
    .map((item) => item.name);

  const staff = await prisma.user.findMany({
    where: { isActive: true, role: { notIn: ["STUDENT", "OTA_ONA"] } },
    select: { id: true, name: true },
  });

  const staffByKey = new Map<string, string[]>();
  const staffByGiven = new Map<string, string[]>();
  for (const member of staff) {
    const key = teacherMatchKey(member.name);
    if (key) {
      const list = staffByKey.get(key) ?? [];
      list.push(member.id);
      staffByKey.set(key, list);
    }
    const givenKey = staffGivenKey(member.name);
    if (givenKey) {
      const list = staffByGiven.get(givenKey) ?? [];
      list.push(member.id);
      staffByGiven.set(givenKey, list);
    }
  }

  const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
  const subjectByName = new Map(subjects.map((item) => [normalizeClassName(item.name), item.id]));

  const linkedTeacherIds = new Set<string>();
  let subjectsLinked = 0;

  function uniqueMatch(map: Map<string, string[]>, eduKey: string): string | null {
    if (!eduKey.endsWith("|")) {
      for (const [appKey, ids] of map) {
        if (ids.length !== 1) continue;
        if (teacherKeyMatches(appKey, eduKey)) return ids[0] ?? null;
      }
    }
    return null;
  }

  function matchTeacher(raw: string | null): string | null {
    if (!raw) return null;
    for (const candidate of raw.split(",").map((item) => item.trim()).filter(Boolean)) {
      const matched =
        uniqueMatch(staffByKey, teacherMatchKey(candidate)) ??
        uniqueMatch(staffByGiven, teacherGivenKey(candidate));
      if (matched) {
        linkedTeacherIds.add(matched);
        return matched;
      }
    }
    return null;
  }

  function matchSubject(lesson: EduPageLesson): string | null {
    for (const candidate of [lesson.subject, lesson.subjectRaw, lesson.subjectShort]) {
      const id = subjectByName.get(normalizeClassName(candidate));
      if (id) {
        subjectsLinked += 1;
        return id;
      }
    }
    return null;
  }

  const incoming: IncomingEntry[] = [];
  const seen = new Set<string>();

  for (const lesson of timetable.lessons) {
    const groupId = groupByClassId.get(lesson.classId);
    if (!groupId || seen.has(lesson.id)) continue;
    seen.add(lesson.id);
    incoming.push({
      groupId,
      dayOfWeek: lesson.dayOfWeek,
      slot: lesson.slot,
      subject: lesson.subject.slice(0, 200),
      subjectId: matchSubject(lesson),
      lessonType: lesson.lessonType,
      teacher: lesson.teacher ? lesson.teacher.slice(0, 200) : null,
      teacherId: matchTeacher(lesson.teacherRaw ?? lesson.teacher),
      room: lesson.room ? lesson.room.slice(0, 100) : null,
      parity: lesson.parity,
      subGroup: lesson.subGroup ? lesson.subGroup.slice(0, 20) : null,
      source: EDU_PAGE_SOURCE,
      externalId: lesson.id,
      status: "NORMAL",
      approval: "APPROVED",
    });
  }

  const groupIds = [...new Set(incoming.map((entry) => entry.groupId))];
  const existing =
    groupIds.length === 0
      ? []
      : await prisma.scheduleEntry.findMany({
          where: { source: EDU_PAGE_SOURCE, groupId: { in: groupIds } },
          select: {
            id: true,
            externalId: true,
            groupId: true,
            dayOfWeek: true,
            slot: true,
            subject: true,
            subjectId: true,
            lessonType: true,
            teacher: true,
            teacherId: true,
            room: true,
            parity: true,
            subGroup: true,
          },
        });

  const existingByExternalId = new Map(existing.map((row) => [row.externalId ?? "", row]));
  const incomingIds = new Set(incoming.map((entry) => entry.externalId));

  const toCreate: IncomingEntry[] = [];
  for (const entry of incoming) {
    if (!existingByExternalId.has(entry.externalId)) toCreate.push(entry);
  }

  const updates: { id: string; data: Omit<IncomingEntry, "source" | "externalId"> }[] = [];
  for (const entry of incoming) {
    const row = existingByExternalId.get(entry.externalId);
    if (!row) continue;
    if (entryDiffers(row, entry)) {
      updates.push({
        id: row.id,
        data: {
          groupId: entry.groupId,
          dayOfWeek: entry.dayOfWeek,
          slot: entry.slot,
          subject: entry.subject,
          subjectId: entry.subjectId,
          lessonType: entry.lessonType,
          teacher: entry.teacher,
          teacherId: entry.teacherId,
          room: entry.room,
          parity: entry.parity,
          subGroup: entry.subGroup,
          status: entry.status,
          approval: entry.approval,
        },
      });
    }
  }

  const removals = existing.filter((row) => !row.externalId || !incomingIds.has(row.externalId)).map((row) => row.id);

  if (toCreate.length > 0) {
    await prisma.scheduleEntry.createMany({ data: toCreate });
  }
  if (updates.length > 0) {
    await prisma.$transaction(updates.map((item) => prisma.scheduleEntry.update({ where: { id: item.id }, data: item.data })));
  }
  if (removals.length > 0) {
    await prisma.scheduleEntry.deleteMany({ where: { id: { in: removals } } });
  }

  await writeEduPageSyncState({
    at: new Date().toISOString(),
    label: timetable.label,
    lessons: incoming.length,
  });

  return {
    ttNum: timetable.ttNum,
    label: timetable.label,
    classesTotal: timetable.classes.length,
    groupsTotal: groups.length,
    groupsSynced,
    groupsWithoutClass: groupsWithoutClass.slice(0, MAX_REPORTED),
    classesWithoutGroup: classesWithoutGroup.slice(0, MAX_REPORTED),
    lessonsImported: incoming.length,
    created: toCreate.length,
    updated: updates.length,
    removed: removals.length,
    teachersLinked: linkedTeacherIds.size,
    subjectsLinked,
  };
}

const SYNC_STATE_KEY = "edupage:last-sync";
const AUTO_SYNC_MAX_AGE_MINUTES = 30;
const AUTO_SYNC_MIN_GAP_MS = 10 * 60 * 1000;

let lastAutoSyncAttempt = 0;

export type EduPageSyncState = {
  at: string | null;
  label: string | null;
  lessons: number;
};

export async function readEduPageSyncState(): Promise<EduPageSyncState> {
  const row = await prisma.appSetting.findUnique({ where: { key: SYNC_STATE_KEY } });
  const value = row?.value as { at?: unknown; label?: unknown; lessons?: unknown } | null | undefined;
  return {
    at: typeof value?.at === "string" ? value.at : null,
    label: typeof value?.label === "string" ? value.label : null,
    lessons: typeof value?.lessons === "number" ? value.lessons : 0,
  };
}

async function writeEduPageSyncState(state: EduPageSyncState): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: SYNC_STATE_KEY },
    create: { key: SYNC_STATE_KEY, value: state },
    update: { value: state },
  });
}

export async function isEduPageSyncStale(maxAgeMinutes = AUTO_SYNC_MAX_AGE_MINUTES): Promise<boolean> {
  const state = await readEduPageSyncState();
  if (!state.at) return true;
  const stamp = Date.parse(state.at);
  if (!Number.isFinite(stamp)) return true;
  return Date.now() - stamp > maxAgeMinutes * 60_000;
}

export async function autoSyncEduPageSchedule(maxAgeMinutes = AUTO_SYNC_MAX_AGE_MINUTES): Promise<void> {
  const now = Date.now();
  if (now - lastAutoSyncAttempt < AUTO_SYNC_MIN_GAP_MS) return;
  lastAutoSyncAttempt = now;
  try {
    if (!(await isEduPageSyncStale(maxAgeMinutes))) return;
    await syncEduPageSchedule();
  } catch {
    lastAutoSyncAttempt = 0;
  }
}
