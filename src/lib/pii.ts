import type { EncryptionMode } from "@/lib/crypto";

export type ModelEncryption = Record<string, EncryptionMode>;

/**
 * Shaxsga oid (PII) maydonlar ro'yxati: model → maydon → shifrlash turi.
 *
 * - `deterministic` — noyob (`@unique`) yoki aniq moslik bo'yicha qidiriladigan
 *   maydonlar. Bir xil qiymat bir xil shifrga aylanadi (tenglik saqlanadi),
 *   lekin ekvivalentlik oshkor bo'ladi.
 * - `randomized` — qolgan matn maydonlari (har yozuvda boshqa shifr).
 * - `json` — `Json` ustunlar (qiymat JSON matn sifatida shifrlanadi).
 * - `bytes` — `Bytes` ustunlar.
 */
export const PII_FIELDS: Record<string, ModelEncryption> = {
  User: {
    email: "deterministic",
    name: "randomized",
    avatarUrl: "randomized",
    coverUrl: "randomized",
    bio: "randomized",
    preferences: "json",
    faceDescriptor: "json",
  },
  AdmissionApplication: {
    applicantName: "randomized",
    phone: "randomized",
    email: "randomized",
    passport: "randomized",
    school: "randomized",
    note: "randomized",
    decisionNote: "randomized",
  },
  Contract: {
    note: "randomized",
  },
  Payment: {
    note: "randomized",
  },
  Document: {
    title: "randomized",
    body: "randomized",
    number: "deterministic",
  },
  Diploma: {
    number: "deterministic",
    program: "randomized",
    verifyCode: "deterministic",
  },
  Message: {
    body: "randomized",
  },
  MessageAttachment: {
    fileName: "randomized",
    bytes: "bytes",
  },
  Submission: {
    text: "randomized",
    fileUrl: "randomized",
    feedback: "randomized",
  },
  GradeChangeRequest: {
    oldFeedback: "randomized",
    newFeedback: "randomized",
    reason: "randomized",
  },
  Attendance: {
    note: "randomized",
  },
  Notification: {
    title: "randomized",
    body: "randomized",
  },
  Order: {
    subject: "randomized",
    note: "randomized",
    adminComment: "randomized",
  },
  UserReport: {
    reason: "randomized",
    note: "randomized",
  },
  OralDefense: {
    note: "randomized",
    resultNote: "randomized",
  },
  BugReport: {
    message: "randomized",
    stack: "randomized",
  },
  CourseReview: {
    comment: "randomized",
  },
};

export function encryptedFieldsFor(model: string | undefined | null): ModelEncryption | undefined {
  if (!model) return undefined;
  return PII_FIELDS[model];
}

export function deterministicFieldsFor(model: string | undefined | null): Set<string> {
  const fields = encryptedFieldsFor(model);
  if (!fields) return new Set();
  return new Set(
    Object.entries(fields)
      .filter(([, mode]) => mode === "deterministic")
      .map(([field]) => field),
  );
}

export function hasPii(model: string): boolean {
  return model in PII_FIELDS;
}
