export type PasskeyView = {
  id: string;
  name: string;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export const PASSKEY_LIMIT = 10;

export const PASSKEY_NAME_MAX = 40;

export function passkeyName(input: unknown): string {
  if (typeof input !== "string") return "Passkey";
  const trimmed = input.trim().slice(0, PASSKEY_NAME_MAX);
  return trimmed || "Passkey";
}
