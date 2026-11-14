export const ATTENDANCE_MIN_PERCENT = 80;
export const GRADE_LOW_PERCENT = 60;
export const DEADLINE_WINDOW_HOURS = 48;
export const EXAM_WINDOW_DAYS = 7;
export const AI_TEXT_MAX = 900;

export const STUDENT_SYSTEM_PROMPT = [
  "Sen universitetning yordamchi botsan.",
  "Faqat berilgan faktlarga tayan, hech narsani o'zingdan qo'shma.",
  "O'zbek tilida (lotin yozuvida), samimiy va xolis yoz.",
  "2-4 gapdan oshma. Eng muhim 1-2 xavfni ayt va aniq amaliy maslahat ber.",
  "Qo'rqitma, ayblama, baho yoki foizlarni o'zgartirma.",
].join(" ");

export const TEACHER_SYSTEM_PROMPT = [
  "Sen universitetning tahliliy yordamchisisan.",
  "Faqat berilgan faktlarga tayan.",
  "O'qituvchi uchun kunlik qisqa hisobot yoz: 3-5 gap, ishchan ohang.",
  "Eng muhim 2-3 nuqtani ajrat, ortiqcha ma'lumotni takrorlama.",
  "O'zbek tilida (lotin yozuvida) yoz.",
].join(" ");

export const DEAN_SYSTEM_PROMPT = [
  "Sen universitet dekani uchun tahliliy yordamchisisan.",
  "Faqat berilgan faktlarga tayan.",
  "Fakultet bo'yicha kunlik qisqa xulosa yoz: 3-5 gap, ishchan ohang.",
  "Qaysi guruhlar va talabalar e'tibor talab qilishini aniq ayt.",
  "O'zbek tilida (lotin yozuvida) yoz.",
].join(" ");

export const SECURITY_SYSTEM_PROMPT = [
  "Sen universitetning xavfsizlik yordamchisisan.",
  "Berilgan hodisalarni bahola va faqat OWNER diqqatini talab qiladiganlarini yoz.",
  "Agar jiddiy xavf bo'lmasa, javob sifatida aynan SKIP yoz.",
  "O'zbek tilida (lotin yozuvida), 1-3 gap, 60 so'zdan oshmasin.",
  "Taxmin qilma, faqat faktlarga tayan.",
].join(" ");

export function firstName(name) {
  return String(name ?? "").trim().split(/\s+/)[0] || "Talaba";
}

export function clampPercent(value) {
  return Math.min(100, Math.max(0, value));
}

export function attendancePercent(statuses) {
  const total = statuses.length;
  const attended = statuses.filter((status) => status === "PRESENT" || status === "LATE").length;
  return {
    total,
    attended,
    percent: total > 0 ? Math.round((attended / total) * 100) : 0,
  };
}

export function scorePercent(score, maxScore) {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return null;
  return Math.round(clampPercent((score / maxScore) * 100));
}

export function averagePercent(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) return -1;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

export function cleanAiText(text, maxLength = AI_TEXT_MAX) {
  if (typeof text !== "string") return "";
  const cleaned = text
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/[*_#>`]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…` : cleaned;
}

export function formatDateUz(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
}

export function formatDateTimeUz(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDateUz(date)} ${hours}:${minutes}`;
}

export function studentSeverity(facts) {
  if (facts.risks.some((risk) => risk.severity === "high")) return "high";
  if (facts.risks.length > 0) return "medium";
  return "none";
}

export function shouldSendStudentAlert(facts) {
  return Boolean(facts && Array.isArray(facts.risks) && facts.risks.length > 0);
}

export function shouldSendTeacherReport(facts) {
  if (!facts || facts.studentCount === 0) return false;
  return facts.atRisk.length > 0 || facts.deadlines.length > 0 || facts.exams.length > 0;
}

export function shouldSendDeanReport(facts) {
  if (!facts || facts.studentCount === 0) return false;
  return facts.atRiskCount > 0 || facts.deadlines.length > 0 || facts.exams.length > 0;
}

function factLines(facts) {
  const lines = [];
  if (facts.attendance.length > 0) {
    const worst = facts.attendance.slice(0, 4);
    lines.push(`Davomat: ${worst.map((row) => `${row.course} ${row.percent}%`).join(", ")}`);
  } else {
    lines.push("Davomat: ma'lumot yo'q");
  }
  if (facts.grades.length > 0) {
    const worst = facts.grades.slice(0, 4);
    lines.push(`Baholar: ${worst.map((row) => `${row.course} ${row.percent}%`).join(", ")}`);
  } else {
    lines.push("Baholar: ma'lumot yo'q");
  }
  if (facts.deadlines.length > 0) {
    lines.push(
      `Yaqin muddatlar (${DEADLINE_WINDOW_HOURS} soat): ${facts.deadlines
        .slice(0, 4)
        .map((item) => `${item.title} — ${item.course}, ${formatDateTimeUz(item.dueAt)}`)
        .join("; ")}`,
    );
  } else {
    lines.push("Yaqin muddatlar: yo'q");
  }
  if (facts.exams.length > 0) {
    lines.push(
      `Imtihonlar (${EXAM_WINDOW_DAYS} kun): ${facts.exams
        .slice(0, 4)
        .map((exam) => `${exam.course} — ${exam.title}, ${formatDateUz(exam.date)}${exam.permitted ? "" : ", ruxsat yo'q"}`)
        .join("; ")}`,
    );
  } else {
    lines.push("Imtihonlar: yaqin kunlarda yo'q");
  }
  return lines;
}

export function studentPrompt(user, facts, now) {
  return [
    `Bugun: ${formatDateUz(now)}.`,
    `Talaba: ${user.name}${facts.groupName ? `, guruh ${facts.groupName}` : ""}.`,
    "Faktlar:",
    ...factLines(facts).map((line) => `- ${line}`),
    "Vazifa: shu talabaga 2-4 gapdan iborat shaxsiy ogohlantirish yoz.",
    "Eng muhim 1-2 muammoni ayt va bugun nima qilishni maslahat ber.",
  ].join("\n");
}

export function fallbackStudentText(user, facts) {
  const risks = facts.risks.slice(0, 4).map((risk) => `• ${risk.label}`);
  if (risks.length === 0) return "";
  return [
    `${firstName(user.name)}, e'tibor bering:`,
    ...risks,
    "",
    "Iltimos, FBSU ilovasida holatni tekshiring va kerakli choralarni ko'ring.",
  ].join("\n");
}

export function teacherPrompt(user, facts, now) {
  const atRisk = facts.atRisk.slice(0, 8).map(
    (student) =>
      `- ${student.name}${student.group ? ` (${student.group})` : ""}: ${student.reasons.join(", ")}`,
  );
  const deadlines = facts.deadlines.slice(0, 6).map(
    (item) => `- ${item.course}: ${item.title}, ${formatDateTimeUz(item.dueAt)}, topshirganlar ${item.submitted}/${item.total}`,
  );
  const exams = facts.exams.slice(0, 6).map(
    (exam) => `- ${exam.course}: ${exam.title}, ${formatDateUz(exam.date)}, varaqlar ${exam.graded}/${exam.sheets}`,
  );
  return [
    `Bugun: ${formatDateUz(now)}.`,
    `O'qituvchi: ${user.name}.`,
    `Kurslar: ${facts.courses.map((course) => course.title).join(", ") || "yo'q"}.`,
    `Talabalar: ${facts.studentCount}.`,
    `Xavf ostida: ${facts.atRisk.length}.`,
    ...(atRisk.length > 0 ? atRisk : ["- Xavf ostida talaba yo'q"]),
    ...(deadlines.length > 0 ? [`Yaqin muddatlar:`, ...deadlines] : []),
    ...(exams.length > 0 ? [`Kelayotgan imtihonlar:`, ...exams] : []),
    "Vazifa: o'qituvchi uchun 3-5 gapdan iborat kunlik xulosa yoz.",
    "Eng muhim 2-3 nuqtani ayt va bugun nimaga e'tibor berish kerakligini maslahat ber.",
  ].join("\n");
}

export function fallbackTeacherText(facts) {
  const lines = [];
  if (facts.atRisk.length > 0) {
    const names = facts.atRisk.slice(0, 5).map((student) => student.name).join(", ");
    lines.push(`• Xavf ostida: ${facts.atRisk.length} talaba — ${names}`);
  } else {
    lines.push("• Xavf ostida talaba yo'q");
  }
  if (facts.deadlines.length > 0) {
    lines.push(`• Yaqin muddatlar: ${facts.deadlines.length} ta vazifa/test`);
  }
  if (facts.exams.length > 0) {
    lines.push(`• Kelayotgan imtihonlar: ${facts.exams.length} ta`);
  }
  if (lines.length === 0) return "";
  return [
    ...lines,
    "",
    "Batafsil ma'lumot FBSU ilovasida.",
  ].join("\n");
}

export function deanPrompt(user, facts, now) {
  const groups = facts.worstGroups.slice(0, 6).map(
    (group) => `- ${group.name}: ${group.atRisk}/${group.total} xavf ostida`,
  );
  const atRisk = facts.atRisk.slice(0, 6).map(
    (student) =>
      `- ${student.name}${student.group ? ` (${student.group})` : ""}: ${student.reasons.join(", ")}`,
  );
  return [
    `Bugun: ${formatDateUz(now)}.`,
    `Dekan: ${user.name}${facts.faculty ? `, fakultet ${facts.faculty}` : ""}.`,
    `Guruhlar: ${facts.groupCount}, talabalar: ${facts.studentCount}, xavf ostida: ${facts.atRiskCount}.`,
    ...(groups.length > 0 ? [`Eng muammoli guruhlar:`, ...groups] : []),
    ...(atRisk.length > 0 ? [`Diqqat talab qiladigan talabalar:`, ...atRisk] : []),
    ...(facts.deadlines.length > 0 ? [`Yaqin muddatlar: ${facts.deadlines.length} ta.`] : []),
    ...(facts.exams.length > 0 ? [`Kelayotgan imtihonlar: ${facts.exams.length} ta.`] : []),
    "Vazifa: dekan uchun 3-5 gapdan iborat kunlik xulosa yoz.",
    "Qaysi guruhlarga e'tibor berish kerakligini aniq ayt.",
  ].join("\n");
}

export function fallbackDeanText(facts) {
  const lines = [
    `• Talabalar: ${facts.studentCount}, xavf ostida: ${facts.atRiskCount}`,
  ];
  if (facts.worstGroups.length > 0) {
    const groups = facts.worstGroups
      .slice(0, 4)
      .map((group) => `${group.name} (${group.atRisk})`)
      .join(", ");
    lines.push(`• Eng muammoli guruhlar: ${groups}`);
  }
  if (facts.deadlines.length > 0) lines.push(`• Yaqin muddatlar: ${facts.deadlines.length} ta`);
  if (facts.exams.length > 0) lines.push(`• Kelayotgan imtihonlar: ${facts.exams.length} ta`);
  return lines.join("\n");
}

export function securityEventCount(events) {
  return (
    events.blockedLogins.length +
    events.newDevices.length +
    events.deviceChallenges.length +
    events.audits.length +
    events.suspiciousAttendance.length +
    events.examEvents.length
  );
}

export function securityPrompt(events, since, now) {
  const lines = [`Tekshirilgan oraliq: ${formatDateTimeUz(since)} — ${formatDateTimeUz(now)}.`];
  if (events.blockedLogins.length > 0) {
    lines.push("Bloklangan kirishlar:");
    for (const row of events.blockedLogins.slice(0, 8)) {
      lines.push(`- ${row.name} (${row.email}), ${row.deviceName ?? "noma'lum qurilma"}, ${row.ip ?? "?"}, ${row.city ?? "?"}, ${formatDateTimeUz(row.createdAt)}`);
    }
  }
  if (events.newDevices.length > 0) {
    lines.push("Yangi qurilmalar:");
    for (const row of events.newDevices.slice(0, 8)) {
      lines.push(`- ${row.name} (${row.email}), ${row.deviceName ?? "?"}, ${row.platform ?? "?"}, ${row.ip ?? "?"}, ${row.city ?? "?"}, ${formatDateTimeUz(row.createdAt)}`);
    }
  }
  if (events.deviceChallenges.length > 0) {
    lines.push("Qurilma tasdiqlash so'rovlari:");
    for (const row of events.deviceChallenges.slice(0, 6)) {
      lines.push(`- ${row.name} (${row.email}), ${row.deviceName ?? "?"}, ${row.city ?? "?"}, ${formatDateTimeUz(row.createdAt)}`);
    }
  }
  if (events.audits.length > 0) {
    lines.push("Muhim audit hodisalari:");
    for (const row of events.audits.slice(0, 10)) {
      lines.push(`- ${row.actor || "tizim"}: ${row.action}, ${formatDateTimeUz(row.createdAt)}`);
    }
  }
  if (events.suspiciousAttendance.length > 0) {
    lines.push("Shubhali davomat:");
    for (const row of events.suspiciousAttendance.slice(0, 8)) {
      lines.push(`- ${row.student}, ${row.course}, ${formatDateUz(row.date)}${row.note ? `, ${row.note}` : ""}`);
    }
  }
  if (events.examEvents.length > 0) {
    lines.push("Imtihon nazorati hodisalari:");
    for (const row of events.examEvents.slice(0, 8)) {
      lines.push(`- ${row.student}, ${row.type}, ${row.severity}, ${formatDateTimeUz(row.at)}`);
    }
  }
  lines.push("Vazifa: shu hodisalar orasida OWNER diqqatini talab qiladiganlari bormi?");
  lines.push("Faqat muhimlarini 1-3 gapda yoz. Jiddiy xavf bo'lmasa aynan SKIP yoz.");
  return lines.join("\n");
}

const CRITICAL_AUDIT_ACTIONS = new Set([
  "USER_DELETE",
  "SALARY_GRANT",
  "SALARY_GRANT_REVOKE",
  "PASSWORD_RESET_SUCCESS",
  "SESSION_REVOKED",
]);

function criticalAuditCount(events) {
  return events.audits.filter((row) => CRITICAL_AUDIT_ACTIONS.has(row.action)).length;
}

export function fallbackSecurityText(events) {
  const criticalAudits = criticalAuditCount(events);
  const serious =
    events.blockedLogins.length +
    events.newDevices.length +
    events.suspiciousAttendance.length +
    events.examEvents.length +
    criticalAudits;
  if (serious === 0) return "";
  const lines = ["🔐 Xavfsizlik ogohlantirishi"];
  if (events.blockedLogins.length > 0) lines.push(`• Bloklangan kirish: ${events.blockedLogins.length}`);
  if (events.newDevices.length > 0) lines.push(`• Yangi qurilma: ${events.newDevices.length}`);
  if (events.deviceChallenges.length > 0) lines.push(`• Tasdiqlash so'rovi: ${events.deviceChallenges.length}`);
  if (criticalAudits > 0) lines.push(`• Muhim audit hodisasi: ${criticalAudits}`);
  if (events.suspiciousAttendance.length > 0) lines.push(`• Shubhali davomat: ${events.suspiciousAttendance.length}`);
  if (events.examEvents.length > 0) lines.push(`• Imtihon nazorati: ${events.examEvents.length}`);
  return lines.join("\n");
}

export function parseSecurityAnswer(text) {
  const cleaned = cleanAiText(text, 500);
  if (!cleaned) return { skip: true, text: "" };
  if (/^skip\b/i.test(cleaned)) return { skip: true, text: "" };
  return { skip: false, text: cleaned };
}
