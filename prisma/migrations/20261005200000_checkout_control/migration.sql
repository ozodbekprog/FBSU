-- Chiqish nazorati: LEFT_EARLY holati + sessiya turi + checkOutAt
DO $$ BEGIN
  ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'LEFT_EARLY';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AttendanceSessionKind" AS ENUM ('CHECK_IN', 'CHECK_OUT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "checkOutAt" TIMESTAMP(3);
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "kind" "AttendanceSessionKind" NOT NULL DEFAULT 'CHECK_IN';
