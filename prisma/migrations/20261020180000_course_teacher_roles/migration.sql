-- CreateEnum
CREATE TYPE "CourseTeacherRole" AS ENUM ('LEAD', 'CO_TEACHER', 'ASSISTANT', 'OBSERVER');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "teacherIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Course" ADD COLUMN "managerIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Course" ADD COLUMN "assistantIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CourseTeacher" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CourseTeacherRole" NOT NULL DEFAULT 'CO_TEACHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseTeacher_courseId_userId_key" ON "CourseTeacher"("courseId", "userId");
CREATE INDEX "CourseTeacher_userId_idx" ON "CourseTeacher"("userId");

-- AddForeignKey
ALTER TABLE "CourseTeacher" ADD CONSTRAINT "CourseTeacher_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseTeacher" ADD CONSTRAINT "CourseTeacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing lead teachers become LEAD assignments
INSERT INTO "CourseTeacher" ("id", "courseId", "userId", "role", "createdAt")
SELECT gen_random_uuid()::text, c."id", c."teacherId", 'LEAD'::"CourseTeacherRole", CURRENT_TIMESTAMP
FROM "Course" c
ON CONFLICT ("courseId", "userId") DO NOTHING;

-- Backfill authorization projections
UPDATE "Course" c
SET
    "teacherIds" = COALESCE(
        (SELECT array_agg(ct."userId") FROM "CourseTeacher" ct WHERE ct."courseId" = c."id"),
        ARRAY[]::TEXT[]
    ),
    "managerIds" = COALESCE(
        (SELECT array_agg(ct."userId") FROM "CourseTeacher" ct WHERE ct."courseId" = c."id" AND ct."role" IN ('LEAD', 'CO_TEACHER')),
        ARRAY[]::TEXT[]
    ),
    "assistantIds" = COALESCE(
        (SELECT array_agg(ct."userId") FROM "CourseTeacher" ct WHERE ct."courseId" = c."id" AND ct."role" = 'ASSISTANT'),
        ARRAY[]::TEXT[]
    );

-- Keep projections in sync with membership changes
CREATE OR REPLACE FUNCTION sync_course_teacher_arrays() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    target_course_id TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_course_id := OLD."courseId";
    ELSE
        target_course_id := NEW."courseId";
    END IF;

    UPDATE "Course" c
    SET
        "teacherIds" = COALESCE(
            (SELECT array_agg(ct."userId") FROM "CourseTeacher" ct WHERE ct."courseId" = target_course_id),
            ARRAY[]::TEXT[]
        ),
        "managerIds" = COALESCE(
            (SELECT array_agg(ct."userId") FROM "CourseTeacher" ct WHERE ct."courseId" = target_course_id AND ct."role" IN ('LEAD', 'CO_TEACHER')),
            ARRAY[]::TEXT[]
        ),
        "assistantIds" = COALESCE(
            (SELECT array_agg(ct."userId") FROM "CourseTeacher" ct WHERE ct."courseId" = target_course_id AND ct."role" = 'ASSISTANT'),
            ARRAY[]::TEXT[]
        )
    WHERE c."id" = target_course_id;

    RETURN NULL;
END;
$$;

CREATE TRIGGER "CourseTeacher_sync_arrays"
AFTER INSERT OR UPDATE OR DELETE ON "CourseTeacher"
FOR EACH ROW EXECUTE FUNCTION sync_course_teacher_arrays();

-- Authorization lookups by membership
CREATE INDEX "Course_teacherIds_idx" ON "Course" USING GIN ("teacherIds");
CREATE INDEX "Course_managerIds_idx" ON "Course" USING GIN ("managerIds");
CREATE INDEX "Course_assistantIds_idx" ON "Course" USING GIN ("assistantIds");
