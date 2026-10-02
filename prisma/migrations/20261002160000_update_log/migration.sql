CREATE TABLE "UpdateLog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "commit" TEXT,
    "branch" TEXT,
    "bugId" TEXT,
    "node" TEXT,
    "author" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpdateLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UpdateLog_createdAt_idx" ON "UpdateLog"("createdAt");
