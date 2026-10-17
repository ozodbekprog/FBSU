export type EventCategory =
  | "auth"
  | "users"
  | "courses"
  | "enrollments"
  | "attendance"
  | "exams"
  | "grades"
  | "schedule"
  | "documents"
  | "finance"
  | "salary"
  | "chat"
  | "communication"
  | "system";

export type EventDefinition = {
  category: EventCategory;
  label: string;
};

export const EVENTS = {
  LOGIN_SUCCESS: { category: "auth", label: "Tizimga kirdi" },
  LOGIN_FAILED: { category: "auth", label: "Kirish muvaffaqiyatsiz" },
  LOGOUT: { category: "auth", label: "Tizimdan chiqdi" },
  REGISTER: { category: "auth", label: "Ro'yxatdan o'tdi" },
  PASSWORD_RESET_REQUEST: { category: "auth", label: "Parol tiklash so'rovi" },
  PASSWORD_RESET_SUCCESS: { category: "auth", label: "Parol tiklandi" },
  PASSWORD_RESET_FAILED: { category: "auth", label: "Parol tiklash muvaffaqiyatsiz" },
  PASSWORD_RESET_EMAIL_FAILED: { category: "auth", label: "Parol xati yuborilmadi" },

  USER_CREATE: { category: "users", label: "Foydalanuvchi yaratildi" },
  "admin.user.update": { category: "users", label: "Foydalanuvchi tahrirlandi" },

  COURSE_CREATE: { category: "courses", label: "Kurs yaratildi" },

  enroll: { category: "enrollments", label: "Kursga yozildi" },
  "enrollment.approve": { category: "enrollments", label: "Yozilish tasdiqlandi" },
  "enrollment.reject": { category: "enrollments", label: "Yozilish rad etildi" },

  "attendance.check-in": { category: "attendance", label: "Davomat: kirdi" },
  "attendance.check-out": { category: "attendance", label: "Davomat: chiqdi" },
  "attendance.bulk": { category: "attendance", label: "Davomat ommaviy belgilandi" },
  "attendance.delete": { category: "attendance", label: "Davomat yozuvi o'chirildi" },
  "attendance.demo-simulate": { category: "attendance", label: "Davomat demo simulyatsiyasi" },

  "secure-exam.create": { category: "exams", label: "Xavfsiz imtihon yaratildi" },
  "secure-exam.delete": { category: "exams", label: "Xavfsiz imtihon o'chirildi" },
  "secure-exam.join": { category: "exams", label: "Xavfsiz imtihonga kirdi" },
  "secure-exam.status": { category: "exams", label: "Xavfsiz imtihon holati o'zgardi" },
  "secure-exam.terminate": { category: "exams", label: "Xavfsiz imtihon to'xtatildi" },
  "secure-exam.extra-time": { category: "exams", label: "Xavfsiz imtihonga qo'shimcha vaqt" },
  "attempt.score": { category: "exams", label: "Test urinishi baholandi" },

  "submission.grade": { category: "grades", label: "Topshiriq baholandi" },
  "submission.regrade_request": { category: "grades", label: "Qayta baholash so'rovi" },
  "grade_change.approve": { category: "grades", label: "Baho o'zgarishi tasdiqlandi" },
  "grade_change.reject": { category: "grades", label: "Baho o'zgarishi rad etildi" },
  "gradebook.category.create": { category: "grades", label: "Baho kategoriyasi yaratildi" },
  "gradebook.category.delete": { category: "grades", label: "Baho kategoriyasi o'chirildi" },
  "gradebook.item.create": { category: "grades", label: "Baho ustuni yaratildi" },
  "gradebook.item.update": { category: "grades", label: "Baho ustuni tahrirlandi" },
  "gradebook.item.delete": { category: "grades", label: "Baho ustuni o'chirildi" },
  "gradebook.score.set": { category: "grades", label: "Baho kiritildi" },
  "gradebook.sync": { category: "grades", label: "Baho avtomatik sinxronlandi" },
  "schedule.approve": { category: "schedule", label: "Jadval yozuvi tasdiqlandi" },
  "schedule.approve_all": { category: "schedule", label: "Jadval ommaviy tasdiqlandi" },
  "schedule.status": { category: "schedule", label: "Jadval holati o'zgardi" },

  "certificate.issue": { category: "documents", label: "Sertifikat chiqarildi" },
  "diploma.create": { category: "documents", label: "Diplom yaratildi" },
  FILE_UPLOAD: { category: "documents", label: "Fayl yuklandi" },
  FILE_DOWNLOAD: { category: "documents", label: "Fayl yuklab olindi" },

  "finance.contract.create": { category: "finance", label: "Shartnoma tuzildi" },
  "finance.payment.create": { category: "finance", label: "To'lov kiritildi" },

  SALARY_GRANT: { category: "salary", label: "Oylik ko'rish huquqi berildi" },
  SALARY_GRANT_REVOKE: { category: "salary", label: "Oylik huquqi bekor qilindi" },
  SALARY_STATUS_CHANGE: { category: "salary", label: "Oylik holati o'zgardi" },
  SALARY_DELETE: { category: "salary", label: "Oylik yozuvi o'chirildi" },

  CHAT_CLEAR_HISTORY: { category: "chat", label: "Chat tarixi tozalandi" },
  CHAT_DELETE: { category: "chat", label: "Chat o'chirildi" },
  CHAT_REPORT: { category: "chat", label: "Chat shikoyat qilindi" },
  CHAT_FILE_MESSAGE: { category: "chat", label: "Chatga fayl yuborildi" },
  CHAT_VOICE_MESSAGE: { category: "chat", label: "Chatga ovozli xabar" },
  CHAT_DOWNLOAD_ATTACHMENT: { category: "chat", label: "Chat fayli yuklab olindi" },

  CALL_START: { category: "communication", label: "Qo'ng'iroq boshlandi" },
  CALL_END: { category: "communication", label: "Qo'ng'iroq tugadi" },
  CALL_RESPOND: { category: "communication", label: "Qo'ng'iroqqa javob berildi" },

  "admin.group.create": { category: "system", label: "Guruh yaratildi" },
  "admin.group.update": { category: "system", label: "Guruh tahrirlandi" },
  "admin.group.delete": { category: "system", label: "Guruh o'chirildi" },
  "admin.subgroup.create": { category: "system", label: "Kichik guruh yaratildi" },
  "admin.subgroup.update": { category: "system", label: "Kichik guruh tahrirlandi" },
  "admin.subgroup.delete": { category: "system", label: "Kichik guruh o'chirildi" },
  "admin.settings.update": { category: "system", label: "Tizim sozlamalari o'zgardi" },
  "courseRule.set": { category: "courses", label: "Faoliyat ochilish qoidasi o'rnatildi" },
  "courseRule.delete": { category: "courses", label: "Faoliyat ochilish qoidasi olib tashlandi" },
  "course.export": { category: "courses", label: "Kurs eksport qilindi" },
  "course.import": { category: "courses", label: "Kurs import qilindi" },
  "assignment.extension": { category: "grades", label: "Topshiriq muddati uzaytirildi" },
  "choice.create": { category: "courses", label: "So'rovnoma yaratildi" },
  "choice.vote": { category: "courses", label: "So'rovnomada ovoz berildi" },
  "glossary.create": { category: "courses", label: "Glossariyga atama qo'shildi" },
  "glossary.update": { category: "courses", label: "Glossariy atamasi tahrirlandi" },
  "glossary.delete": { category: "courses", label: "Glossariy atamasi o'chirildi" },
  ANNOUNCEMENT_CREATE: { category: "system", label: "E'lon yaratildi" },
  ANNOUNCEMENT_DELETE: { category: "system", label: "E'lon o'chirildi" },
  MAINTENANCE_TOGGLE: { category: "system", label: "Texnik rejim o'zgardi" },
  "system.cron": { category: "system", label: "Fon vazifalari ishga tushdi" },
  "system.ownerRecovery": { category: "system", label: "OWNER akkaunt tiklandi" },
  BACKUP_EXPORT: { category: "system", label: "Zaxira eksport qilindi" },
  "order.update": { category: "system", label: "Buyurtma holati o'zgardi" },
  BUG_REPORTED: { category: "system", label: "Xato haqida xabar" },
  BUG_UPDATED: { category: "system", label: "Xato holati o'zgardi" },
} as const satisfies Record<string, EventDefinition>;

export type EventName = keyof typeof EVENTS;

export const EVENT_CATEGORIES: readonly EventCategory[] = [
  "auth",
  "users",
  "courses",
  "enrollments",
  "attendance",
  "exams",
  "grades",
  "schedule",
  "documents",
  "finance",
  "salary",
  "chat",
  "communication",
  "system",
];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  auth: "Autentifikatsiya",
  users: "Foydalanuvchilar",
  courses: "Kurslar",
  enrollments: "Ro'yxatga olish",
  attendance: "Davomat",
  exams: "Imtihonlar",
  grades: "Baholash",
  schedule: "Jadval",
  documents: "Hujjatlar",
  finance: "Moliya",
  salary: "Oylik",
  chat: "Chat",
  communication: "Aloqa",
  system: "Tizim",
};

export function isEventName(value: string): value is EventName {
  return Object.hasOwn(EVENTS, value);
}

export function eventsByCategory(category: EventCategory): EventName[] {
  return (Object.keys(EVENTS) as EventName[]).filter(
    (event) => EVENTS[event].category === category,
  );
}

export function eventLabel(event: EventName): string {
  return EVENTS[event].label;
}
