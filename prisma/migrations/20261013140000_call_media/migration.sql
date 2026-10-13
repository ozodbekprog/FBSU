-- CreateEnum
CREATE TYPE "CallMedia" AS ENUM ('AUDIO', 'VIDEO');

-- AlterTable
ALTER TABLE "CallSession" ADD COLUMN "media" "CallMedia" NOT NULL DEFAULT 'VIDEO';
