import {
  ATTENDANCE_MIN_PERCENT,
  DEADLINE_WINDOW_HOURS,
  DEAN_SYSTEM_PROMPT,
  EXAM_WINDOW_DAYS,
  GRADE_LOW_PERCENT,
  SECURITY_SYSTEM_PROMPT,
  STUDENT_SYSTEM_PROMPT,
  TEACHER_SYSTEM_PROMPT,
  attendancePercent,
  averagePercent,
  deanPrompt,
  fallbackDeanText,
  fallbackSecurityText,
  fallbackStudentText,
  fallbackTeacherText,
  parseSecurityAnswer,
  scorePercent,
  securityEventCount,
  securityPrompt,
  shouldSendDeanReport,
  shouldSendStudentAlert,
  shouldSendTeacherReport,
  studentPrompt,
  studentSeverity,
  teacherPrompt,
} from "./ai-core.mjs";
import { aiConfigured, askAi } from "./ai.mjs";

const HIGH_RISK_ACTIONS = [
  "DEVICE_APPROVAL_FAILED",
  "DEVICE_APPROVAL_REQUEST",
  "LOGIN_FAILED",
  "PASSWORD_RESET_REQUEST",
  "PASSWORD_RESET_SUCCESS",
  "SESSION_REVOKED",
  "USER_DELETE",
  "USER_CREATE",
  "USER_UPDATE",
  "SETTINGS_CHANGE",
  "SALARY_GRANT",
  "SALARY_GRANT_REVOKE",
];

function addHours(date, hours) {
  const copy = new Date(date);
  copy.setHours(copy.getHours() + hours);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function unique(values) {
  return [...new Set(values)];
}

function attendanceRows(statusesByCourse, titleById) {
  const rows = [];
  for (const [courseId, statuses] of statusesByCourse) {
    const counts = attendancePercent(statuses);
    if (counts.total === 0) continue;
    rows.push({
      courseId,
      course: titleById.get(courseId) ?? "Kurs",
      ...counts,
    });
  }
  return rows.sort((a, b) => a.percent - b.percent);
}

function gradeRows(scoresByCourse, titleById) {
  const rows = [];
  for (const [courseId, percents] of scoresByCourse) {
    const percent = averagePercent(percents);
    if (percent < 0) continue;
    rows.push({
      courseId,
      course: titleById.get(courseId) ?? "Kurs",
      percent,
    });
  }
  return rows.sort((a, b) => a.percent - b.percent);
}

function studentRisks(attendance, grades, deadlines, exams, now) {
  const risks = [];
  for (const row of attendance) {
    if (row.total >= 3 && row.percent < ATTENDANCE_MIN_PERCENT) {
      risks.push({
        code: "attendance",
        severity: row.percent < 70 ? "high" : "medium",
        label: `${row.course} davomati ${row.percent}% (${ATTENDANCE_MIN_PERCENT}% kerak)`,
      });
    }
  }
  for (const row of grades) {
    if (row.percent < GRADE_LOW_PERCENT) {
      risks.push({
        code: "grade",
        severity: row.percent < 50 ? "high" : "medium",
        label: `${row.course} bahosi ${row.percent}%`,
      });
    }
  }
  for (const item of deadlines) {
    const hoursLeft = Math.round((item.dueAt.getTime() - now.getTime()) / (60 * 60 * 1000));
    risks.push({
      code: "deadline",
      severity: hoursLeft <= 24 ? "high" : "medium",
      label: `${item.title} — ${item.course} (${hoursLeft <= 0 ? "muddat o'tdi" : `${hoursLeft} soat qoldi`})`,
    });
  }
  for (const exam of exams) {
    if (!exam.permitted) {
      risks.push({
        code: "exam",
        severity: "high",
        label: `${exam.course} — ${exam.title}: imtihonga ruxsat yo'q`,
      });
    }
  }
  return risks;
}

export async function collectStudentFacts(db, user, now = new Date()) {
  const empty = {
    groupName: user.group?.name ?? "",
    attendance: [],
    grades: [],
    deadlines: [],
    exams: [],
    risks: [],
  };
  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    select: { course: { select: { id: true, title: true } } },
  });
  const courses = enrollments.map((row) => row.course).filter(Boolean);
  const courseIds = courses.map((course) => course.id);
  if (courseIds.length === 0) return empty;
  const titleById = new Map(courses.map((course) => [course.id, course.title]));
  const deadlineEnd = addHours(now, DEADLINE_WINDOW_HOURS);
  const examEnd = addDays(startOfDay(now), EXAM_WINDOW_DAYS);

  const [attendance, scores, assignments, quizzes, exams] = await Promise.all([
    db.attendance.findMany({
      where: { studentId: user.id, courseId: { in: courseIds } },
      select: { courseId: true, status: true },
    }),
    db.gradeItemScore.findMany({
      where: { studentId: user.id, item: { courseId: { in: courseIds } } },
      select: { score: true, item: { select: { courseId: true, maxScore: true } } },
    }),
    db.assignment.findMany({
      where: { courseId: { in: courseIds }, dueAt: { gte: now, lte: deadlineEnd } },
      orderBy: { dueAt: "asc" },
      select: {
        title: true,
        dueAt: true,
        courseId: true,
        submissions: { where: { studentId: user.id }, select: { id: true } },
      },
    }),
    db.quiz.findMany({
      where: {
        courseId: { in: courseIds },
        isPublished: true,
        dueAt: { gte: now, lte: deadlineEnd },
      },
      orderBy: { dueAt: "asc" },
      select: {
        title: true,
        dueAt: true,
        courseId: true,
        attempts: {
          where: { studentId: user.id, finishedAt: { not: null } },
          select: { id: true },
        },
      },
    }),
    db.examSession.findMany({
      where: { courseId: { in: courseIds }, date: { gte: startOfDay(now), lte: examEnd } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: {
        title: true,
        date: true,
        startTime: true,
        courseId: true,
        sheets: { where: { studentId: user.id }, select: { status: true } },
      },
    }),
  ]);

  const statusesByCourse = new Map();
  for (const row of attendance) {
    const list = statusesByCourse.get(row.courseId) ?? [];
    list.push(row.status);
    statusesByCourse.set(row.courseId, list);
  }
  const scoresByCourse = new Map();
  for (const row of scores) {
    const percent = scorePercent(row.score, row.item.maxScore);
    if (percent === null) continue;
    const list = scoresByCourse.get(row.item.courseId) ?? [];
    list.push(percent);
    scoresByCourse.set(row.item.courseId, list);
  }

  const attendanceData = attendanceRows(statusesByCourse, titleById);
  const gradesData = gradeRows(scoresByCourse, titleById);
  const deadlineData = [
    ...assignments
      .filter((row) => row.submissions.length === 0)
      .map((row) => ({
        title: row.title,
        course: titleById.get(row.courseId) ?? "Kurs",
        dueAt: row.dueAt,
      })),
    ...quizzes
      .filter((row) => row.attempts.length === 0)
      .map((row) => ({
        title: row.title,
        course: titleById.get(row.courseId) ?? "Kurs",
        dueAt: row.dueAt,
      })),
  ]
    .filter((row) => row.dueAt instanceof Date)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 6);

  const examData = exams.map((row) => {
    const sheet = row.sheets[0] ?? null;
    return {
      title: row.title,
      course: titleById.get(row.courseId) ?? "Kurs",
      date: row.date,
      startTime: row.startTime,
      permitted: Boolean(sheet && sheet.status !== "FAILED" && sheet.status !== "ABSENT"),
    };
  });

  return {
    groupName: user.group?.name ?? "",
    attendance: attendanceData,
    grades: gradesData,
    deadlines: deadlineData,
    exams: examData,
    risks: studentRisks(attendanceData, gradesData, deadlineData, examData, now),
  };
}

export async function buildStudentAlert(db, user, now = new Date()) {
  const facts = await collectStudentFacts(db, user, now);
  if (!shouldSendStudentAlert(facts)) return null;
  const aiText = aiConfigured()
    ? await askAi({
        system: STUDENT_SYSTEM_PROMPT,
        prompt: studentPrompt(user, facts, now),
        maxTokens: 220,
        temperature: 0.5,
      })
    : null;
  return aiText || fallbackStudentText(user, facts) || null;
}

export async function collectTeacherFacts(db, user, now = new Date()) {
  const empty = {
    courses: [],
    groups: [],
    studentCount: 0,
    atRisk: [],
    deadlines: [],
    exams: [],
  };
  const courses = await db.course.findMany({
    where: { teacherId: user.id },
    select: { id: true, title: true },
  });
  const courseIds = courses.map((course) => course.id);
  if (courseIds.length === 0) return empty;
  const titleById = new Map(courses.map((course) => [course.id, course.title]));

  const enrollments = await db.enrollment.findMany({
    where: { courseId: { in: courseIds } },
    select: { userId: true },
  });
  const studentIds = unique(enrollments.map((row) => row.userId));
  if (studentIds.length === 0) {
    return { ...empty, courses };
  }

  const deadlineEnd = addDays(now, 7);
  const examEnd = addDays(startOfDay(now), EXAM_WINDOW_DAYS);

  const [students, attendance, scores, assignments, quizzes, exams] = await Promise.all([
    db.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, group: { select: { name: true } } },
    }),
    db.attendance.findMany({
      where: { courseId: { in: courseIds }, studentId: { in: studentIds } },
      select: { studentId: true, status: true },
    }),
    db.gradeItemScore.findMany({
      where: { studentId: { in: studentIds }, item: { courseId: { in: courseIds } } },
      select: { studentId: true, score: true, item: { select: { maxScore: true } } },
    }),
    db.assignment.findMany({
      where: { courseId: { in: courseIds }, dueAt: { gte: now, lte: deadlineEnd } },
      orderBy: { dueAt: "asc" },
      select: {
        title: true,
        dueAt: true,
        courseId: true,
        _count: { select: { submissions: true } },
      },
    }),
    db.quiz.findMany({
      where: {
        courseId: { in: courseIds },
        isPublished: true,
        dueAt: { gte: now, lte: deadlineEnd },
      },
      orderBy: { dueAt: "asc" },
      select: {
        title: true,
        dueAt: true,
        courseId: true,
        attempts: { where: { finishedAt: { not: null } }, select: { studentId: true } },
      },
    }),
    db.examSession.findMany({
      where: { courseId: { in: courseIds }, date: { gte: startOfDay(now), lte: examEnd } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: { title: true, date: true, courseId: true, sheets: { select: { status: true } } },
    }),
  ]);

  const studentById = new Map(students.map((student) => [student.id, student]));
  const statusesByStudent = new Map();
  for (const row of attendance) {
    const list = statusesByStudent.get(row.studentId) ?? [];
    list.push(row.status);
    statusesByStudent.set(row.studentId, list);
  }
  const percentsByStudent = new Map();
  for (const row of scores) {
    const percent = scorePercent(row.score, row.item.maxScore);
    if (percent === null) continue;
    const list = percentsByStudent.get(row.studentId) ?? [];
    list.push(percent);
    percentsByStudent.set(row.studentId, list);
  }

  const atRisk = [];
  for (const studentId of studentIds) {
    const student = studentById.get(studentId);
    if (!student) continue;
    const counts = attendancePercent(statusesByStudent.get(studentId) ?? []);
    const grade = averagePercent(percentsByStudent.get(studentId) ?? []);
    const reasons = [];
    if (counts.total >= 3 && counts.percent < ATTENDANCE_MIN_PERCENT) {
      reasons.push(`davomat ${counts.percent}%`);
    }
    if (grade >= 0 && grade < GRADE_LOW_PERCENT) {
      reasons.push(`o'rtacha ${grade}%`);
    }
    if (reasons.length === 0) continue;
    atRisk.push({
      name: student.name,
      group: student.group?.name ?? "",
      percent: counts.percent,
      grade,
      reasons,
      severity: counts.percent < 70 || (grade >= 0 && grade < 50) ? "high" : "medium",
    });
  }
  atRisk.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return a.percent - b.percent || a.name.localeCompare(b.name);
  });

  const deadlineData = [
    ...assignments.map((row) => ({
      course: titleById.get(row.courseId) ?? "Kurs",
      title: row.title,
      dueAt: row.dueAt,
      submitted: row._count.submissions,
      total: studentIds.length,
    })),
    ...quizzes.map((row) => ({
      course: titleById.get(row.courseId) ?? "Kurs",
      title: row.title,
      dueAt: row.dueAt,
      submitted: unique(row.attempts.map((attempt) => attempt.studentId)).length,
      total: studentIds.length,
    })),
  ]
    .filter((row) => row.dueAt instanceof Date)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 10);

  const examData = exams.map((row) => ({
    course: titleById.get(row.courseId) ?? "Kurs",
    title: row.title,
    date: row.date,
    sheets: row.sheets.length,
    graded: row.sheets.filter((sheet) => sheet.status !== "PENDING").length,
  }));

  const groups = unique(atRisk.map((student) => student.group).filter(Boolean));

  return {
    courses,
    groups,
    studentCount: studentIds.length,
    atRisk,
    deadlines: deadlineData,
    exams: examData,
  };
}

export async function buildTeacherReport(db, user, now = new Date()) {
  const facts = await collectTeacherFacts(db, user, now);
  if (!shouldSendTeacherReport(facts)) return null;
  const aiText = aiConfigured()
    ? await askAi({
        system: TEACHER_SYSTEM_PROMPT,
        prompt: teacherPrompt(user, facts, now),
        maxTokens: 300,
        temperature: 0.4,
      })
    : null;
  return aiText || fallbackTeacherText(facts) || null;
}

export async function collectDeanFacts(db, user, now = new Date()) {
  const empty = {
    faculty: "",
    groupCount: 0,
    studentCount: 0,
    atRisk: [],
    atRiskCount: 0,
    worstGroups: [],
    deadlines: [],
    exams: [],
  };
  if (!user.facultyId) return empty;
  const [faculty, groups] = await Promise.all([
    db.faculty.findUnique({ where: { id: user.facultyId }, select: { name: true } }),
    db.group.findMany({ where: { facultyId: user.facultyId }, select: { id: true, name: true } }),
  ]);
  if (groups.length === 0) return { ...empty, faculty: faculty?.name ?? "" };
  const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
  const students = await db.user.findMany({
    where: { groupId: { in: groups.map((group) => group.id) }, role: "STUDENT" },
    select: { id: true, name: true, groupId: true },
  });
  const studentIds = students.map((student) => student.id);
  if (studentIds.length === 0) {
    return { ...empty, faculty: faculty?.name ?? "", groupCount: groups.length };
  }
  const enrollments = await db.enrollment.findMany({
    where: { userId: { in: studentIds } },
    select: { userId: true, courseId: true },
  });
  const courseIds = unique(enrollments.map((row) => row.courseId));
  const courses = courseIds.length
    ? await db.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
    : [];
  const titleById = new Map(courses.map((course) => [course.id, course.title]));
  const deadlineEnd = addDays(now, 7);
  const examEnd = addDays(startOfDay(now), EXAM_WINDOW_DAYS);

  const [attendance, scores, assignments, quizzes, exams] = await Promise.all([
    db.attendance.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, status: true },
    }),
    db.gradeItemScore.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, score: true, item: { select: { maxScore: true } } },
    }),
    courseIds.length
      ? db.assignment.findMany({
          where: { courseId: { in: courseIds }, dueAt: { gte: now, lte: deadlineEnd } },
          select: { title: true, dueAt: true, courseId: true },
        })
      : [],
    courseIds.length
      ? db.quiz.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
            dueAt: { gte: now, lte: deadlineEnd },
          },
          select: { title: true, dueAt: true, courseId: true },
        })
      : [],
    courseIds.length
      ? db.examSession.findMany({
          where: { courseId: { in: courseIds }, date: { gte: startOfDay(now), lte: examEnd } },
          select: { title: true, date: true, courseId: true },
        })
      : [],
  ]);

  const statusesByStudent = new Map();
  for (const row of attendance) {
    const list = statusesByStudent.get(row.studentId) ?? [];
    list.push(row.status);
    statusesByStudent.set(row.studentId, list);
  }
  const percentsByStudent = new Map();
  for (const row of scores) {
    const percent = scorePercent(row.score, row.item.maxScore);
    if (percent === null) continue;
    const list = percentsByStudent.get(row.studentId) ?? [];
    list.push(percent);
    percentsByStudent.set(row.studentId, list);
  }

  const atRisk = [];
  const groupStats = new Map();
  for (const student of students) {
    const counts = attendancePercent(statusesByStudent.get(student.id) ?? []);
    const grade = averagePercent(percentsByStudent.get(student.id) ?? []);
    const reasons = [];
    if (counts.total >= 3 && counts.percent < ATTENDANCE_MIN_PERCENT) {
      reasons.push(`davomat ${counts.percent}%`);
    }
    if (grade >= 0 && grade < GRADE_LOW_PERCENT) {
      reasons.push(`o'rtacha ${grade}%`);
    }
    const groupName = groupNameById.get(student.groupId) ?? "";
    const current = groupStats.get(groupName) ?? { name: groupName, total: 0, atRisk: 0 };
    current.total += 1;
    if (reasons.length > 0) {
      current.atRisk += 1;
      atRisk.push({
        name: student.name,
        group: groupName,
        percent: counts.percent,
        grade,
        reasons,
        severity: counts.percent < 70 || (grade >= 0 && grade < 50) ? "high" : "medium",
      });
    }
    groupStats.set(groupName, current);
  }
  atRisk.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return a.percent - b.percent || a.name.localeCompare(b.name);
  });
  const worstGroups = [...groupStats.values()]
    .filter((group) => group.atRisk > 0)
    .sort((a, b) => b.atRisk - a.atRisk || a.name.localeCompare(b.name))
    .slice(0, 8);

  const deadlines = [
    ...assignments.map((row) => ({
      title: row.title,
      course: titleById.get(row.courseId) ?? "Kurs",
      dueAt: row.dueAt,
    })),
    ...quizzes.map((row) => ({
      title: row.title,
      course: titleById.get(row.courseId) ?? "Kurs",
      dueAt: row.dueAt,
    })),
  ]
    .filter((row) => row.dueAt instanceof Date)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 10);

  const examData = exams.map((row) => ({
    course: titleById.get(row.courseId) ?? "Kurs",
    title: row.title,
    date: row.date,
  }));

  return {
    faculty: faculty?.name ?? "",
    groupCount: groups.length,
    studentCount: studentIds.length,
    atRisk: atRisk.slice(0, 20),
    atRiskCount: atRisk.length,
    worstGroups,
    deadlines,
    exams: examData,
  };
}

export async function buildDeanReport(db, user, now = new Date()) {
  const facts = await collectDeanFacts(db, user, now);
  if (!shouldSendDeanReport(facts)) return null;
  const aiText = aiConfigured()
    ? await askAi({
        system: DEAN_SYSTEM_PROMPT,
        prompt: deanPrompt(user, facts, now),
        maxTokens: 320,
        temperature: 0.4,
      })
    : null;
  return aiText || fallbackDeanText(facts) || null;
}

export async function collectSecurityEvents(db, since, now = new Date()) {
  const [blockedLogins, newDevices, deviceChallenges, audits, suspiciousAttendance, examEvents] =
    await Promise.all([
      db.loginRecord.findMany({
        where: { createdAt: { gte: since }, status: "BLOCKED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true, email: true, role: true } } },
      }),
      db.trustedDevice.findMany({
        where: { createdAt: { gte: since }, revokedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true, email: true, role: true } } },
      }),
      db.deviceApprovalChallenge.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true, email: true, role: true } } },
      }),
      db.auditLog.findMany({
        where: { createdAt: { gte: since }, action: { in: HIGH_RISK_ACTIONS } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { name: true, email: true, role: true } } },
      }),
      db.attendance.findMany({
        where: { date: { gte: startOfDay(now) }, status: "SUSPICIOUS" },
        orderBy: { date: "desc" },
        take: 20,
        include: {
          student: { select: { name: true, email: true } },
          course: { select: { title: true } },
        },
      }),
      db.secureExamEvent.findMany({
        where: { at: { gte: since }, severity: { in: ["WARNING", "CRITICAL"] } },
        orderBy: { at: "desc" },
        take: 20,
        include: { run: { include: { student: { select: { name: true, email: true } } } } },
      }),
    ]);

  return {
    blockedLogins: blockedLogins.map((row) => ({
      name: row.user.name,
      email: row.user.email,
      role: row.user.role,
      deviceName: row.deviceName,
      ip: row.ip,
      city: row.city,
      createdAt: row.createdAt,
    })),
    newDevices: newDevices.map((row) => ({
      name: row.user.name,
      email: row.user.email,
      role: row.user.role,
      deviceName: row.name,
      platform: row.platform,
      ip: row.ip,
      city: row.city,
      createdAt: row.createdAt,
    })),
    deviceChallenges: deviceChallenges.map((row) => ({
      name: row.user.name,
      email: row.user.email,
      role: row.user.role,
      deviceName: row.deviceName,
      ip: row.ip,
      city: row.city,
      createdAt: row.createdAt,
    })),
    audits: audits.map((row) => ({
      actor: row.actor?.name ?? "",
      email: row.actor?.email ?? "",
      role: row.actor?.role ?? "",
      action: row.action,
      createdAt: row.createdAt,
    })),
    suspiciousAttendance: suspiciousAttendance.map((row) => ({
      student: row.student.name,
      email: row.student.email,
      course: row.course.title,
      date: row.date,
      note: row.note ?? "",
    })),
    examEvents: examEvents.map((row) => ({
      student: row.run.student.name,
      email: row.run.student.email,
      type: row.type,
      severity: row.severity,
      at: row.at,
    })),
  };
}

export async function buildSecurityAlert(events, since, now = new Date()) {
  if (securityEventCount(events) === 0) return null;
  const aiText = aiConfigured()
    ? await askAi({
        system: SECURITY_SYSTEM_PROMPT,
        prompt: securityPrompt(events, since, now),
        maxTokens: 220,
        temperature: 0.2,
      })
    : null;
  if (aiText) {
    const verdict = parseSecurityAnswer(aiText);
    return verdict.skip ? null : verdict.text;
  }
  return fallbackSecurityText(events) || null;
}

export { studentSeverity };
