-- CreateEnum
CREATE TYPE "ScheduleApproval" AS ENUM ('PENDING', 'APPROVED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'REGISTRAR';

-- AlterTable
ALTER TABLE "ScheduleEntry" ADD COLUMN     "approval" "ScheduleApproval" NOT NULL DEFAULT 'APPROVED';
