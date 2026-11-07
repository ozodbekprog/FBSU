-- AlterTable
ALTER TABLE "BonusPoint" ALTER COLUMN "courseId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "BonusAllocation" (
    "id" TEXT NOT NULL,
    "bonusPointId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "tenths" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BonusAllocation_courseId_idx" ON "BonusAllocation"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "BonusAllocation_bonusPointId_courseId_key" ON "BonusAllocation"("bonusPointId", "courseId");

-- AddForeignKey
ALTER TABLE "BonusAllocation" ADD CONSTRAINT "BonusAllocation_bonusPointId_fkey" FOREIGN KEY ("bonusPointId") REFERENCES "BonusPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusAllocation" ADD CONSTRAINT "BonusAllocation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
