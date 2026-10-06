-- Og'zaki himoya so'rovlari (AI-davr baholash qatlami)
DO $$ BEGIN
  CREATE TYPE "OralDefenseStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'DONE', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OralDefenseResult" AS ENUM ('PASSED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "OralDefense" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "status" "OralDefenseStatus" NOT NULL DEFAULT 'REQUESTED',
  "note" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "result" "OralDefenseResult",
  "resultNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "OralDefense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OralDefense_assignmentId_studentId_key" ON "OralDefense"("assignmentId", "studentId");
CREATE INDEX IF NOT EXISTS "OralDefense_studentId_idx" ON "OralDefense"("studentId");

DO $$ BEGIN
  ALTER TABLE "OralDefense" ADD CONSTRAINT "OralDefense_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "OralDefense" ADD CONSTRAINT "OralDefense_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "OralDefense" ADD CONSTRAINT "OralDefense_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
