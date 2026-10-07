-- Hujjatlar aylanmasi: rasmiy hujjatlar registri
CREATE TYPE "DocumentKind" AS ENUM ('ORDER', 'LETTER', 'REFERENCE', 'PROTOCOL', 'OTHER');
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PENDING', 'SIGNED', 'REJECTED', 'ARCHIVED');

CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "number" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "signerId" TEXT,
    "signedById" TEXT,
    "signedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Document_number_key" ON "Document"("number");
CREATE INDEX "Document_kind_createdAt_idx" ON "Document"("kind", "createdAt");
CREATE INDEX "Document_status_idx" ON "Document"("status");
CREATE INDEX "Document_createdById_idx" ON "Document"("createdById");

ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
