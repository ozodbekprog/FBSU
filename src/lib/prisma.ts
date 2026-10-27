import { PrismaClient } from "@prisma/client";
import { encryptionExtension } from "@/lib/db-encryption";

function createClient() {
  return new PrismaClient().$extends(encryptionExtension);
}

type ExtendedPrismaClient = ReturnType<typeof createClient>;

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

const client = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;

/**
 * Tur runtime'da kengaytirilgan (shifrlash) client, lekin asosiy `PrismaClient`
 * sifatida e'lon qilinadi — kod bazasi `Prisma.TransactionClient`ni kutadigan
 * funksiyalarga uzatilganda mos kelishi uchun.
 */
export const prisma = client as unknown as PrismaClient;
