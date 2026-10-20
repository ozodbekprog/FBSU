import { z } from "zod";
import {
  clozeBlankNumbers,
  clozeVariants,
  isTrueFalseOptions,
  type CorrectValue,
  type QuestionType,
} from "@/components/quiz/shared";

export const questionTypeSchema = z.enum([
  "SINGLE",
  "MULTIPLE",
  "TEXT",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "NUMERIC",
  "MATCHING",
  "ORDERING",
  "CLOZE",
  "ESSAY",
]);

export const correctValueSchema = z.union([
  z.number().finite(),
  z.string().trim().min(1).max(500),
]);

export function questionShapeError(input: {
  text: string;
  type: QuestionType;
  options: string[];
  correct: CorrectValue[];
}): string | null {
  if (input.type === "TEXT" || input.type === "ESSAY") {
    if (input.options.length > 0 || input.correct.length > 0) {
      return "Matnli savolda variantlar bo'lmaydi";
    }
    return null;
  }
  if (input.type === "CLOZE") {
    const blanks = clozeBlankNumbers(input.text);
    if (blanks.length === 0) return "Savol matnida [[1]] kabi bo'shliqlar bo'lishi kerak";
    if (blanks.some((value, index) => value !== index + 1)) {
      return "Bo'shliqlar [[1]], [[2]] tartibida raqamlanishi kerak";
    }
    if (input.options.length !== blanks.length) {
      return "Bo'shliqlar soni javoblar soniga teng bo'lishi kerak";
    }
    if (input.options.some((option) => clozeVariants(option).length === 0)) {
      return "Har bir bo'sh joy uchun javob kiriting";
    }
    if (input.correct.length > 0) return "Bo'sh joyni to'ldirishda to'g'ri javob ro'yxati bo'sh bo'lishi kerak";
    return null;
  }
  if (input.type === "TRUE_FALSE") {
    if (!isTrueFalseOptions(input.options)) return "To'g'ri/Noto'g'ri variantlarini yuboring";
    if (input.correct.length !== 1) return "Bitta to'g'ri javobni belgilang";
    const value = input.correct[0];
    if (typeof value !== "number" || (value !== 0 && value !== 1)) {
      return "To'g'ri javob 0 yoki 1 bo'lishi kerak";
    }
    return null;
  }
  if (input.type === "SHORT_ANSWER") {
    if (input.options.length > 0) return "Qisqa javobda variantlar bo'lmaydi";
    if (input.correct.length < 1) return "Kamida bitta qabul qilinadigan javob kiriting";
    if (input.correct.some((item) => typeof item !== "string" || item.trim().length === 0)) {
      return "Qabul qilinadigan javoblar matn bo'lishi kerak";
    }
    return null;
  }
  if (input.type === "NUMERIC") {
    if (input.options.length > 0) return "Raqamli javobda variantlar bo'lmaydi";
    if (input.correct.length !== 1) return "Bitta raqamli javobni kiriting";
    if (typeof input.correct[0] !== "number" || !Number.isFinite(input.correct[0])) {
      return "Javob son bo'lishi kerak";
    }
    return null;
  }
  if (input.type === "MATCHING") {
    if (input.options.length < 2) return "Kamida 2 ta juftlik kiriting";
    if (input.options.length > 10) return "Ko'pi bilan 10 ta juftlik kiriting";
    if (new Set(input.options).size !== input.options.length) {
      return "Chap ustun elementlari takrorlanmasligi kerak";
    }
    if (input.correct.length !== input.options.length) {
      return "Chap va o'ng ustun bir xil sonda bo'lishi kerak";
    }
    if (input.correct.some((item) => typeof item !== "string" || item.trim().length === 0)) {
      return "O'ng ustun qiymatlari matn bo'lishi kerak";
    }
    return null;
  }
  if (input.type === "ORDERING") {
    if (input.options.length < 2) return "Kamida 2 ta element kiriting";
    if (input.options.length > 10) return "Ko'pi bilan 10 ta element kiriting";
    if (input.correct.length > 0) return "Tartiblashda to'g'ri javob ro'yxati bo'sh bo'lishi kerak";
    if (new Set(input.options).size !== input.options.length) {
      return "Elementlar takrorlanmasligi kerak";
    }
    return null;
  }
  if (input.options.length < 2) return "Kamida 2 ta variant kiriting";
  if (
    input.correct.some(
      (index) => typeof index !== "number" || !Number.isInteger(index) || index >= input.options.length,
    )
  ) {
    return "To'g'ri variantlar noto'g'ri belgilangan";
  }
  if (input.type === "SINGLE" && input.correct.length !== 1) {
    return "Bitta to'g'ri variantni belgilang";
  }
  if (input.type === "MULTIPLE" && input.correct.length < 1) {
    return "Kamida bitta to'g'ri variantni belgilang";
  }
  return null;
}

export const questionInputSchema = z
  .object({
    text: z.string().trim().min(1, "Savol matnini kiriting").max(2000),
    type: questionTypeSchema,
    options: z.array(z.string().trim().min(1)).max(10),
    correct: z.array(correctValueSchema).max(20),
    points: z.number().int().min(1).max(100),
  })
  .superRefine((value, ctx) => {
    const issue = questionShapeError(value);
    if (issue) ctx.addIssue({ code: "custom", message: issue });
  });

export const answerValueSchema = z.union([
  z.number().finite(),
  z.array(z.number().int().min(0)).max(20),
  z.array(z.string().max(500)).max(20),
  z.string().max(5000),
]);

export const answersSchema = z.record(z.string(), answerValueSchema);

export const quizMetaSchema = z.object({
  title: z.string().trim().min(1, "Test nomini kiriting").max(200),
  description: z.string().trim().max(2000).nullable(),
  courseId: z.string().min(1, "Kursni tanlang"),
  timeLimitMin: z.number().int().min(1).max(600).nullable(),
  maxAttempts: z.number().int().min(1).max(50),
  isPublished: z.boolean(),
  password: z.string().max(100).optional(),
  ipSubnet: z.string().max(50).nullish(),
});

export const quizCreateSchema = quizMetaSchema.extend({
  questions: z.array(questionInputSchema).max(100).optional(),
});

export const quizUpdateSchema = quizMetaSchema.partial();

export const attemptPatchSchema = z.object({
  answers: answersSchema.optional(),
  score: z.number().int().min(0).optional(),
});
