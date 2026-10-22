-- CreateTable
CREATE TABLE "SecureExamSnapshot" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mime" TEXT NOT NULL DEFAULT 'image/jpeg',
    "data" TEXT NOT NULL,

    CONSTRAINT "SecureExamSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecureExamSnapshot_runId_at_idx" ON "SecureExamSnapshot"("runId", "at");

-- AddForeignKey
ALTER TABLE "SecureExamSnapshot" ADD CONSTRAINT "SecureExamSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SecureExamRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
