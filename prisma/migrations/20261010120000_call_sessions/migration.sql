-- Video qo'ng'iroq: 1-kishilik WebRTC sessiyalari va polling orqali signal almashinuvi.
-- Media oqimi P2P; server faqat signalni (offer/answer/ICE) saqlaydi.

CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ACTIVE', 'ENDED', 'DECLINED', 'MISSED');
CREATE TYPE "CallSignalType" AS ENUM ('OFFER', 'ANSWER', 'ICE', 'HANGUP');

CREATE TABLE "CallSession" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "calleeId" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CallSignal" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "type" "CallSignalType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CallSession_calleeId_status_idx" ON "CallSession"("calleeId", "status");
CREATE INDEX "CallSession_callerId_status_idx" ON "CallSession"("callerId", "status");
CREATE INDEX "CallSession_status_createdAt_idx" ON "CallSession"("status", "createdAt");
CREATE INDEX "CallSignal_callId_createdAt_idx" ON "CallSignal"("callId", "createdAt");

ALTER TABLE "CallSession"
    ADD CONSTRAINT "CallSession_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallSession"
    ADD CONSTRAINT "CallSession_callerId_fkey"
    FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallSession"
    ADD CONSTRAINT "CallSession_calleeId_fkey"
    FOREIGN KEY ("calleeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallSignal"
    ADD CONSTRAINT "CallSignal_callId_fkey"
    FOREIGN KEY ("callId") REFERENCES "CallSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
