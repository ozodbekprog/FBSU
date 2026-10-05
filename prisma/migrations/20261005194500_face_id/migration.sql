-- Face ID: talaba yuz deskriptori (128-o'lchamli vektor)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "faceDescriptor" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "faceEnrolledAt" TIMESTAMP(3);
