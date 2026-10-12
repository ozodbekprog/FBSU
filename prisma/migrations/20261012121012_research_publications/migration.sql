-- CreateEnum
CREATE TYPE "PublicationKind" AS ENUM ('ARTICLE', 'CONFERENCE', 'MONOGRAPH', 'PATENT', 'TEXTBOOK');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PublicationIndexing" AS ENUM ('NONE', 'SCOPUS', 'WOS', 'RINC', 'LOCAL');

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "PublicationKind" NOT NULL DEFAULT 'ARTICLE',
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "indexing" "PublicationIndexing" NOT NULL DEFAULT 'NONE',
    "authors" TEXT,
    "journal" TEXT,
    "year" INTEGER,
    "doi" TEXT,
    "url" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Publication_userId_idx" ON "Publication"("userId");

-- CreateIndex
CREATE INDEX "Publication_year_idx" ON "Publication"("year");

-- CreateIndex
CREATE INDEX "Publication_kind_idx" ON "Publication"("kind");

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
