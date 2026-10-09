-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('NEW', 'DOCUMENTS', 'EXAM', 'PASSED', 'REJECTED', 'ENROLLED');

-- CreateTable
CREATE TABLE "AdmissionProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "degree" TEXT NOT NULL DEFAULT 'BAKALAVR',
    "educationForm" TEXT NOT NULL DEFAULT 'KUNDUZGI',
    "quota" INTEGER NOT NULL DEFAULT 25,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdmissionProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionApplication" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passport" TEXT,
    "school" TEXT,
    "note" TEXT,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'NEW',
    "examScore1" INTEGER,
    "examScore2" INTEGER,
    "interviewScore" INTEGER,
    "decisionNote" TEXT,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdmissionProgram_isActive_idx" ON "AdmissionProgram"("isActive");

-- CreateIndex
CREATE INDEX "AdmissionApplication_status_idx" ON "AdmissionApplication"("status");

-- CreateIndex
CREATE INDEX "AdmissionApplication_programId_idx" ON "AdmissionApplication"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApplication_studentId_key" ON "AdmissionApplication"("studentId");

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_programId_fkey" FOREIGN KEY ("programId") REFERENCES "AdmissionProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
