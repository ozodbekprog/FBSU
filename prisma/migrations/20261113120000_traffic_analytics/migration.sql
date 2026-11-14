CREATE TABLE "TrafficSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "loginId" TEXT,
    "deviceId" TEXT,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "browser" TEXT,
    "platform" TEXT,
    "deviceType" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "botName" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "referrer" TEXT,
    "landingPath" TEXT NOT NULL,
    "lastPath" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "TrafficSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficPageView" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "path" TEXT NOT NULL,
    "query" TEXT,
    "referrer" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "botName" TEXT,
    "country" TEXT,
    "city" TEXT,
    "ip" TEXT NOT NULL,
    "browser" TEXT,
    "platform" TEXT,
    "deviceType" TEXT,
    "isRsc" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficPageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrafficSession_startedAt_idx" ON "TrafficSession"("startedAt");

-- CreateIndex
CREATE INDEX "TrafficSession_lastSeenAt_idx" ON "TrafficSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "TrafficSession_visitorId_lastSeenAt_idx" ON "TrafficSession"("visitorId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "TrafficSession_userId_startedAt_idx" ON "TrafficSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "TrafficSession_isBot_startedAt_idx" ON "TrafficSession"("isBot", "startedAt");

-- CreateIndex
CREATE INDEX "TrafficPageView_createdAt_idx" ON "TrafficPageView"("createdAt");

-- CreateIndex
CREATE INDEX "TrafficPageView_path_createdAt_idx" ON "TrafficPageView"("path", "createdAt");

-- CreateIndex
CREATE INDEX "TrafficPageView_userId_createdAt_idx" ON "TrafficPageView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TrafficPageView_visitorId_createdAt_idx" ON "TrafficPageView"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "TrafficPageView_sessionId_createdAt_idx" ON "TrafficPageView"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "TrafficPageView_isBot_createdAt_idx" ON "TrafficPageView"("isBot", "createdAt");

-- AddForeignKey
ALTER TABLE "TrafficSession" ADD CONSTRAINT "TrafficSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficSession" ADD CONSTRAINT "TrafficSession_loginId_fkey" FOREIGN KEY ("loginId") REFERENCES "LoginRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficSession" ADD CONSTRAINT "TrafficSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "TrustedDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficPageView" ADD CONSTRAINT "TrafficPageView_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrafficSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficPageView" ADD CONSTRAINT "TrafficPageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

