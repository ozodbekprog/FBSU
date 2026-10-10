-- Telegram uslubidagi suhbat funksiyalari:
-- mahkamlash, arxiv, ovozsizlik, bloklash, shikoyat, o'chirish.

ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

ALTER TABLE "Conversation" ADD COLUMN "clearedForEveryoneAt" TIMESTAMP(3);

CREATE TABLE "ConversationSetting" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "mutedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationSetting_pkey" PRIMARY KEY ("conversationId", "userId")
);

CREATE TABLE "ChatBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConversationSetting_userId_archivedAt_idx" ON "ConversationSetting"("userId", "archivedAt");
CREATE UNIQUE INDEX "ChatBlock_blockerId_blockedId_key" ON "ChatBlock"("blockerId", "blockedId");
CREATE INDEX "ChatBlock_blockedId_idx" ON "ChatBlock"("blockedId");
CREATE INDEX "UserReport_reportedId_idx" ON "UserReport"("reportedId");

ALTER TABLE "ConversationSetting"
    ADD CONSTRAINT "ConversationSetting_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationSetting"
    ADD CONSTRAINT "ConversationSetting_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatBlock"
    ADD CONSTRAINT "ChatBlock_blockerId_fkey"
    FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatBlock"
    ADD CONSTRAINT "ChatBlock_blockedId_fkey"
    FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserReport"
    ADD CONSTRAINT "UserReport_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserReport"
    ADD CONSTRAINT "UserReport_reportedId_fkey"
    FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- "Tarixni tozalash" — sozlash jadvalida per-user vaqt
ALTER TABLE "ConversationSetting" ADD COLUMN "clearedAt" TIMESTAMP(3);
