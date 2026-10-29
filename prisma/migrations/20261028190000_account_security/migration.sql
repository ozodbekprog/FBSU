-- CreateEnum
CREATE TYPE "LoginStatus" AS ENUM ('SUCCESS', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LoginMethod" AS ENUM ('PASSWORD', 'PASSKEY', 'OWNER', 'REGISTER', 'TELEGRAM');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "sessionId" TEXT;

-- CreateTable
CREATE TABLE "TrustedDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "browser" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "city" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIp" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceName" TEXT NOT NULL,
    "platform" TEXT,
    "browser" TEXT,
    "city" TEXT,
    "country" TEXT,
    "location" TEXT,
    "method" "LoginMethod" NOT NULL DEFAULT 'PASSWORD',
    "status" "LoginStatus" NOT NULL DEFAULT 'SUCCESS',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "editedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "LoginRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrustedDevice_deviceHash_key" ON "TrustedDevice"("deviceHash");

-- CreateIndex
CREATE INDEX "TrustedDevice_userId_revokedAt_idx" ON "TrustedDevice"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "LoginRecord_userId_createdAt_idx" ON "LoginRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginRecord_createdAt_idx" ON "LoginRecord"("createdAt");

-- CreateIndex
CREATE INDEX "LoginRecord_deletedAt_idx" ON "LoginRecord"("deletedAt");

-- CreateIndex
CREATE INDEX "AuditLog_sessionId_createdAt_idx" ON "AuditLog"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LoginRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginRecord" ADD CONSTRAINT "LoginRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginRecord" ADD CONSTRAINT "LoginRecord_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "TrustedDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

