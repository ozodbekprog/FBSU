-- Sessiya avtomatik yopilishi va istisno bilan qayta ochish uchun
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "isException" BOOLEAN NOT NULL DEFAULT false;
