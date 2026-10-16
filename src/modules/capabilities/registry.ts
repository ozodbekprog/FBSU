export type CapabilityScope = "global" | "course";

export type CapabilityDefinition = {
  scope: CapabilityScope;
  label: string;
};

export const CAPABILITIES = {
  "system.admin": { scope: "global", label: "Tizim sozlamalarini boshqarish" },
  "user.manage": { scope: "global", label: "Foydalanuvchilarni boshqarish" },
  "academic.manage": { scope: "global", label: "O'quv bo'limi boshqaruvi (talaba, guruh, jadval)" },
  "monitoring.view": { scope: "global", label: "Monitoringni ko'rish" },
  "analysis.view": { scope: "global", label: "Tahlil va hisobotlarni ko'rish" },
  "approvals.decide": { scope: "global", label: "So'rovlarni tasdiqlash" },
  "access.scan": { scope: "global", label: "Turniketda skanerlash" },
  "access.viewLogs": { scope: "global", label: "Kirish jurnalini ko'rish" },
  "finance.manage": { scope: "global", label: "Moliya va to'lovlarni boshqarish" },
  "staff.manage": { scope: "global", label: "Xodimlarni boshqarish" },
  "curator.manage": { scope: "global", label: "Kurator paneli" },
  "parent.viewChild": { scope: "global", label: "Farzand ma'lumotlarini ko'rish" },
  "gradeChanges.review": { scope: "global", label: "Baho o'zgarish so'rovlarini ko'rib chiqish" },
  "tasks.manage": { scope: "global", label: "Topshiriqlarni taqsimlash va boshqarish" },
  "course.manage": { scope: "course", label: "Kurs kontentini boshqarish" },
  "course.grade": { scope: "course", label: "Baholash" },
  "quiz.manage": { scope: "course", label: "Testlarni boshqarish" },
  "attendance.open": { scope: "course", label: "Davomat sessiyasini ochish" },
  "exam.proctor": { scope: "course", label: "Imtihon nazorati" },
} as const satisfies Record<string, CapabilityDefinition>;

export type Capability = keyof typeof CAPABILITIES;

export const ALL_CAPABILITIES = Object.keys(CAPABILITIES) as Capability[];
