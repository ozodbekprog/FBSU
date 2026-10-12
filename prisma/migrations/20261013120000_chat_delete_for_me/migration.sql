-- AlterTable
-- "Suhbatni o'chirish" (Telegram uslubi) — faqat shu foydalanuvchi
-- ro'yxatidan yashiriladi. Yashirin hisoblanadi faqat
-- `deletedAt > lastMessageAt` bo'lganda, ya'ni o'chirilgandan keyin
-- yangi xabar kelmagan bo'lsa.
ALTER TABLE "ConversationSetting" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ConversationSetting_userId_deletedAt_idx" ON "ConversationSetting"("userId", "deletedAt");
