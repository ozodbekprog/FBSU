export type ReleaseChannel = "beta" | "stable";

export type Release = {
  version: string;
  channel: ReleaseChannel;
  date: string;
  title: string;
  changes: string[];
};

export const APP_VERSION = "1.0.0-beta.1";
export const APP_CHANNEL: ReleaseChannel = "beta";
export const APP_RELEASED_AT = "2026-10-17";

export const RELEASES: Release[] = [
  {
    version: "1.0.0-beta.1",
    channel: "beta",
    date: "2026-10-17",
    title: "Ofis moduli va beta start",
    changes: [
      "Ofis: Word, Excel va PowerPoint muharrirlari, avtosaqlash, PDF/CSV eksport",
      "Ofis barcha rollar uchun ochildi, shu jumladan talabalar uchun",
      "Relizlar tarixi sahifasi va sayt bo'ylab beta belgisi",
      "Rasmiy hujjatlar registri ofis fayllaridan tozalandi",
    ],
  },
  {
    version: "0.9.0",
    channel: "beta",
    date: "2026-10-17",
    title: "To'lqin A–E: baholar, eksport, glossariy",
    changes: [
      "Baholar jurnali: ustunlarni topshiriq/test bilan bog'lash, bulk amallar",
      "Kurs eksport/import (v2), CSV eksport, topshiriq muddatini uzaytirish",
      "Testlar: MATCHING/ORDERING savol turlari va so'rovnoma moduli",
      "Glossariy, mobil API v1, rollar va capability tizimi",
    ],
  },
  {
    version: "0.5.0",
    channel: "beta",
    date: "2026-10-15",
    title: "Xavfsiz imtihon va EduPage jadvali",
    changes: [
      "Xavfsiz imtihon: QR kirish, yuz nazorati (face guard), kiritma anomaliyasi",
      "EduPage avto jadval: guruh, o'qituvchi, fan va xonalar sinxronizatsiyasi",
      "OWNER roli, Telegram 2FA va audit zanjiri",
    ],
  },
  {
    version: "0.1.0",
    channel: "beta",
    date: "2026-09-17",
    title: "Birinchi yadro",
    changes: [
      "Auth, kurslar, topshiriqlar, testlar, davomat va admin panel",
      "PostgreSQL + Prisma, Next.js App Router va Tailwind UI kit",
      "Landing sahifa va demo ma'lumotlar bazasi",
    ],
  },
];

export const CURRENT_RELEASE = RELEASES[0];
