-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN "quizPassword" TEXT,
ADD COLUMN "ipSubnet" TEXT;

-- CreateTable
CREATE TABLE "GradeItemScoreHistory" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "oldScore" DOUBLE PRECISION,
    "newScore" DOUBLE PRECISION,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeItemScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeItemScoreHistory_itemId_studentId_idx" ON "GradeItemScoreHistory"("itemId", "studentId");

-- CreateIndex
CREATE INDEX "GradeItemScoreHistory_createdAt_idx" ON "GradeItemScoreHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "GradeItemScoreHistory" ADD CONSTRAINT "GradeItemScoreHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GradeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeItemScoreHistory" ADD CONSTRAINT "GradeItemScoreHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
