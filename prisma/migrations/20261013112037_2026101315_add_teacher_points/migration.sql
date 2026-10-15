-- CreateTable
CREATE TABLE "TeacherPoint" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "awardedById" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherPoint_studentId_idx" ON "TeacherPoint"("studentId");

-- CreateIndex
CREATE INDEX "TeacherPoint_courseId_idx" ON "TeacherPoint"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherPoint_courseId_studentId_awardedById_category_key" ON "TeacherPoint"("courseId", "studentId", "awardedById", "category");

-- AddForeignKey
ALTER TABLE "TeacherPoint" ADD CONSTRAINT "TeacherPoint_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPoint" ADD CONSTRAINT "TeacherPoint_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPoint" ADD CONSTRAINT "TeacherPoint_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
