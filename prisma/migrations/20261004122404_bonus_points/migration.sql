-- CreateTable
CREATE TABLE "BonusPoint" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "awardedById" TEXT NOT NULL,
    "tenths" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BonusPoint_studentId_idx" ON "BonusPoint"("studentId");

-- CreateIndex
CREATE INDEX "BonusPoint_courseId_idx" ON "BonusPoint"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "BonusPoint_courseId_studentId_awardedById_key" ON "BonusPoint"("courseId", "studentId", "awardedById");

-- AddForeignKey
ALTER TABLE "BonusPoint" ADD CONSTRAINT "BonusPoint_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPoint" ADD CONSTRAINT "BonusPoint_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusPoint" ADD CONSTRAINT "BonusPoint_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
