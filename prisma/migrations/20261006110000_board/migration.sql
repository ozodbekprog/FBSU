-- Onlayn daftar/doska (canvas) saqlash
CREATE TABLE IF NOT EXISTS "Board" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignmentId" TEXT,
  "data" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Board_userId_idx" ON "Board"("userId");
CREATE INDEX IF NOT EXISTS "Board_assignmentId_idx" ON "Board"("assignmentId");

DO $$ BEGIN
  ALTER TABLE "Board" ADD CONSTRAINT "Board_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Board" ADD CONSTRAINT "Board_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
