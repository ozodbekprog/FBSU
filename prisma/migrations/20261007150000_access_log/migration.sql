-- Turniket kirish-chiqish jurnali
CREATE TYPE "AccessDirection" AS ENUM ('IN', 'OUT');

CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "direction" "AccessDirection" NOT NULL,
    "gate" TEXT NOT NULL DEFAULT 'Asosiy kirish',
    "method" TEXT NOT NULL DEFAULT 'QR',
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccessLog_userId_at_idx" ON "AccessLog"("userId", "at");
CREATE INDEX "AccessLog_at_idx" ON "AccessLog"("at");

ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
