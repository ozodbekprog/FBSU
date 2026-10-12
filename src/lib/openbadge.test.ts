import { describe, expect, it } from "vitest";
import { buildBadge, signBadge, verifyBadge, type BadgeInput } from "./openbadge";

const baseInput: BadgeInput = {
  certificateId: "cert-123",
  recipientName: "Ali Valiyev",
  achievementName: "Web Dasturlash",
  achievementDescription: "Kursni tamomlaganlik",
  issuerName: "FBSU",
  issuedAt: "2026-01-15T10:00:00.000Z",
  grade: null,
  baseUrl: "https://fbsu.example.com",
};

describe("buildBadge", () => {
  it("builds the Open Badges 3.0 context array", () => {
    const badge = buildBadge(baseInput);
    expect(badge["@context"]).toEqual([
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ]);
  });

  it("includes both credential types", () => {
    const badge = buildBadge(baseInput);
    expect(badge.type).toContain("VerifiableCredential");
    expect(badge.type).toContain("OpenBadgeCredential");
  });

  it("derives the id from baseUrl", () => {
    const badge = buildBadge(baseInput);
    expect(String(badge.id)).toBe(
      "https://fbsu.example.com/api/badges/cert-123",
    );
    expect(String(badge.id).startsWith(baseInput.baseUrl)).toBe(true);
  });

  it("carries the achievement name", () => {
    const badge = buildBadge(baseInput);
    const subject = badge.credentialSubject as {
      achievement: { name: string };
    };
    expect(subject.achievement.name).toBe("Web Dasturlash");
  });

  it("omits result when grade is null", () => {
    const badge = buildBadge(baseInput);
    const subject = badge.credentialSubject as Record<string, unknown>;
    expect(subject.result).toBeUndefined();
  });

  it("includes result score when grade is provided", () => {
    const badge = buildBadge({ ...baseInput, grade: 87 });
    const subject = badge.credentialSubject as {
      result: Array<{ resultScore: { score: number } }>;
    };
    expect(subject.result[0].resultScore.score).toBe(87);
  });
});

describe("signBadge / verifyBadge", () => {
  it("attaches a DataIntegrityProof with a jws string", async () => {
    const badge = buildBadge(baseInput);
    const signed = await signBadge(badge, "secret-key");
    const proof = signed.proof as { jws: string; type: string };
    expect(typeof proof.jws).toBe("string");
    expect(proof.type).toBe("DataIntegrityProof");
  });

  it("verifies a signed badge with the same secret", async () => {
    const signed = await signBadge(buildBadge(baseInput), "secret-key");
    expect(await verifyBadge(signed, "secret-key")).toBe(true);
  });

  it("rejects a tampered badge", async () => {
    const signed = await signBadge(buildBadge(baseInput), "secret-key");
    const tampered: Record<string, unknown> = { ...signed };
    tampered.name = "Boshqa kurs";
    expect(await verifyBadge(tampered, "secret-key")).toBe(false);
  });

  it("rejects a badge without proof", async () => {
    const badge = buildBadge(baseInput);
    expect(await verifyBadge(badge, "secret-key")).toBe(false);
  });

  it("rejects a badge signed with a different secret", async () => {
    const signed = await signBadge(buildBadge(baseInput), "secret-key");
    expect(await verifyBadge(signed, "other-secret")).toBe(false);
  });
});
