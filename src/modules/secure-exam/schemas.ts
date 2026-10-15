import { z } from "zod";
import {
  MAX_DURATION_MIN,
  MAX_EVENTS_PER_SYNC,
  MAX_EXTRA_MINUTES,
  MAX_WARNINGS_LIMIT,
} from "./config";
import { SECURE_EVENT_TYPES } from "./events";

export const answerValueSchema = z.union([
  z.number().int().min(0),
  z.array(z.number().int().min(0)).max(20),
  z.string().max(5000),
]);

export const answersSchema = z.record(z.string(), answerValueSchema);

export const secureEventSchema = z.object({
  type: z.enum(SECURE_EVENT_TYPES),
  meta: z
    .record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()]))
    .optional(),
});

export const clientInfoSchema = z.object({
  clientId: z.string().trim().min(1).max(64).optional(),
  version: z.string().trim().min(1).max(32).optional(),
  platform: z.string().trim().min(1).max(32).optional(),
  screens: z.number().int().min(1).max(8).optional(),
  fullscreen: z.boolean().optional(),
  webcam: z.boolean().optional(),
});

export const syncSchema = z.object({
  client: clientInfoSchema.optional(),
  events: z.array(secureEventSchema).max(MAX_EVENTS_PER_SYNC).optional(),
  answers: answersSchema.optional(),
  submit: z.boolean().optional(),
  face: z.object({ descriptor: z.array(z.number().finite()).max(256) }).optional(),
});

export const secureExamCreateSchema = z.object({
  quizId: z.string().min(1, "Testni tanlang"),
  title: z.string().trim().min(1, "Nomi kiritilishi shart").max(200),
  startsAt: z.string().min(1, "Boshlanish vaqtini kiriting"),
  endsAt: z.string().min(1, "Tugash vaqtini kiriting"),
  durationMin: z.number().int().min(1).max(MAX_DURATION_MIN).nullable(),
  requireFullscreen: z.boolean(),
  blockCopy: z.boolean(),
  requireClient: z.boolean(),
  webcamEnabled: z.boolean(),
  maxWarnings: z.number().int().min(1).max(MAX_WARNINGS_LIMIT),
  limitAction: z.enum(["WARN", "TERMINATE"]),
});

export const secureExamUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const extraTimeSchema = z.object({
  minutes: z.number().int().min(1).max(MAX_EXTRA_MINUTES),
});
