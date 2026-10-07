import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (process.env.CONFIRM_SIMULATE !== "1") {
  console.error("Bu skript bazaga katta hajmda yozadi. CONFIRM_SIMULATE=1 bilan ishga tushiring.");
  process.exit(1);
}

const prisma = new PrismaClient();

let seed = 987654321;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const ri = (min, max) => min + Math.floor(rand() * (max - min + 1));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const DAY = 86400000;
function utcDay(offset) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + offset * DAY);
}
function atHour(day, hour, minute = 0) {
  return new Date(day.getTime() + hour * 3600000 + minute * 60000);
}
function iso(d) {
  return d.toISOString().slice(0, 10);
}

const ORG = [
  {
    faculty: { name: "Kompyuter injiniringi", code: "KI" },
    departments: [
      { name: "Dasturiy injiniring kafedrasi", code: "DI" },
      { name: "Kompyuter tizimlari kafedrasi", code: "KT" },
      { name: "Fundamental fanlar kafedrasi", code: "FF" },
    ],
  },
  {
    faculty: { name: "Mexanika va texnologiyalar", code: "MEX" },
    departments: [
      { name: "Mexanika kafedrasi", code: "MEXD" },
      { name: "Materialshunoslik kafedrasi", code: "MAT" },
    ],
  },
  {
    faculty: { name: "Arxitektura va dizayn", code: "ARX" },
    departments: [
      { name: "Me'morchilik kafedrasi", code: "MEM" },
      { name: "Dizayn kafedrasi", code: "DIZ" },
    ],
  },
  {
    faculty: { name: "Iqtisodiyot va boshqaruv", code: "IQT" },
    departments: [
      { name: "Iqtisodiyot kafedrasi", code: "ECON" },
      { name: "Boshqaruv kafedrasi", code: "MGMT" },
    ],
  },
];

const STAFF = [
  { email: "rektor@ttpu.uz", name: "Sh. Mirzayev", role: "REKTOR" },
  { email: "prorektor-oquv@ttpu.uz", name: "A. Yo'ldoshev", role: "PRO_RECTOR" },
  { email: "prorektor-ilmiy@ttpu.uz", name: "M. Xolmatova", role: "PRO_RECTOR" },
  { email: "prorektor-yoshlar@ttpu.uz", name: "J. Bekmurodov", role: "PRO_RECTOR" },
  { email: "registrator@ttpu.uz", name: "M. Sattorova", role: "REGISTRAR" },
  { email: "dekan-ki@ttpu.uz", name: "B. Rahimov", role: "DEKAN", facultyCode: "KI" },
  { email: "dekan-mex@ttpu.uz", name: "S. Umarov", role: "DEKAN", facultyCode: "MEX" },
  { email: "dekan-arx@ttpu.uz", name: "D. Toshpo'latova", role: "DEKAN", facultyCode: "ARX" },
  { email: "dekan-iqt@ttpu.uz", name: "N. Abdullayeva", role: "DEKAN", facultyCode: "IQT" },
  { email: "kafedra-di@ttpu.uz", name: "J. Xasanov", role: "KAFEDRA_MUDIRI", deptCode: "DI" },
  { email: "kafedra-kt@ttpu.uz", name: "L. Ismoilov", role: "KAFEDRA_MUDIRI", deptCode: "KT" },
  { email: "kafedra-ff@ttpu.uz", name: "R. Yoqubov", role: "KAFEDRA_MUDIRI", deptCode: "FF" },
  { email: "kafedra-mexd@ttpu.uz", name: "R. Sobirov", role: "KAFEDRA_MUDIRI", deptCode: "MEXD" },
  { email: "kafedra-mat@ttpu.uz", name: "T. Nazarov", role: "KAFEDRA_MUDIRI", deptCode: "MAT" },
  { email: "kafedra-mem@ttpu.uz", name: "G. Yusupova", role: "KAFEDRA_MUDIRI", deptCode: "MEM" },
  { email: "kafedra-diz@ttpu.uz", name: "A. Qodirov", role: "KAFEDRA_MUDIRI", deptCode: "DIZ" },
  { email: "kafedra-econ@ttpu.uz", name: "F. Ergashev", role: "KAFEDRA_MUDIRI", deptCode: "ECON" },
  { email: "kafedra-mgmt@ttpu.uz", name: "Z. Karimova", role: "KAFEDRA_MUDIRI", deptCode: "MGMT" },
  { email: "tyutor-1@ttpu.uz", name: "O. Ravshanov", role: "TYUTOR" },
  { email: "tyutor-2@ttpu.uz", name: "K. Aliyeva", role: "TYUTOR" },
  { email: "tyutor-3@ttpu.uz", name: "S. Tosheva", role: "TYUTOR" },
  { email: "buxgalter@ttpu.uz", name: "N. Karimova", role: "XODIM" },
  { email: "moliya@ttpu.uz", name: "M. Ergasheva", role: "XODIM" },
  { email: "kutubxona@ttpu.uz", name: "D. Rasulova", role: "XODIM" },
  { email: "it@ttpu.uz", name: "S. Toshmatov", role: "XODIM" },
  { email: "devonxona@ttpu.uz", name: "G. Umarova", role: "XODIM" },
  { email: "farrosh-1@ttpu.uz", name: "Z. Abdullayeva", role: "XODIM" },
  { email: "farrosh-2@ttpu.uz", name: "X. Norova", role: "XODIM" },
  { email: "qorovul@ttpu.uz", name: "T. Raxmatov", role: "XODIM" },
  { email: "oshxona@ttpu.uz", name: "G. Sattarova", role: "XODIM" },
  { email: "tibbiyot@ttpu.uz", name: "D. Yusupova", role: "XODIM" },
  { email: "psixolog@ttpu.uz", name: "A. Karimova", role: "XODIM" },
  { email: "haydovchi@ttpu.uz", name: "B. Toshev", role: "XODIM" },
  { email: "bogbon@ttpu.uz", name: "I. Nazarov", role: "XODIM" },
];

const TEACHERS = [
  { email: "fizika@ttpu.uz", name: "Fizika o'qituvchisi", dept: "FF" },
  { email: "kimyo@ttpu.uz", name: "Kimyo o'qituvchisi", dept: "FF" },
  { email: "t.prog@ttpu.uz", name: "D. Karimberdiyev", dept: "DI" },
  { email: "t.db@ttpu.uz", name: "M. Isroilova", dept: "DI" },
  { email: "t.web@ttpu.uz", name: "S. Bekmurodov", dept: "DI" },
  { email: "t.os@ttpu.uz", name: "A. Umarov", dept: "KT" },
  { email: "t.math@ttpu.uz", name: "G. Nabiyev", dept: "FF" },
  { email: "t.eng@ttpu.uz", name: "L. Nazarova", dept: "FF" },
  { email: "t.mex@ttpu.uz", name: "V. Sobirov", dept: "MEXD" },
  { email: "t.mat@ttpu.uz", name: "I. Xolmatov", dept: "MAT" },
  { email: "t.arch@ttpu.uz", name: "M. Rashidova", dept: "MEM" },
  { email: "t.diz@ttpu.uz", name: "N. Kamilova", dept: "DIZ" },
  { email: "t.econ@ttpu.uz", name: "B. Salimov", dept: "ECON" },
  { email: "t.mgmt@ttpu.uz", name: "D. Urunova", dept: "MGMT" },
];

const GROUPS_NEW = [
  { name: "AI-2", size: 16, facultyCode: "KI", prefix: "ai2s", curator: "tyutor-1@ttpu.uz" },
  { name: "ME-2", size: 16, facultyCode: "MEX", prefix: "me2s", curator: "tyutor-2@ttpu.uz" },
  { name: "ARX-1", size: 16, facultyCode: "ARX", prefix: "arx1s", curator: "tyutor-3@ttpu.uz" },
  { name: "IQT-1", size: 16, facultyCode: "IQT", prefix: "iqt1s", curator: "tyutor-3@ttpu.uz" },
];

const GROUPS_OLD = [
  { name: "AI-1", facultyCode: "KI", curator: "tyutor-1@ttpu.uz" },
  { name: "ME-1", facultyCode: "MEX", curator: "tyutor-2@ttpu.uz" },
];

const COURSES = [
  { slug: "prog", title: "Dasturlash asoslari", dept: "DI", teacher: "t.prog@ttpu.uz", groups: ["AI-1", "AI-2"], color: "#2563eb", days: [1, 3], slots: [2, 3] },
  { slug: "db", title: "Ma'lumotlar bazasi", dept: "DI", teacher: "t.db@ttpu.uz", groups: ["AI-1", "AI-2"], color: "#0ea5e9", days: [2, 4], slots: [2, 4] },
  { slug: "web", title: "Web texnologiyalar", dept: "DI", teacher: "t.web@ttpu.uz", groups: ["AI-1"], color: "#7c3aed", days: [1, 4], slots: [3, 2] },
  { slug: "os", title: "Operatsion tizimlar", dept: "KT", teacher: "t.os@ttpu.uz", groups: ["AI-2"], color: "#334155", days: [3, 5], slots: [2, 3] },
  { slug: "math", title: "Matematika 1", dept: "FF", teacher: "t.math@ttpu.uz", groups: ["AI-1", "AI-2", "ME-1", "ME-2", "ARX-1", "IQT-1"], color: "#16a34a", days: [1, 3], slots: [1, 2] },
  { slug: "eng", title: "Ingliz tili 1", dept: "FF", teacher: "t.eng@ttpu.uz", groups: ["AI-1", "AI-2", "ME-1", "ME-2", "ARX-1", "IQT-1"], color: "#9333ea", days: [2, 5], slots: [1, 2] },
  { slug: "mech", title: "Nazariy mexanika", dept: "MEXD", teacher: "t.mex@ttpu.uz", groups: ["ME-1", "ME-2"], color: "#dc2626", days: [1, 4], slots: [3, 3] },
  { slug: "mat-sci", title: "Materialshunoslik", dept: "MAT", teacher: "t.mat@ttpu.uz", groups: ["ME-1", "ME-2"], color: "#b45309", days: [2, 5], slots: [3, 4] },
  { slug: "arch", title: "Arxitektura loyihalash", dept: "MEM", teacher: "t.arch@ttpu.uz", groups: ["ARX-1"], color: "#0891b2", days: [2, 4], slots: [1, 5] },
  { slug: "design", title: "Dizayn asoslari", dept: "DIZ", teacher: "t.diz@ttpu.uz", groups: ["ARX-1"], color: "#db2777", days: [1, 5], slots: [4, 3] },
  { slug: "econ", title: "Iqtisodiyot nazariyasi", dept: "ECON", teacher: "t.econ@ttpu.uz", groups: ["IQT-1"], color: "#65a30d", days: [1, 3], slots: [4, 1] },
  { slug: "mgmt", title: "Boshqaruv asoslari", dept: "MGMT", teacher: "t.mgmt@ttpu.uz", groups: ["IQT-1"], color: "#c026d3", days: [2, 4], slots: [4, 2] },
  { slug: "chem", title: "Kimyo", dept: "FF", teacher: "kimyo@ttpu.uz", groups: ["AI-1", "ME-1"], color: "#0d9488", days: [3, 5], slots: [1, 4] },
  { slug: "fizika", title: "Fizika", dept: "FF", teacher: "fizika@ttpu.uz", groups: ["AI-1"], color: "#dc2626", days: [1, 4], slots: [1, 2], existing: true },
];

const ROOMS = ["101", "102", "201", "202", "301", "302", "401", "Fizika lab.", "Kompyuter sinfi"];
const FIRST_NAMES = ["Aziz", "Bekzod", "Dilnoza", "Eldor", "Farrux", "Gulnora", "Hasan", "Iroda", "Jasur", "Kamola", "Lutfulla", "Madina", "Nodir", "Oysha", "Pulat", "Ruxshona", "Sardor", "Tursunoy", "Ulugbek", "Vasila", "Xurshid", "Yulduz", "Zafar", "Zarina", "Shohrux", "Malika", "Islom", "Nilufar", "Abbos", "Sevinch", "Doniyor", "Maftuna", "Sanjar", "Gulchehra", "Temur", "Dildora"];
const LAST_NAMES = ["Qodirov", "Saidova", "Temirov", "Qosimova", "Ergasheva", "Rahimov", "Yusupova", "Sattorov", "Nazarova", "Xolmatov", "Ismoilova", "Karimov", "Abdullayev", "Tosheva", "Umarov", "Salimova", "Bekmurodov", "Rashidova", "Sobirov", "Kamilova", "Urunova", "Mahmudov", "To'rayev", "Aliyeva"];

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const usedCodes = new Set();
function uniqueCode() {
  for (;;) {
    let code = "";
    for (let index = 0; index < 6; index += 1) {
      code += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
    }
    if (!usedCodes.has(code)) {
      usedCodes.add(code);
      return code;
    }
  }
}

function studentFactor(studentId) {
  let hash = 0;
  for (let index = 0; index < studentId.length; index += 1) {
    hash = (hash * 31 + studentId.charCodeAt(index)) >>> 0;
  }
  return 0.72 + (hash % 21) / 100;
}

async function main() {
  const passwordHash = await bcrypt.hash("ttpu1234", 10);
  const started = Date.now();

  console.log("1) Fakultet va kafedralar...");
  const facultyByCode = new Map();
  const deptByCode = new Map();
  for (const item of ORG) {
    const faculty = await prisma.faculty.upsert({
      where: { name: item.faculty.name },
      update: { code: item.faculty.code },
      create: { name: item.faculty.name, code: item.faculty.code },
    });
    facultyByCode.set(item.faculty.code, faculty);
    for (const dept of item.departments) {
      const department = await prisma.department.upsert({
        where: { name: dept.name },
        update: { code: dept.code, facultyId: faculty.id },
        create: { name: dept.name, code: dept.code, facultyId: faculty.id },
      });
      deptByCode.set(dept.code, department);
    }
  }

  console.log("2) Rahbariyat...");
  const userByEmail = new Map();
  for (const staff of STAFF) {
    const facultyId = staff.facultyCode ? facultyByCode.get(staff.facultyCode)?.id : null;
    const dept = staff.deptCode ? deptByCode.get(staff.deptCode) : null;
    const user = await prisma.user.upsert({
      where: { email: staff.email },
      update: {
        name: staff.name,
        role: staff.role,
        facultyId: facultyId ?? dept?.facultyId ?? null,
        departmentId: dept?.id ?? null,
      },
      create: {
        email: staff.email,
        name: staff.name,
        role: staff.role,
        passwordHash,
        facultyId: facultyId ?? dept?.facultyId ?? null,
        departmentId: dept?.id ?? null,
      },
    });
    userByEmail.set(staff.email, user);
  }

  console.log("3) O'qituvchilar...");
  for (const teacher of TEACHERS) {
    const dept = deptByCode.get(teacher.dept);
    const user = await prisma.user.upsert({
      where: { email: teacher.email },
      update: { role: "TEACHER", departmentId: dept?.id ?? null, facultyId: dept?.facultyId ?? null },
      create: {
        email: teacher.email,
        name: teacher.name,
        role: "TEACHER",
        passwordHash,
        departmentId: dept?.id ?? null,
        facultyId: dept?.facultyId ?? null,
      },
    });
    if (teacher.email === "fizika@ttpu.uz" || teacher.email === "kimyo@ttpu.uz") {
      await prisma.user.update({ where: { id: user.id }, data: { name: teacher.name } });
    }
    userByEmail.set(teacher.email, user);
  }

  console.log("4) Guruhlar...");
  const groupByName = new Map();
  for (const group of GROUPS_OLD) {
    const existing = await prisma.group.findUnique({ where: { name: group.name } });
    if (!existing) continue;
    const updated = await prisma.group.update({
      where: { id: existing.id },
      data: {
        year: 2026,
        facultyId: facultyByCode.get(group.facultyCode)?.id ?? null,
        curatorId: userByEmail.get(group.curator)?.id ?? null,
      },
    });
    groupByName.set(group.name, updated);
  }
  for (const group of GROUPS_NEW) {
    const updated = await prisma.group.upsert({
      where: { name: group.name },
      update: {
        year: 2026,
        facultyId: facultyByCode.get(group.facultyCode)?.id ?? null,
        curatorId: userByEmail.get(group.curator)?.id ?? null,
      },
      create: {
        name: group.name,
        year: 2026,
        facultyId: facultyByCode.get(group.facultyCode)?.id ?? null,
        curatorId: userByEmail.get(group.curator)?.id ?? null,
      },
    });
    groupByName.set(group.name, updated);
  }

  console.log("5) Talabalar...");
  const existingEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((user) => user.email),
  );
  const usedNames = new Set();
  const studentRows = [];
  for (const group of GROUPS_NEW) {
    const facultyId = facultyByCode.get(group.facultyCode)?.id ?? null;
    for (let index = 1; index <= group.size; index += 1) {
      const email = `${group.prefix}${String(index).padStart(2, "0")}@ttpu.uz`;
      if (existingEmails.has(email)) continue;
      let name = "";
      for (;;) {
        name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
        if (!usedNames.has(name)) {
          usedNames.add(name);
          break;
        }
      }
      studentRows.push({
        email,
        name,
        role: "STUDENT",
        passwordHash,
        groupId: groupByName.get(group.name)?.id,
        facultyId,
      });
    }
  }
  if (studentRows.length > 0) {
    await prisma.user.createMany({ data: studentRows, skipDuplicates: true });
  }
  const allGroups = await prisma.group.findMany({
    where: { name: { in: [...GROUPS_OLD, ...GROUPS_NEW].map((group) => group.name) } },
    include: { users: { where: { role: "STUDENT" }, select: { id: true } } },
  });
  const groupStudents = new Map(allGroups.map((group) => [group.name, group.users.map((user) => user.id)]));

  console.log("6) Fanlar va o'qituvchi-fan bog'lanishlari...");
  const subjectByName = new Map();
  for (const course of COURSES) {
    const dept = deptByCode.get(course.dept);
    const subject = await prisma.subject.upsert({
      where: { name: course.title },
      update: { departmentId: dept?.id ?? null, color: course.color },
      create: { name: course.title, code: course.dept, color: course.color, departmentId: dept?.id ?? null },
    });
    subjectByName.set(course.title, subject);
    const teacher = userByEmail.get(course.teacher);
    if (teacher) {
      await prisma.teacherSubject.upsert({
        where: { teacherId_subjectId: { teacherId: teacher.id, subjectId: subject.id } },
        update: {},
        create: { teacherId: teacher.id, subjectId: subject.id },
      });
    }
  }

  console.log("7) Kurslar va yozilishlar...");
  const courseRecords = [];
  for (const config of COURSES) {
    const teacher = userByEmail.get(config.teacher);
    const subject = subjectByName.get(config.title);
    const course = await prisma.course.upsert({
      where: { slug: config.slug },
      update: {
        title: config.title,
        teacherId: teacher.id,
        coverColor: config.color,
        isPublished: true,
        subjectId: subject?.id ?? null,
      },
      create: {
        slug: config.slug,
        title: config.title,
        description: `${config.title} — nazariy va amaliy mashg'ulotlar.`,
        teacherId: teacher.id,
        coverColor: config.color,
        isPublished: true,
        subjectId: subject?.id ?? null,
      },
    });
    const studentIds = [...new Set(config.groups.flatMap((name) => groupStudents.get(name) ?? []))];
    await prisma.enrollment.createMany({
      data: studentIds.map((studentId) => ({ courseId: course.id, userId: studentId })),
      skipDuplicates: true,
    });
    courseRecords.push({ config, course, teacherId: teacher.id, studentIds });
  }

  console.log("8) Dars jadvali...");
  const existingSchedule = await prisma.scheduleEntry.findMany({
    select: { groupId: true, subjectId: true },
  });
  const scheduleKeys = new Set(existingSchedule.map((row) => `${row.groupId}|${row.subjectId}`));
  const scheduleRows = [];
  for (const record of courseRecords) {
    if (record.config.existing) continue;
    for (const groupName of record.config.groups) {
      const group = groupByName.get(groupName);
      const subjectId = subjectByName.get(record.config.title)?.id ?? null;
      if (!group || !subjectId) continue;
      const key = `${group.id}|${subjectId}`;
      if (scheduleKeys.has(key)) continue;
      scheduleKeys.add(key);
      for (const [index, dayOfWeek] of record.config.days.entries()) {
        scheduleRows.push({
          groupId: group.id,
          dayOfWeek,
          slot: record.config.slots[index] ?? 2,
          subject: record.config.title,
          subjectId,
          lessonType: index === 0 ? "Ma'ruza" : "Amaliy",
          teacher: userByEmail.get(record.config.teacher)?.name ?? null,
          teacherId: record.teacherId,
          room: pick(ROOMS),
          status: "NORMAL",
          approval: "APPROVED",
        });
      }
    }
  }
  if (scheduleRows.length > 0) {
    await prisma.scheduleEntry.createMany({ data: scheduleRows });
  }

  console.log("9) 2 oylik davomat tarixi...");
  const existingSessions = await prisma.attendanceSession.findMany({ select: { courseId: true, date: true } });
  const sessionKeys = new Set(existingSessions.map((row) => `${row.courseId}|${iso(row.date)}`));
  const existingAttendance = await prisma.attendance.findMany({
    select: { courseId: true, studentId: true, date: true },
  });
  const attendanceKeys = new Set(
    existingAttendance.map((row) => `${row.courseId}|${row.studentId}|${iso(row.date)}`),
  );

  const newSessions = [];
  const newAttendance = [];
  for (const record of courseRecords) {
    for (let offset = -60; offset <= -1; offset += 1) {
      const day = utcDay(offset);
      const dow = day.getUTCDay() === 0 ? 7 : day.getUTCDay();
      if (!record.config.days.includes(dow)) continue;
      const sessionKey = `${record.course.id}|${iso(day)}`;
      if (!sessionKeys.has(sessionKey)) {
        sessionKeys.add(sessionKey);
        newSessions.push({
          courseId: record.course.id,
          date: day,
          code: uniqueCode(),
          expiresAt: atHour(day, 9, 20),
          createdAt: atHour(day, 9, 5),
          finalizedAt: atHour(day, 9, 35),
          createdById: record.teacherId,
          kind: "CHECK_IN",
        });
      }
      for (const studentId of record.studentIds) {
        const key = `${record.course.id}|${studentId}|${iso(day)}`;
        if (attendanceKeys.has(key)) continue;
        attendanceKeys.add(key);
        const factor = studentFactor(studentId);
        const roll = rand();
        let status = "ABSENT";
        let note = "Avtomatik: QR davomatda belgilanmagan";
        let checkOutAt = null;
        if (roll < factor) {
          status = "PRESENT";
          note = chance(0.45) ? "QR orqali · Face ID" : "QR orqali";
          if (chance(0.42)) checkOutAt = atHour(day, 11, 35);
        } else if (roll < factor + 0.05) {
          status = "LATE";
          note = "Kechikdi · QR orqali";
          if (chance(0.5)) checkOutAt = atHour(day, 11, 40);
        } else if (roll < factor + 0.09) {
          status = "LEFT_EARLY";
          note = "Avtomatik: chiqish QR belgilanmagan";
        } else if (roll < factor + 0.12) {
          status = "SUSPICIOUS";
          note = `Shubhali: ${pick(["GEO_FAR", "VPN_SUSPECTED", "IP_SHARED", "IP_GEO_MISMATCH"])}`;
        }
        newAttendance.push({
          courseId: record.course.id,
          studentId,
          date: day,
          status,
          note,
          checkOutAt,
        });
      }
    }
  }
  for (let index = 0; index < newSessions.length; index += 200) {
    await prisma.attendanceSession.createMany({ data: newSessions.slice(index, index + 200), skipDuplicates: true });
  }
  for (let index = 0; index < newAttendance.length; index += 800) {
    await prisma.attendance.createMany({ data: newAttendance.slice(index, index + 800), skipDuplicates: true });
  }
  console.log(`   sessiyalar: +${newSessions.length}, davomat: +${newAttendance.length}`);

  console.log("10) Testlar, topshiriqlar, baholar...");
  const QUIZ_DAYS = [-42, -14];
  const ASSIGN_DAYS = [-45, -32, -16];
  const keyOf = (courseId, title) => `${courseId}|${title}`;

  const existingQuizzes = await prisma.quiz.findMany({ select: { id: true, courseId: true, title: true } });
  const quizKeys = new Set(existingQuizzes.map((quiz) => keyOf(quiz.courseId, quiz.title)));
  const missingQuizzes = [];
  for (const record of courseRecords) {
    for (const [index, offset] of QUIZ_DAYS.entries()) {
      const title = `Test ${index + 1}`;
      if (quizKeys.has(keyOf(record.course.id, title))) continue;
      quizKeys.add(keyOf(record.course.id, title));
      missingQuizzes.push({
        courseId: record.course.id,
        title,
        description: `${record.config.title} — ${title}`,
        dueAt: atHour(utcDay(offset), 23, 59),
        timeLimitMin: 20,
        isPublished: true,
      });
    }
  }
  if (missingQuizzes.length > 0) await prisma.quiz.createMany({ data: missingQuizzes });
  const allQuizzes = await prisma.quiz.findMany({ select: { id: true, courseId: true, title: true, dueAt: true } });
  const quizzesForCourse = new Map();
  for (const quiz of allQuizzes) {
    const list = quizzesForCourse.get(quiz.courseId) ?? [];
    list.push(quiz);
    quizzesForCourse.set(quiz.courseId, list);
  }

  const quizIdsWithQuestions = new Set(
    (await prisma.question.groupBy({ by: ["quizId"], _count: true })).map((row) => row.quizId),
  );
  const questionRows = [];
  for (const record of courseRecords) {
    for (const quiz of quizzesForCourse.get(record.course.id) ?? []) {
      if (quizIdsWithQuestions.has(quiz.id)) continue;
      quizIdsWithQuestions.add(quiz.id);
      for (const n of [1, 2, 3, 4]) {
        questionRows.push({
          quizId: quiz.id,
          text: `${record.config.title}: nazariy savol ${n}`,
          type: "SINGLE",
          options: ["A variant", "B variant", "C variant", "D variant"],
          correct: ["A variant"],
          points: 1,
          position: n,
        });
      }
    }
  }
  if (questionRows.length > 0) await prisma.question.createMany({ data: questionRows });

  const attemptKeys = new Set(
    (await prisma.quizAttempt.findMany({ select: { quizId: true, studentId: true } })).map(
      (row) => `${row.quizId}|${row.studentId}`,
    ),
  );
  const attemptRows = [];
  for (const record of courseRecords) {
    for (const quiz of quizzesForCourse.get(record.course.id) ?? []) {
      const offset = quiz.title.includes("1") ? QUIZ_DAYS[0] : QUIZ_DAYS[1];
      for (const studentId of record.studentIds) {
        const key = `${quiz.id}|${studentId}`;
        if (attemptKeys.has(key) || !chance(0.82)) continue;
        attemptKeys.add(key);
        const factor = studentFactor(studentId);
        const score = clamp(Math.round(factor * 100 + ri(-12, 8)), 35, 100);
        const startedAt = atHour(utcDay(offset), 14, ri(0, 40));
        attemptRows.push({
          quizId: quiz.id,
          studentId,
          startedAt,
          finishedAt: new Date(startedAt.getTime() + 14 * 60000),
          score,
          answers: { q1: "A variant", q2: "A variant", q3: "B variant", q4: "A variant" },
        });
      }
    }
  }
  for (let index = 0; index < attemptRows.length; index += 500) {
    await prisma.quizAttempt.createMany({ data: attemptRows.slice(index, index + 500) });
  }

  const existingAssignments = await prisma.assignment.findMany({ select: { id: true, courseId: true, title: true } });
  const assignmentKeys = new Set(existingAssignments.map((assignment) => keyOf(assignment.courseId, assignment.title)));
  const missingAssignments = [];
  for (const record of courseRecords) {
    for (const [index, offset] of ASSIGN_DAYS.entries()) {
      const title = `Amaliy topshiriq ${index + 1}`;
      if (assignmentKeys.has(keyOf(record.course.id, title))) continue;
      assignmentKeys.add(keyOf(record.course.id, title));
      missingAssignments.push({
        courseId: record.course.id,
        title,
        description: `${record.config.title} bo'yicha amaliy topshiriq.`,
        dueAt: atHour(utcDay(offset), 23, 59),
        maxScore: 100,
      });
    }
  }
  if (missingAssignments.length > 0) await prisma.assignment.createMany({ data: missingAssignments });
  const allAssignments = await prisma.assignment.findMany({ select: { id: true, courseId: true, title: true } });
  const assignmentsForCourse = new Map();
  for (const assignment of allAssignments) {
    const list = assignmentsForCourse.get(assignment.courseId) ?? [];
    list.push(assignment);
    assignmentsForCourse.set(assignment.courseId, list);
  }

  const submissionKeys = new Set(
    (await prisma.submission.findMany({ select: { assignmentId: true, studentId: true } })).map(
      (row) => `${row.assignmentId}|${row.studentId}`,
    ),
  );
  const submissionRows = [];
  for (const record of courseRecords) {
    for (const assignment of assignmentsForCourse.get(record.course.id) ?? []) {
      const match = assignment.title.match(/(\d+)$/);
      const position = clamp(Number(match?.[1] ?? 1) - 1, 0, ASSIGN_DAYS.length - 1);
      const offset = ASSIGN_DAYS[position];
      for (const studentId of record.studentIds) {
        const key = `${assignment.id}|${studentId}`;
        if (submissionKeys.has(key) || !chance(0.86)) continue;
        submissionKeys.add(key);
        const factor = studentFactor(studentId);
        const score = clamp(Math.round(factor * 100 + ri(-14, 10)), 30, 100);
        const dueAt = atHour(utcDay(offset), 23, 59);
        const submittedAt = new Date(dueAt.getTime() - ri(1, 5) * DAY - ri(0, 10) * 3600000);
        submissionRows.push({
          assignmentId: assignment.id,
          studentId,
          status: "GRADED",
          score,
          feedback: pick(["Ajoyib natija!", "Yaxshi bajarilgan.", "Qoniqarli.", "Yaxshilash kerak."]),
          submittedAt,
          gradedAt: new Date(submittedAt.getTime() + ri(1, 3) * DAY),
        });
      }
    }
  }
  for (let index = 0; index < submissionRows.length; index += 500) {
    await prisma.submission.createMany({ data: submissionRows.slice(index, index + 500) });
  }
  console.log(
    `   testlar: ${allQuizzes.length}, savollar: +${questionRows.length}, urinishlar: +${attemptRows.length}, topshiriqlar: ${allAssignments.length}, javoblar: +${submissionRows.length}`,
  );

  console.log("11) Rag'bat ballari va og'zaki himoyalar...");
  const bonusKeys = new Set(
    (await prisma.bonusPoint.findMany({ select: { courseId: true, studentId: true, awardedById: true } })).map(
      (row) => `${row.courseId}|${row.studentId}|${row.awardedById}`,
    ),
  );
  const bonusRows = [];
  for (const record of courseRecords.slice(0, 8)) {
    const ranked = [...record.studentIds].sort((a, b) => studentFactor(b) - studentFactor(a)).slice(0, 3);
    for (const studentId of ranked) {
      const key = `${record.course.id}|${studentId}|${record.teacherId}`;
      if (bonusKeys.has(key)) continue;
      bonusKeys.add(key);
      bonusRows.push({
        courseId: record.course.id,
        studentId,
        awardedById: record.teacherId,
        tenths: ri(2, 6),
        reason: pick(["Faol ishtirok", "Qo'shimcha vazifa", "Olimpiada natijasi", "Jamoada yordam"]),
        createdAt: atHour(utcDay(-ri(5, 40)), ri(10, 16)),
      });
    }
  }
  if (bonusRows.length > 0) await prisma.bonusPoint.createMany({ data: bonusRows });

  const oralKeys = new Set(
    (await prisma.oralDefense.findMany({ select: { assignmentId: true, studentId: true } })).map(
      (row) => `${row.assignmentId}|${row.studentId}`,
    ),
  );
  const oralRows = [];
  for (const record of courseRecords.slice(0, 5)) {
    const assignment = (assignmentsForCourse.get(record.course.id) ?? [])[0];
    if (!assignment) continue;
    const sample = record.studentIds.slice(0, 6);
    for (const [index, studentId] of sample.entries()) {
      const key = `${assignment.id}|${studentId}`;
      if (oralKeys.has(key)) continue;
      oralKeys.add(key);
      const status = index < 4 ? "DONE" : index === 4 ? "ACCEPTED" : "REQUESTED";
      const done = status === "DONE";
      oralRows.push({
        assignmentId: assignment.id,
        studentId,
        requestedById: index % 2 === 0 ? record.teacherId : studentId,
        status,
        scheduledAt: done ? atHour(utcDay(-ri(4, 20)), ri(9, 15)) : status === "ACCEPTED" ? atHour(utcDay(2), 10) : null,
        result: done ? (chance(0.78) ? "PASSED" : "FAILED") : null,
        resultNote: done ? (chance(0.78) ? "Mavzuni yaxshi tushungan." : "Qo'shimcha tayyorgarlik kerak.") : null,
        decidedAt: done ? atHour(utcDay(-ri(2, 18)), ri(9, 15)) : null,
        createdAt: atHour(utcDay(-ri(8, 25)), ri(9, 17)),
      });
    }
  }
  if (oralRows.length > 0) {
    await prisma.oralDefense.createMany({ data: oralRows, skipDuplicates: true });
  }
  console.log(`   rag'bat ballari: +${bonusRows.length}, og'zaki himoyalar: +${oralRows.length}`);

  console.log("12) O'quv yili (Term)...");
  await prisma.term.upsert({
    where: { name: "2026-2027 O'quv yili" },
    update: { isActive: true },
    create: {
      name: "2026-2027 O'quv yili",
      startDate: utcDay(-75),
      endDate: utcDay(105),
      isActive: true,
    },
  });

  console.log("13) Xodimlar davomati (kirish/chiqish)...");
  const staffUsers = await prisma.user.findMany({
    where: { role: { in: ["XODIM", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR", "TYUTOR", "TEACHER"] } },
    select: { id: true, email: true },
  });
  const existingStaffDays = new Set(
    (await prisma.staffAttendance.findMany({ select: { userId: true, date: true } })).map(
      (row) => `${row.userId}|${iso(row.date)}`,
    ),
  );
  const staffAttendanceRows = [];
  for (const staff of staffUsers) {
    const isEarly = staff.email.startsWith("farrosh") || staff.email.startsWith("qorovul");
    for (let offset = -30; offset <= 0; offset += 1) {
      const day = utcDay(offset);
      const dow = day.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      const key = `${staff.id}|${iso(day)}`;
      if (existingStaffDays.has(key)) continue;
      existingStaffDays.add(key);
      if (offset < 0 && chance(0.05)) continue;
      const checkInHour = isEarly ? 7 : 8;
      const checkInAt = atHour(day, checkInHour, ri(0, 45));
      const checkOutAt =
        offset === 0 && chance(0.6) ? null : chance(0.88) ? atHour(day, 17, ri(20, 59)) : null;
      staffAttendanceRows.push({
        userId: staff.id,
        date: day,
        checkInAt,
        checkOutAt,
        method: isEarly ? "TERMINAL" : "WEB",
      });
    }
  }
  for (let index = 0; index < staffAttendanceRows.length; index += 500) {
    await prisma.staffAttendance.createMany({
      data: staffAttendanceRows.slice(index, index + 500),
      skipDuplicates: true,
    });
  }
  console.log(`   xodim davomat yozuvlari: +${staffAttendanceRows.length}`);

  console.log("14) Ish topshiriqlari...");
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@ttpu.uz" }, select: { id: true } });
  const taskCreator = adminUser?.id ?? staffUsers.find((user) => user.email === "devonxona@ttpu.uz")?.id;
  const TASK_SEEDS = [
    { email: "farrosh-1@ttpu.uz", title: "201-xonani tozalash", description: "Dars tugagach tozalash va ventilyatsiya", status: "DONE", days: [-6, -6] },
    { email: "farrosh-1@ttpu.uz", title: "Koridorni yuvish", description: "2-qavat koridori", status: "DONE", days: [-3, -3] },
    { email: "farrosh-1@ttpu.uz", title: "Oshxonani tozalash", description: "Tushlikdan keyin", status: "OPEN", days: [0, 1] },
    { email: "farrosh-2@ttpu.uz", title: "301-302 xonalarni tozalash", description: null, status: "DONE", days: [-5, -5] },
    { email: "farrosh-2@ttpu.uz", title: "Zinapoyalarni yuvish", description: "Asosiy zinapoya", status: "OPEN", days: [-1, 1] },
    { email: "qorovul@ttpu.uz", title: "Kechki smenada binoni tekshirish", description: "Barcha eshiklar va derazalar", status: "DONE", days: [-2, -2] },
    { email: "qorovul@ttpu.uz", title: "Avtoturargohni nazorat qilish", description: null, status: "OPEN", days: [0, 2] },
    { email: "it@ttpu.uz", title: "Kompyuter sinfida dasturlarni yangilash", description: "Python va Office paketlari", status: "DONE", days: [-4, -4] },
    { email: "it@ttpu.uz", title: "Proyektor nosozligini tekshirish", description: "202-xona proyektori", status: "OPEN", days: [-1, 2] },
    { email: "bogbon@ttpu.uz", title: "Hovlidagi daraxtlarni parvarishlash", description: null, status: "DONE", days: [-7, -7] },
    { email: "bogbon@ttpu.uz", title: "Gulzorlarni sug'orish", description: "Har kuni ertalab", status: "OPEN", days: [0, 1] },
    { email: "oshxona@ttpu.uz", title: "Haftalik oshxona hisobotini tayyorlash", description: "Moliya bo'limiga topshirish", status: "DONE", days: [-8, -8] },
    { email: "haydovchi@ttpu.uz", title: "Xizmat avtomobilini texnik ko'rikka olib borish", description: null, status: "OPEN", days: [-2, 3] },
    { email: "kutubxona@ttpu.uz", title: "Yangi kitoblarni kataloglashtirish", description: "30 ta yangi kitob", status: "DONE", days: [-10, -9] },
    { email: "psixolog@ttpu.uz", title: "Birinchi kurs talabalari bilan suhbat", description: "Moslashuv dasturi doirasida", status: "OPEN", days: [1, 5] },
    { email: "tibbiyot@ttpu.uz", title: "Birinchi yordam qutilarini yangilash", description: null, status: "OPEN", days: [-3, 2] },
  ];
  const staffByEmail = new Map(staffUsers.map((user) => [user.email, user.id]));
  let taskCount = 0;
  for (const seed of TASK_SEEDS) {
    const assigneeId = staffByEmail.get(seed.email);
    if (!assigneeId || !taskCreator) continue;
    const existingTask = await prisma.workTask.findFirst({
      where: { title: seed.title, assignedToId: assigneeId },
      select: { id: true },
    });
    if (existingTask) continue;
    const done = seed.status === "DONE";
    await prisma.workTask.create({
      data: {
        title: seed.title,
        description: seed.description,
        assignedToId: assigneeId,
        createdById: taskCreator,
        status: done ? "DONE" : "OPEN",
        dueAt: atHour(utcDay(seed.days[1]), 18, 0),
        completedAt: done ? atHour(utcDay(seed.days[1]), ri(14, 17)) : null,
        createdAt: atHour(utcDay(seed.days[0]), ri(8, 10)),
      },
    });
    taskCount += 1;
  }
  console.log(`   ish topshiriqlari: +${taskCount}`);

  console.log("15) Turniket jurnali...");
  const accessCount = await prisma.accessLog.count();
  if (accessCount < 50) {
    const gate = "Asosiy kirish";
    const accessRows = [];
    const staffForAccess = await prisma.user.findMany({
      where: { role: { in: ["XODIM", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR", "TYUTOR", "TEACHER"] } },
      select: { id: true },
    });
    const studentsForAccess = await prisma.user.findMany({ where: { role: "STUDENT" }, select: { id: true }, take: 60 });
    const people = [...staffForAccess, ...studentsForAccess];
    for (let offset = -3; offset <= 0; offset += 1) {
      const day = utcDay(offset);
      const dow = day.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      for (const person of people) {
        if (chance(0.12)) continue;
        accessRows.push({
          userId: person.id,
          direction: "IN",
          gate,
          method: chance(0.3) ? "TERMINAL" : "QR",
          allowed: true,
          at: atHour(day, 8, ri(0, 70)),
        });
        if (offset < 0 || chance(0.7)) {
          accessRows.push({
            userId: person.id,
            direction: "OUT",
            gate,
            method: chance(0.3) ? "TERMINAL" : "QR",
            allowed: true,
            at: atHour(day, 17, ri(10, 80)),
          });
        }
      }
    }
    for (let index = 0; index < accessRows.length; index += 800) {
      await prisma.accessLog.createMany({ data: accessRows.slice(index, index + 800) });
    }
    console.log(`   turniket yozuvlari: +${accessRows.length}`);
  } else {
    console.log(`   turniket yozuvlari: mavjud (${accessCount})`);
  }

  console.log("16) Demo ota-ona akkaunti...");
  const demoStudent = await prisma.user.findUnique({ where: { email: "ai1s01@ttpu.uz" }, select: { id: true } });
  if (demoStudent) {
    const parent = await prisma.user.upsert({
      where: { email: "ota-ona@ttpu.uz" },
      update: { role: "OTA_ONA", isActive: true },
      create: { email: "ota-ona@ttpu.uz", name: "R. Qodirov", role: "OTA_ONA", passwordHash },
    });
    await prisma.parentLink.upsert({
      where: { parentId_studentId: { parentId: parent.id, studentId: demoStudent.id } },
      update: {},
      create: { parentId: parent.id, studentId: demoStudent.id, relation: "FATHER" },
    });
    console.log("   ota-ona@ttpu.uz -> ai1s01@ttpu.uz bog'landi");
  }

  const summary = {
    seconds: Math.round((Date.now() - started) / 1000),
    faculties: await prisma.faculty.count(),
    departments: await prisma.department.count(),
    groups: await prisma.group.count(),
    users: await prisma.user.count(),
    students: await prisma.user.count({ where: { role: "STUDENT" } }),
    teachers: await prisma.user.count({ where: { role: "TEACHER" } }),
    staff: await prisma.user.count({ where: { role: { in: ["REKTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR", "TYUTOR"] } } }),
    courses: await prisma.course.count(),
    subjects: await prisma.subject.count(),
    schedule: await prisma.scheduleEntry.count(),
    sessions: await prisma.attendanceSession.count(),
    attendance: await prisma.attendance.count(),
    quizzes: await prisma.quiz.count(),
    questions: await prisma.question.count(),
    attempts: await prisma.quizAttempt.count(),
    assignments: await prisma.assignment.count(),
    submissions: await prisma.submission.count(),
    bonusPoints: await prisma.bonusPoint.count(),
    oralDefenses: await prisma.oralDefense.count(),
    staffAttendance: await prisma.staffAttendance.count(),
    workTasks: await prisma.workTask.count(),
  };
  console.log("YAKUN:", JSON.stringify(summary, null, 1));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
