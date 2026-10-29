-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'MATCHING';
ALTER TYPE "QuestionType" ADD VALUE 'ORDERING';

-- CreateTable
CREATE TABLE "ChoicePoll" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "isMultiple" BOOLEAN NOT NULL DEFAULT false,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoicePoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoiceVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoiceVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChoicePoll_courseId_idx" ON "ChoicePoll"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ChoiceVote_pollId_studentId_optionIndex_key" ON "ChoiceVote"("pollId", "studentId", "optionIndex");

-- CreateIndex
CREATE INDEX "ChoiceVote_pollId_idx" ON "ChoiceVote"("pollId");

-- AddForeignKey
ALTER TABLE "ChoicePoll" ADD CONSTRAINT "ChoicePoll_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceVote" ADD CONSTRAINT "ChoiceVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "ChoicePoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceVote" ADD CONSTRAINT "ChoiceVote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
