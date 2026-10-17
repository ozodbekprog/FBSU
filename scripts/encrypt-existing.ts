import { PrismaClient } from "@prisma/client";
import { encryptByMode, isEncrypted } from "../src/lib/crypto.ts";
import { PII_FIELDS } from "../src/lib/pii.ts";

type Delegate = {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
};

const prisma = new PrismaClient();

function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

async function main() {
  let scanned = 0;
  let updated = 0;

  for (const [model, fields] of Object.entries(PII_FIELDS)) {
    const delegate = (prisma as unknown as Record<string, Delegate>)[delegateName(model)];
    if (!delegate) {
      console.warn(`! Prisma delegati topilmadi: ${delegateName(model)}`);
      continue;
    }

    const rows = await delegate.findMany();
    scanned += rows.length;

    for (const row of rows) {
      const id = row.id;
      if (typeof id !== "string") continue;

      const data: Record<string, unknown> = {};
      for (const [field, mode] of Object.entries(fields)) {
        const value = row[field];
        if (value === null || value === undefined) continue;
        if (isEncrypted(value)) continue;
        data[field] = encryptByMode(value, mode);
      }

      if (Object.keys(data).length === 0) continue;
      await delegate.update({ where: { id }, data });
      updated += 1;
    }

    console.log(`✓ ${model}: ${rows.length} yozuv tekshirildi`);
  }

  console.log(`\nTayyor. Ko'rildi: ${scanned}, shifrlandi: ${updated}.`);
}

main()
  .catch((error) => {
    console.error("Xato:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
