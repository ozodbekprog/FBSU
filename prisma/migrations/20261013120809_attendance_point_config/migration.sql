-- CreateTable
CREATE TABLE "AttendancePointConfig" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "groupId" TEXT,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePointConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendancePointConfig_courseId_idx" ON "AttendancePointConfig"("courseId");

-- CreateIndex
CREATE INDEX "AttendancePointConfig_groupId_idx" ON "AttendancePointConfig"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePointConfig_courseId_groupId_key" ON "AttendancePointConfig"("courseId", "groupId");

-- AddForeignKey
ALTER TABLE "AttendancePointConfig" ADD CONSTRAINT "AttendancePointConfig_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePointConfig" ADD CONSTRAINT "AttendancePointConfig_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePointConfig" ADD CONSTRAINT "AttendancePointConfig_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
