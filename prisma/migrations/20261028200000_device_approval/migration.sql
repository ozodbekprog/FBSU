-- CreateTable
CREATE TABLE "DeviceApprovalChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "deviceName" TEXT NOT NULL,
    "platform" TEXT,
    "browser" TEXT,
    "city" TEXT,
    "country" TEXT,
    "location" TEXT,
    "method" "LoginMethod" NOT NULL DEFAULT 'PASSWORD',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceApprovalChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceApprovalChallenge_userId_createdAt_idx" ON "DeviceApprovalChallenge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DeviceApprovalChallenge_expiresAt_idx" ON "DeviceApprovalChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "DeviceApprovalChallenge" ADD CONSTRAINT "DeviceApprovalChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

