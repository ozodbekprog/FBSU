import { EXAM_CODE_ALPHABET, EXAM_CODE_LENGTH } from "./config";

export function normalizeExamCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidExamCode(value: string): boolean {
  const normalized = normalizeExamCode(value);
  if (normalized.length !== EXAM_CODE_LENGTH) return false;
  for (const char of normalized) {
    if (!EXAM_CODE_ALPHABET.includes(char)) return false;
  }
  return true;
}

export function formatExamCode(value: string): string {
  const normalized = normalizeExamCode(value);
  if (normalized.length !== EXAM_CODE_LENGTH) return normalized;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
}

export function generateExamCode(random: () => number = Math.random): string {
  let code = "";
  for (let index = 0; index < EXAM_CODE_LENGTH; index += 1) {
    code += EXAM_CODE_ALPHABET[Math.floor(random() * EXAM_CODE_ALPHABET.length)];
  }
  return code;
}
