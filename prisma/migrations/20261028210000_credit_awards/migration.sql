-- AlterEnum
-- `OWNER` sxemada migration'siz qo'shilgan edi; IF NOT EXISTS production
-- bazasida qiymat allaqachon bor bo'lsa ham xavfsiz qo'llanadi.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OWNER';

-- CreateTable
CREATE TABLE "CreditAward" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "awardedById" TEXT NOT NULL,
    "credits" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditAward_studentId_idx" ON "CreditAward"("studentId");

-- CreateIndex
CREATE INDEX "CreditAward_awardedById_idx" ON "CreditAward"("awardedById");

-- AddForeignKey
ALTER TABLE "CreditAward" ADD CONSTRAINT "CreditAward_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAward" ADD CONSTRAINT "CreditAward_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
