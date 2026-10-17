import { z } from "zod";
import {
  correctValueSchema,
  questionShapeError,
  questionTypeSchema,
} from "@/components/quiz/schema";

export { questionShapeError };

export const bankQuestionInputSchema = z.object({
  courseId: z.string().trim().min(1).nullable(),
  subjectId: z.string().trim().min(1).nullable(),
  text: z.string().trim().min(1, "Savol matnini kiriting").max(2000),
  type: questionTypeSchema,
  options: z.array(z.string().trim().min(1)).max(10),
  correct: z.array(correctValueSchema).max(20),
  difficulty: z.number().int().min(1).max(3),
});

export const bankQuestionCreateSchema = bankQuestionInputSchema.superRefine((value, ctx) => {
  if (!value.courseId && !value.subjectId) {
    ctx.addIssue({ code: "custom", message: "Kurs yoki fanni tanlang" });
  }
  const issue = questionShapeError(value);
  if (issue) ctx.addIssue({ code: "custom", message: issue });
});

export const bankQuestionUpdateSchema = bankQuestionInputSchema.partial();
