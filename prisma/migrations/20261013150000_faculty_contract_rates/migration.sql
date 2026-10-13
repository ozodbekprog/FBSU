-- CreateTable
CREATE TABLE "FacultyContractRate" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyContractRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacultyContractRate_facultyId_year_key" ON "FacultyContractRate"("facultyId", "year");

-- CreateIndex
CREATE INDEX "FacultyContractRate_year_idx" ON "FacultyContractRate"("year");

-- AddForeignKey
ALTER TABLE "FacultyContractRate" ADD CONSTRAINT "FacultyContractRate_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;