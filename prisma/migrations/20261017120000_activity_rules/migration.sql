-- AlterTable
ALTER TABLE "Course" ADD COLUMN "selfEnrollment" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "ActivityTarget" AS ENUM ('MATERIAL', 'ASSIGNMENT', 'QUIZ');

-- CreateTable
CREATE TABLE "ActivityRule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "targetType" "ActivityTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),

    CONSTRAINT "ActivityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityCompletion" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "targetType" "ActivityTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRule_targetType_targetId_key" ON "ActivityRule"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ActivityRule_courseId_idx" ON "ActivityRule"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityCompletion_studentId_targetType_targetId_key" ON "ActivityCompletion"("studentId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "ActivityCompletion_targetId_idx" ON "ActivityCompletion"("targetId");

-- AddForeignKey
ALTER TABLE "ActivityRule" ADD CONSTRAINT "ActivityRule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityCompletion" ADD CONSTRAINT "ActivityCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
