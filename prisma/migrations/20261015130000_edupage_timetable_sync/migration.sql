-- AlterTable
ALTER TABLE "Group" ADD COLUMN "edupageName" TEXT;

-- AlterTable
ALTER TABLE "ScheduleEntry" ADD COLUMN "source" TEXT;

-- AlterTable
ALTER TABLE "ScheduleEntry" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEntry_source_externalId_key" ON "ScheduleEntry"("source", "externalId");
