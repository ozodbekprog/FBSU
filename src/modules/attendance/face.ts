export const FACE_MATCH_THRESHOLD = 0.55;
export const FACE_DESCRIPTOR_LENGTH = 128;

export function isValidFaceDescriptor(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === FACE_DESCRIPTOR_LENGTH &&
    value.every((item) => typeof item === "number" && Number.isFinite(item) && Math.abs(item) < 100)
  );
}

export function faceDistance(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    const diff = a[index] - b[index];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function faceMatches(stored: unknown, candidate: unknown): boolean {
  if (!isValidFaceDescriptor(stored) || !isValidFaceDescriptor(candidate)) return false;
  return faceDistance(stored, candidate) <= FACE_MATCH_THRESHOLD;
}

export type FaceCheck = "ok" | "missing" | "mismatch" | "not_enrolled";

export function checkFace(stored: unknown, candidate: unknown): FaceCheck {
  if (!isValidFaceDescriptor(stored)) return "not_enrolled";
  if (!isValidFaceDescriptor(candidate)) return "missing";
  return faceMatches(stored, candidate) ? "ok" : "mismatch";
}
