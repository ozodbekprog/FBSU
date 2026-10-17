import { Prisma } from "@prisma/client";
import {
  decryptDeep,
  encryptByMode,
  type EncryptionMode,
} from "@/lib/crypto";
import { deterministicFieldsFor, encryptedFieldsFor } from "@/lib/pii";

const WRITE_PATTERN = /create|update|upsert/;

function encryptDataBlock(model: string, block: unknown): void {
  const fields = encryptedFieldsFor(model);
  if (!fields || !block) return;

  const records = Array.isArray(block) ? block : [block];
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    const data = record as Record<string, unknown>;
    for (const [field, mode] of Object.entries(fields)) {
      if (!(field in data)) continue;
      const value = data[field];
      if (value === null || value === undefined) continue;
      if (mode === "json" && isJsonSentinel(value)) continue;
      data[field] = encryptByMode(value, mode);
    }
  }
}

function isJsonSentinel(value: unknown): boolean {
  return (
    value === Prisma.JsonNull ||
    value === Prisma.DbNull ||
    value === Prisma.AnyNull
  );
}

function encryptScalar(field: string, value: unknown): unknown {
  if (typeof value === "string") {
    return encryptByMode(value, "deterministic");
  }
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? encryptByMode(item, "deterministic") : item)) as unknown;
  }
  if (value && typeof value === "object") {
    const operators = value as Record<string, unknown>;
    const next: Record<string, unknown> = { ...operators };
    for (const key of ["equals", "not", "in", "notIn"]) {
      if (key in next) next[key] = encryptScalar(field, next[key]);
    }
    return next;
  }
  return value;
}

function encryptWhereBlock(model: string, where: unknown): void {
  if (!where || typeof where !== "object") return;
  const deterministic = deterministicFieldsFor(model);
  if (deterministic.size === 0) return;

  const conditions = where as Record<string, unknown>;
  for (const key of Object.keys(conditions)) {
    if (key === "AND" || key === "OR" || key === "NOT") {
      const value = conditions[key];
      if (Array.isArray(value)) value.forEach((item) => encryptWhereBlock(model, item));
      else encryptWhereBlock(model, value);
    } else if (deterministic.has(key)) {
      conditions[key] = encryptScalar(key, conditions[key]);
    }
  }
}

function transformArgs(model: string, operation: string, args: unknown): void {
  if (!args || typeof args !== "object") return;
  const mutable = args as Record<string, unknown>;

  if (WRITE_PATTERN.test(operation)) {
    encryptDataBlock(model, mutable.data);
    if (operation === "upsert") {
      encryptDataBlock(model, mutable.create);
      encryptDataBlock(model, mutable.update);
    }
  }

  if ("where" in mutable) encryptWhereBlock(model, mutable.where);
}

export const encryptionExtension = Prisma.defineExtension({
  name: "field-encryption",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (model) transformArgs(model, operation, args);
        const result = await query(args);
        return decryptDeep(result) as typeof result;
      },
    },
  },
});

export type EncryptionModeName = EncryptionMode;
