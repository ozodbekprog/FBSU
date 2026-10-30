CREATE TYPE "LibraryCopyStatus" AS ENUM ('AVAILABLE', 'ON_LOAN', 'LOST', 'WRITTEN_OFF');

CREATE TYPE "LibraryLoanStatus" AS ENUM ('ACTIVE', 'RETURNED', 'LOST');

CREATE TABLE "LibraryBook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT,
    "category" TEXT,
    "publisher" TEXT,
    "year" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'uz',
    "description" TEXT,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LibraryCopy" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "inventoryNo" TEXT NOT NULL,
    "shelf" TEXT,
    "status" "LibraryCopyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryCopy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LibraryLoan" (
    "id" TEXT NOT NULL,
    "copyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" "LibraryLoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "fineAmount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "LibraryLoan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LibraryBook_title_idx" ON "LibraryBook"("title");

CREATE INDEX "LibraryBook_category_idx" ON "LibraryBook"("category");

CREATE UNIQUE INDEX "LibraryCopy_inventoryNo_key" ON "LibraryCopy"("inventoryNo");

CREATE INDEX "LibraryCopy_bookId_status_idx" ON "LibraryCopy"("bookId", "status");

CREATE INDEX "LibraryLoan_userId_status_idx" ON "LibraryLoan"("userId", "status");

CREATE INDEX "LibraryLoan_copyId_status_idx" ON "LibraryLoan"("copyId", "status");

CREATE INDEX "LibraryLoan_dueAt_status_idx" ON "LibraryLoan"("dueAt", "status");

ALTER TABLE "LibraryCopy" ADD CONSTRAINT "LibraryCopy_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "LibraryCopy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
