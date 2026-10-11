-- Ovozli xabarlar, fayl ilovalari va xabar forward qilish.

CREATE TYPE "MessageType" AS ENUM ('TEXT', 'VOICE', 'FILE');
CREATE TYPE "AttachmentKind" AS ENUM ('VOICE', 'IMAGE', 'FILE');

ALTER TABLE "Message"
    ADD COLUMN "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    ADD COLUMN "forwardedFromId" TEXT,
    ADD COLUMN "forwardedAt" TIMESTAMP(3);

CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");
CREATE INDEX "Message_forwardedFromId_idx" ON "Message"("forwardedFromId");

ALTER TABLE "MessageAttachment"
    ADD CONSTRAINT "MessageAttachment_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_forwardedFromId_fkey"
    FOREIGN KEY ("forwardedFromId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
