/*
  Warnings:

  - The primary key for the `ConversationSetting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[conversationId,userId]` on the table `ConversationSetting` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "StudyPlan_courseId_idx";

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "audience" JSONB,
ALTER COLUMN "courseId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ConversationSetting" DROP CONSTRAINT "ConversationSetting_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSetting_conversationId_userId_key" ON "ConversationSetting"("conversationId", "userId");
