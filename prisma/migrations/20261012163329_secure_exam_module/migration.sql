-- CreateEnum
CREATE TYPE "SecureExamStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SecureExamRunStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "SecureExamLimitAction" AS ENUM ('WARN', 'TERMINATE');

-- CreateTable
CREATE TABLE "SecureExam" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER,
    "requireFullscreen" BOOLEAN NOT NULL DEFAULT true,
    "blockCopy" BOOLEAN NOT NULL DEFAULT true,
    "requireClient" BOOLEAN NOT NULL DEFAULT false,
    "webcamEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxWarnings" INTEGER NOT NULL DEFAULT 3,
    "limitAction" "SecureExamLimitAction" NOT NULL DEFAULT 'TERMINATE',
    "status" "SecureExamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecureExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecureExamRun" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "status" "SecureExamRunStatus" NOT NULL DEFAULT 'ACTIVE',
    "warnings" INTEGER NOT NULL DEFAULT 0,
    "clientId" TEXT,
    "clientVersion" TEXT,
    "screens" INTEGER,
    "fullscreen" BOOLEAN NOT NULL DEFAULT false,
    "webcam" BOOLEAN NOT NULL DEFAULT false,
    "extraMin" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SecureExamRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecureExamEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "SecureExamEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecureExam_code_key" ON "SecureExam"("code");

-- CreateIndex
CREATE INDEX "SecureExam_courseId_startsAt_idx" ON "SecureExam"("courseId", "startsAt");

-- CreateIndex
CREATE INDEX "SecureExam_status_startsAt_idx" ON "SecureExam"("status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "SecureExamRun_attemptId_key" ON "SecureExamRun"("attemptId");

-- CreateIndex
CREATE INDEX "SecureExamRun_examId_status_idx" ON "SecureExamRun"("examId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SecureExamRun_examId_studentId_key" ON "SecureExamRun"("examId", "studentId");

-- CreateIndex
CREATE INDEX "SecureExamEvent_runId_at_idx" ON "SecureExamEvent"("runId", "at");

-- AddForeignKey
ALTER TABLE "SecureExam" ADD CONSTRAINT "SecureExam_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecureExam" ADD CONSTRAINT "SecureExam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecureExam" ADD CONSTRAINT "SecureExam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecureExamRun" ADD CONSTRAINT "SecureExamRun_examId_fkey" FOREIGN KEY ("examId") REFERENCES "SecureExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecureExamRun" ADD CONSTRAINT "SecureExamRun_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecureExamRun" ADD CONSTRAINT "SecureExamRun_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecureExamEvent" ADD CONSTRAINT "SecureExamEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SecureExamRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
