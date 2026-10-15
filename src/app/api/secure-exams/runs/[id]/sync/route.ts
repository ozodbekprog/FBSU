import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicError } from "@/components/quiz/server";
import { asAnswers } from "@/components/quiz/shared";
import { severityOf, warningWeight } from "@/modules/secure-exam/events";
import { remapAnswersToOriginal } from "@/modules/secure-exam/order";
import { effectiveDeadline, shouldTerminate } from "@/modules/secure-exam/policy";
import { syncSchema } from "@/modules/secure-exam/schemas";
import { FACE_MISMATCH_COOLDOWN_MS } from "@/modules/secure-exam/config";
import type { RunState } from "@/modules/secure-exam/types";
import { checkFace } from "@/modules/attendance/face";
import { buildRunState, finalizeRun } from "@/server/secure-exam";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "STUDENT") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const parsed = syncSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" },
      { status: 400 },
    );
  }

  try {
    const run = await prisma.secureExamRun.findUnique({
      where: { id },
      include: {
        exam: {
          select: {
            maxWarnings: true,
            limitAction: true,
            endsAt: true,
            durationMin: true,
          },
        },
        student: { select: { faceDescriptor: true } },
        attempt: {
          include: {
            quiz: {
              select: {
                timeLimitMin: true,
                questions: {
                  select: { id: true, options: true },
                  orderBy: { position: "asc" },
                },
              },
            },
          },
        },
      },
    });
    if (!run || run.studentId !== user.id) {
      return Response.json({ ok: false, error: "Urinish topilmadi" }, { status: 404 });
    }

    const now = new Date();
    const durationMin = run.exam.durationMin ?? run.attempt.quiz.timeLimitMin;
    const questions = run.attempt.quiz.questions.map((question) => ({
      id: question.id,
      options: Array.isArray(question.options) ? question.options : [],
    }));

    let faceCheck: RunState["face"] | undefined;
    const outcome = await prisma.$transaction(async (tx) => {
      const current = await tx.secureExamRun.findUnique({ where: { id } });
      if (!current) return null;

      const freshAttempt = await tx.quizAttempt.findUnique({
        where: { id: current.attemptId },
        select: { finishedAt: true, answers: true },
      });

      if (current.status !== "ACTIVE") return current;

      if (freshAttempt?.finishedAt) {
        return tx.secureExamRun.update({
          where: { id },
          data: { status: "SUBMITTED", finishedAt: freshAttempt.finishedAt, lastSeenAt: now },
        });
      }

      const deadline = effectiveDeadline({
        startedAt: current.startedAt,
        durationMin,
        sittingEndsAt: run.exam.endsAt,
        extraMin: current.extraMin,
      });
      if (deadline && now.getTime() >= deadline.getTime()) {
        await tx.secureExamEvent.create({
          data: { runId: id, type: "TIMEOUT", severity: "INFO", meta: { reason: "deadline" } },
        });
        await finalizeRun(tx, id, "SUBMITTED", now);
        return tx.secureExamRun.findUnique({ where: { id } });
      }

      const client = parsed.data.client;
      const data: Prisma.SecureExamRunUpdateInput = { lastSeenAt: now };
      if (client) {
        if (client.clientId !== undefined) data.clientId = client.clientId;
        if (client.version !== undefined) data.clientVersion = client.version;
        if (client.screens !== undefined) data.screens = client.screens;
        if (client.fullscreen !== undefined) data.fullscreen = client.fullscreen;
        if (client.webcam !== undefined) data.webcam = client.webcam;
      }
      await tx.secureExamRun.update({ where: { id }, data });

      if (parsed.data.answers) {
        const remapped = remapAnswersToOriginal(
          asAnswers(parsed.data.answers),
          questions,
          current.attemptId,
        );
        const merged = { ...asAnswers(freshAttempt?.answers), ...remapped };
        await tx.quizAttempt.update({
          where: { id: current.attemptId },
          data: { answers: merged },
        });
      }

      const events = parsed.data.events ?? [];
      let addedWarnings = 0;
      if (events.length > 0) {
        await tx.secureExamEvent.createMany({
          data: events.map((event) => ({
            runId: id,
            type: event.type,
            severity: severityOf(event.type),
            meta: event.meta,
          })),
        });
        addedWarnings = events.reduce(
          (sum, event) => sum + warningWeight(severityOf(event.type), run.exam.maxWarnings),
          0,
        );
      }

      if (
        client?.screens !== undefined &&
        client.screens >= 2 &&
        !events.some((event) => event.type === "MULTI_MONITOR")
      ) {
        const existing = await tx.secureExamEvent.count({
          where: { runId: id, type: "MULTI_MONITOR" },
        });
        if (existing === 0) {
          await tx.secureExamEvent.create({
            data: { runId: id, type: "MULTI_MONITOR", severity: "CRITICAL" },
          });
          addedWarnings += warningWeight("CRITICAL", run.exam.maxWarnings);
        }
      }

      if (parsed.data.face?.descriptor) {
        const check = checkFace(run.student.faceDescriptor, parsed.data.face.descriptor);
        faceCheck = { check };
        if (check === "ok") {
          const existingOk = await tx.secureExamEvent.count({
            where: { runId: id, type: "FACE_OK" },
          });
          if (existingOk === 0) {
            await tx.secureExamEvent.create({
              data: { runId: id, type: "FACE_OK", severity: "INFO" },
            });
          }
        } else if (check === "mismatch") {
          const recent = await tx.secureExamEvent.count({
            where: {
              runId: id,
              type: "FACE_MISMATCH",
              at: { gte: new Date(now.getTime() - FACE_MISMATCH_COOLDOWN_MS) },
            },
          });
          if (recent === 0) {
            await tx.secureExamEvent.create({
              data: {
                runId: id,
                type: "FACE_MISMATCH",
                severity: "WARNING",
                meta: { source: "sync" },
              },
            });
            addedWarnings += warningWeight("WARNING", run.exam.maxWarnings);
          }
        }
      }

      if (addedWarnings > 0) {
        await tx.secureExamRun.update({
          where: { id },
          data: { warnings: { increment: addedWarnings } },
        });
      }

      const after = await tx.secureExamRun.findUnique({ where: { id } });
      if (!after) return null;

      if (parsed.data.submit) {
        await tx.secureExamEvent.create({
          data: { runId: id, type: "SUBMIT", severity: "INFO" },
        });
        await finalizeRun(tx, id, "SUBMITTED", now);
        return tx.secureExamRun.findUnique({ where: { id } });
      }

      if (shouldTerminate(after.warnings, run.exam.maxWarnings, run.exam.limitAction)) {
        await tx.secureExamEvent.create({
          data: {
            runId: id,
            type: "TERMINATED",
            severity: "INFO",
            meta: { reason: "warnings" },
          },
        });
        await finalizeRun(tx, id, "TERMINATED", now);
        return tx.secureExamRun.findUnique({ where: { id } });
      }

      return after;
    });

    if (!outcome) {
      return Response.json({ ok: false, error: "Urinish topilmadi" }, { status: 404 });
    }

    const state = buildRunState({
      status: outcome.status,
      warnings: outcome.warnings,
      maxWarnings: run.exam.maxWarnings,
      limitAction: run.exam.limitAction,
      startedAt: outcome.startedAt,
      finishedAt: outcome.finishedAt,
      durationMin,
      sittingEndsAt: run.exam.endsAt,
      extraMin: outcome.extraMin,
      now,
      face: faceCheck,
    });

    return Response.json({ ok: true, data: state });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
