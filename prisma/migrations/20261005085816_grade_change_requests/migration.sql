-- CreateEnum
CREATE TYPE "GradeChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "GradeChangeRequest" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "oldScore" INTEGER,
    "newScore" INTEGER,
    "oldFeedback" TEXT,
    "newFeedback" TEXT,
    "reason" TEXT NOT NULL,
    "status" "GradeChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeChangeRequest_status_createdAt_idx" ON "GradeChangeRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "GradeChangeRequest" ADD CONSTRAINT "GradeChangeRequest_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeChangeRequest" ADD CONSTRAINT "GradeChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeChangeRequest" ADD CONSTRAINT "GradeChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
