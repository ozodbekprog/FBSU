-- CreateTable
CREATE TABLE "OwnerAccessCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerAccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnerAccessCode_expiresAt_idx" ON "OwnerAccessCode"("expiresAt");
