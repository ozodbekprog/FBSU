import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  EDU_PAGE_SOURCE,
  fetchEduPageTimetable,
  findEduPageClass,
  formatTeacherName,
  normalizeClassName,
  staffGivenKey,
  teacherGivenKey,
  teacherMatchKey,
  type EduPageLesson,
  type EduPageTimetable,
} from "@/lib/edupage";

const MAX_REPORTED = 25;
const WRITE_CHUNK = 200;
const SYNC_STATE_KEY = "edupage:last-sync";
const AUTO_SYNC_MAX_AGE_MINUTES = 30;
const AUTO_SYNC_MIN_GAP_MS = 10 * 60 * 1000;
const DEFAULT_SUBJECT_COLOR = "#3f5a9d";

export type EduPageSyncResult = {
  ttNum: string;
  label: string;
  classesTotal: number;
  groupsTotal: number;
  groupsCreated: number;
  groupsSynced: string[];
  groupsWithoutClass: string[];
  classesWithoutGroup: string[];
  teachersTotal: number;
  teachersCreated: number;
  teachersLinked: number;
  subjectsTotal: number;
  subjectsCreated: number;
  subjectsLinked: number;
  roomsTotal: number;
  roomsCreated: number;
  teacherSubjectLinks: number;
  lessonsImported: number;
  created: number;
  updated: number;
  removed: number;
  manualRemoved: number;
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

type NameMatch = { surname: string; initials: string };

function toNameMatch(key: string): NameMatch | null {
  const [surname, initials] = key.split("|");
  if (!surname || !initials) return null;
  return { surname, initials };
}

function matches(a: NameMatch, b: NameMatch): boolean {
  if (a.surname !== b.surname) return false;
  return a.initials.startsWith(b.initials) || b.initials.startsWith(a.initials);
}

function classYear(name: string): number | null {
  const match = /-(\d{2})$/.exec(name.trim());
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? 2000 + year : null;
}

function emailFor(name: string, taken: Set<string>): string {
  const parts = name.split(/[\s.]+/).filter((part) => part.length > 0);
  const initial = (parts[0] ?? "").replace(/[^A-Za-z]/g, "").toLowerCase();
  const surname = (parts[parts.length - 1] ?? "").replace(/[^A-Za-z]/g, "").toLowerCase();
  const base = `${initial}${surname ? `.${surname}` : ""}` || "teacher";
  let candidate = `${base}@ttpu.uz`;
  let index = 1;
  while (taken.has(candidate)) {
    index += 1;
    candidate = `${base}${index}@ttpu.uz`;
  }
  return candidate;
}

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

type StaffIndex = { bySurname: Map<string, NameMatch & { ids: string[] }>; byGiven: Map<string, NameMatch & { ids: string[] }> };

function indexStaff(staff: { id: string; name: string }[]): StaffIndex {
  const bySurname = new Map<string, NameMatch & { ids: string[] }>();
  const byGiven = new Map<string, NameMatch & { ids: string[] }>();

  const push = (map: Map<string, NameMatch & { ids: string[] }>, key: string, id: string) => {
    const parsed = toNameMatch(key);
    if (!parsed) return;
    const entry = map.get(key) ?? { ...parsed, ids: [] };
    entry.ids.push(id);
    map.set(key, entry);
  };

  for (const member of staff) {
    push(bySurname, teacherMatchKey(member.name), member.id);
    push(byGiven, staffGivenKey(member.name), member.id);
  }

  return { bySurname, byGiven };
}

function lookupStaff(index: StaffIndex, eduName: string): string | null {
  const candidates: { map: Map<string, NameMatch & { ids: string[] }>; key: string }[] = [
    { map: index.bySurname, key: teacherMatchKey(eduName) },
    { map: index.byGiven, key: teacherGivenKey(eduName) },
  ];

  for (const candidate of candidates) {
    const parsed = toNameMatch(candidate.key);
    if (!parsed) continue;
    for (const entry of candidate.map.values()) {
      if (entry.ids.length !== 1) continue;
      if (matches(entry, parsed)) return entry.ids[0] ?? null;
    }
  }
  return null;
}

async function ensureGroups(timetable: EduPageTimetable) {
  let groups = await prisma.group.findMany({
    select: { id: true, name: true, edupageName: true },
    orderBy: { name: "asc" },
  });

  const groupsToCreate = timetable.classes.filter(
    (item) =>
      item.lessonCount > 0 &&
      !groups.some(
        (group) =>
          normalizeClassName(group.edupageName || group.name) === normalizeClassName(item.name),
      ),
  );

  if (groupsToCreate.length > 0) {
    await prisma.group.createMany({
      data: groupsToCreate.map((item) => ({
        name: item.name,
        edupageName: item.name,
        year: classYear(item.name),
      })),
      skipDuplicates: true,
    });
    groups = await prisma.group.findMany({
      select: { id: true, name: true, edupageName: true },
      orderBy: { name: "asc" },
    });
  }

  return { groups, groupsCreated: groupsToCreate.length };
}

async function ensureTeachers(timetable: EduPageTimetable) {
  const staff = await prisma.user.findMany({
    where: { isActive: true, role: { notIn: ["STUDENT", "OTA_ONA"] } },
    select: { id: true, name: true },
  });

  const index = indexStaff(staff);
  const missing: { name: string; email: string }[] = [];
  const takenEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((row) => row.email),
  );

  for (const teacher of timetable.teachers) {
    if (lookupStaff(index, teacher.name)) continue;
    const name = teacher.display || formatTeacherName(teacher.name);
    if (!name) continue;
    if (staff.some((member) => member.name === name)) continue;
    const email = emailFor(name, takenEmails);
    takenEmails.add(email);
    missing.push({ name, email });
  }

  if (missing.length > 0) {
    const passwordHash = await bcrypt.hash(randomUUID(), 10);
    for (let index2 = 0; index2 < missing.length; index2 += WRITE_CHUNK) {
      await prisma.user.createMany({
        data: missing.slice(index2, index2 + WRITE_CHUNK).map((item) => ({
          email: item.email,
          name: item.name,
          role: "TEACHER" as const,
          passwordHash,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }
  }

  const allStaff = await prisma.user.findMany({
    where: { isActive: true, role: { notIn: ["STUDENT", "OTA_ONA"] } },
    select: { id: true, name: true },
  });

  return { index: indexStaff(allStaff), created: missing.length };
}

async function ensureSubjects(timetable: EduPageTimetable) {
  const existing = await prisma.subject.findMany({ select: { id: true, name: true } });
  const byName = new Map(existing.map((item) => [normalizeClassName(item.name), item.id]));

  const missing = timetable.subjects.filter((item) => !byName.has(normalizeClassName(item.name)));
  if (missing.length > 0) {
    await prisma.subject.createMany({
      data: missing.map((item) => ({ name: item.name, color: item.color ?? DEFAULT_SUBJECT_COLOR })),
      skipDuplicates: true,
    });
    const created = await prisma.subject.findMany({
      where: { name: { in: missing.map((item) => item.name) } },
      select: { id: true, name: true },
    });
    for (const item of created) byName.set(normalizeClassName(item.name), item.id);
  }

  return { byName, created: missing.length };
}

async function ensureRooms(timetable: EduPageTimetable) {
  const existing = await prisma.room.findMany({ select: { name: true } });
  const known = new Set(existing.map((item) => item.name));
  const missing = timetable.rooms.filter((item) => !known.has(item.name));
  if (missing.length > 0) {
    await prisma.room.createMany({
      data: missing.map((item) => ({ name: item.name.slice(0, 100) })),
      skipDuplicates: true,
    });
  }
  return { created: missing.length, total: timetable.rooms.length };
}

export async function syncEduPageSchedule(): Promise<EduPageSyncResult> {
  const timetable = await fetchEduPageTimetable();

  const { groups, groupsCreated } = await ensureGroups(timetable);

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

  const { index: staffIndex, created: teachersCreated } = await ensureTeachers(timetable);
  const { byName: subjectsByName, created: subjectsCreated } = await ensureSubjects(timetable);
  const { created: roomsCreated, total: roomsTotal } = await ensureRooms(timetable);

  const linkedTeacherIds = new Set<string>();
  const linkedSubjectIds = new Set<string>();

  function matchTeacher(raw: string | null): string | null {
    if (!raw) return null;
    for (const candidate of raw.split(",").map((item) => item.trim()).filter(Boolean)) {
      const matched = lookupStaff(staffIndex, candidate);
      if (matched) {
        linkedTeacherIds.add(matched);
        return matched;
      }
    }
    return null;
  }

  function matchSubject(lesson: EduPageLesson): string | null {
    for (const candidate of [lesson.subject, lesson.subjectRaw, lesson.subjectShort]) {
      const id = subjectsByName.get(normalizeClassName(candidate));
      if (id) {
        linkedSubjectIds.add(id);
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

  const removals = existing
    .filter((row) => !row.externalId || !incomingIds.has(row.externalId))
    .map((row) => row.id);

  for (let index = 0; index < toCreate.length; index += WRITE_CHUNK) {
    await prisma.scheduleEntry.createMany({ data: toCreate.slice(index, index + WRITE_CHUNK) });
  }
  for (let index = 0; index < updates.length; index += WRITE_CHUNK) {
    const chunk = updates.slice(index, index + WRITE_CHUNK);
    await prisma.$transaction(
      chunk.map((item) => prisma.scheduleEntry.update({ where: { id: item.id }, data: item.data })),
    );
  }
  if (removals.length > 0) {
    await prisma.scheduleEntry.deleteMany({ where: { id: { in: removals } } });
  }

  const teacherSubjectPairs = new Map<string, { teacherId: string; subjectId: string }>();
  for (const entry of incoming) {
    if (!entry.teacherId || !entry.subjectId) continue;
    teacherSubjectPairs.set(`${entry.teacherId}:${entry.subjectId}`, {
      teacherId: entry.teacherId,
      subjectId: entry.subjectId,
    });
  }
  const pairs = [...teacherSubjectPairs.values()];
  for (let index = 0; index < pairs.length; index += WRITE_CHUNK) {
    await prisma.teacherSubject.createMany({
      data: pairs.slice(index, index + WRITE_CHUNK),
      skipDuplicates: true,
    });
  }

  const manualRemoved =
    groupIds.length === 0
      ? 0
      : (
          await prisma.scheduleEntry.deleteMany({
            where: { groupId: { in: groupIds }, source: null },
          })
        ).count;

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
    groupsCreated,
    groupsSynced,
    groupsWithoutClass: groupsWithoutClass.slice(0, MAX_REPORTED),
    classesWithoutGroup: classesWithoutGroup.slice(0, MAX_REPORTED),
    teachersTotal: timetable.teachers.length,
    teachersCreated,
    teachersLinked: linkedTeacherIds.size,
    subjectsTotal: timetable.subjects.length,
    subjectsCreated,
    subjectsLinked: linkedSubjectIds.size,
    roomsTotal,
    roomsCreated,
    teacherSubjectLinks: pairs.length,
    lessonsImported: incoming.length,
    created: toCreate.length,
    updated: updates.length,
    removed: removals.length,
    manualRemoved,
  };
}

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

let lastAutoSyncAttempt = 0;

export async function autoSyncEduPageSchedule(
  maxAgeMinutes = AUTO_SYNC_MAX_AGE_MINUTES,
): Promise<void> {
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
