-- AlterTable
ALTER TABLE "ScheduleEntry" ADD COLUMN "sectionId" TEXT;

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN "sectionId" TEXT;

-- CreateIndex
CREATE INDEX "ScheduleEntry_sectionId_idx" ON "ScheduleEntry"("sectionId");

-- CreateIndex
CREATE INDEX "Assignment_sectionId_idx" ON "Assignment"("sectionId");

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
