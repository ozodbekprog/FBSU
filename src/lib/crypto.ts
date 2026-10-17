import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

const STRING_PREFIX = "enc.v1.";
const JSON_PREFIX = "encj.v1.";
const BYTES_PREFIX = Buffer.from("encb.v1.", "utf8");
const DETERMINISTIC_IV_LABEL = "det:v1:";

export type EncryptionMode = "randomized" | "deterministic" | "json" | "bytes";

type Keyring = {
  primaryId: string;
  keys: Map<string, Buffer>;
};

let cachedKeyring: Keyring | null = null;

function decodeKey(raw: string): Buffer {
  const value = raw.trim();
  const buffer = /^[0-9a-fA-F]{64}$/.test(value)
    ? Buffer.from(value, "hex")
    : Buffer.from(value, "base64");
  if (buffer.length !== KEY_BYTES) {
    throw new Error("DATA_ENCRYPTION_KEY 32 bayt (base64 yoki hex) bo'lishi shart");
  }
  return buffer;
}

function keyring(): Keyring {
  if (cachedKeyring) return cachedKeyring;

  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY o'rnatilmagan");

  const primaryId = process.env.DATA_ENCRYPTION_KEY_ID?.trim() || "k1";
  const keys = new Map<string, Buffer>();
  keys.set(primaryId, decodeKey(raw));

  for (const [name, value] of Object.entries(process.env)) {
    const match = /^DATA_ENCRYPTION_KEY_([A-Za-z0-9]+)$/.exec(name);
    if (match && match[1] !== "ID" && value) keys.set(match[1], decodeKey(value));
  }

  cachedKeyring = { primaryId, keys };
  return cachedKeyring;
}

function seal(key: Buffer, iv: Buffer, plaintext: Buffer): string {
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

function open(key: Buffer, sealed: string): Buffer {
  const [ivPart, tagPart, cipherPart] = sealed.split(".");
  if (!ivPart || !tagPart || cipherPart === undefined) {
    throw new Error("Shifr ko'rinishi buzilgan");
  }
  const iv = Buffer.from(ivPart, "base64");
  const tag = Buffer.from(tagPart, "base64");
  const ciphertext = Buffer.from(cipherPart, "base64");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Shifr ko'rinishi buzilgan");
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function deterministicIv(key: Buffer, plaintext: Buffer): Buffer {
  return createHmac("sha256", key)
    .update(DETERMINISTIC_IV_LABEL)
    .update(plaintext)
    .digest()
    .subarray(0, IV_BYTES);
}

function openEnvelope(prefix: string, value: string): Buffer {
  const body = value.slice(prefix.length);
  const separator = body.indexOf(":");
  if (separator < 0) throw new Error("Shifr ko'rinishi buzilgan");
  const keyId = body.slice(0, separator);
  const sealed = body.slice(separator + 1);
  const key = keyring().keys.get(keyId);
  if (!key) throw new Error(`Shifrlash kaliti topilmadi: ${keyId}`);
  return open(key, sealed);
}

export function isEncrypted(value: unknown): boolean {
  if (typeof value === "string") {
    return value.startsWith(STRING_PREFIX) || value.startsWith(JSON_PREFIX);
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value.subarray(0, BYTES_PREFIX.length)).equals(BYTES_PREFIX);
  }
  return false;
}

export function encryptString(
  plaintext: string,
  mode: Exclude<EncryptionMode, "json" | "bytes"> = "randomized",
): string {
  if (isEncrypted(plaintext)) return plaintext;
  const { primaryId, keys } = keyring();
  const key = keys.get(primaryId)!;
  const data = Buffer.from(plaintext, "utf8");
  const iv =
    mode === "deterministic"
      ? deterministicIv(key, data)
      : randomBytes(IV_BYTES);
  return `${STRING_PREFIX}${primaryId}:${seal(key, iv, data)}`;
}

export function decryptString(value: string): string {
  if (!value.startsWith(STRING_PREFIX)) return value;
  try {
    return openEnvelope(STRING_PREFIX, value).toString("utf8");
  } catch {
    return value;
  }
}

export function encryptJson(value: unknown): string {
  if (typeof value === "string" && isEncrypted(value)) return value;
  const { primaryId, keys } = keyring();
  const key = keys.get(primaryId)!;
  const data = Buffer.from(JSON.stringify(value ?? null), "utf8");
  return `${JSON_PREFIX}${primaryId}:${seal(key, randomBytes(IV_BYTES), data)}`;
}

export function decryptJson<T = unknown>(value: string): T | string {
  if (!value.startsWith(JSON_PREFIX)) return value;
  try {
    return JSON.parse(openEnvelope(JSON_PREFIX, value).toString("utf8")) as T;
  } catch {
    return value;
  }
}

export function encryptBytes(value: Uint8Array): Buffer {
  if (isEncrypted(value)) return Buffer.from(value);
  const { primaryId, keys } = keyring();
  const key = keys.get(primaryId)!;
  const sealed = seal(key, randomBytes(IV_BYTES), Buffer.from(value));
  return Buffer.concat([BYTES_PREFIX, Buffer.from(`${primaryId}:`, "utf8"), Buffer.from(sealed, "utf8")]);
}

export function decryptBytes(value: Uint8Array): Buffer {
  const buffer = Buffer.from(value);
  if (!buffer.subarray(0, BYTES_PREFIX.length).equals(BYTES_PREFIX)) return buffer;
  const body = buffer.subarray(BYTES_PREFIX.length).toString("utf8");
  const separator = body.indexOf(":");
  if (separator < 0) return buffer;
  const keyId = body.slice(0, separator);
  const key = keyring().keys.get(keyId);
  if (!key) return buffer;
  try {
    return open(key, body.slice(separator + 1));
  } catch {
    return buffer;
  }
}

export function encryptByMode(value: unknown, mode: EncryptionMode): unknown {
  switch (mode) {
    case "deterministic":
      return typeof value === "string" ? encryptString(value, "deterministic") : value;
    case "json":
      return encryptJson(value);
    case "bytes":
      return value instanceof Uint8Array ? encryptBytes(value) : value;
    default:
      return typeof value === "string" ? encryptString(value, "randomized") : value;
  }
}

export function decryptDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    if (value.startsWith(JSON_PREFIX)) return decryptJson(value) as T;
    if (value.startsWith(STRING_PREFIX)) return decryptString(value) as T;
    return value;
  }

  if (value instanceof Date) return value;

  if (value instanceof Uint8Array) {
    return decryptBytes(value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => decryptDeep(item)) as unknown as T;
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      result[key] = decryptDeep(source[key]);
    }
    return result as T;
  }

  return value;
}
