import { describe, expect, it } from "vitest";
import { jitsiEmbedUrl, jitsiUrl, roomNameFrom } from "@/lib/jitsi";

describe("roomNameFrom", () => {
  it("returns the same room for the same seed", () => {
    expect(roomNameFrom("abc")).toBe(roomNameFrom("abc"));
  });

  it("returns different rooms for different seeds", () => {
    expect(roomNameFrom("abc")).not.toBe(roomNameFrom("xyz"));
  });

  it("starts with fbsu- and contains only lowercase letters, digits and dashes", () => {
    const room = roomNameFrom("some lesson seed");
    expect(room.startsWith("fbsu-")).toBe(true);
    expect(room).toMatch(/^[a-z0-9-]+$/);
    expect(room.length).toBeLessThanOrEqual(40);
  });

  it("does not throw on empty seed", () => {
    expect(() => roomNameFrom("")).not.toThrow();
    expect(roomNameFrom("").startsWith("fbsu-")).toBe(true);
  });
});

describe("jitsiUrl", () => {
  it("builds the room link", () => {
    expect(jitsiUrl("room")).toBe("https://meet.jit.si/room");
  });
});

describe("jitsiEmbedUrl", () => {
  it("contains the room base url", () => {
    expect(jitsiEmbedUrl("room")).toContain("https://meet.jit.si/room");
    expect(jitsiEmbedUrl("room")).toContain("config.prejoinPageEnabled=false");
  });

  it("includes the encoded display name", () => {
    const url = jitsiEmbedUrl("room", "Ali Vali");
    expect(url).toContain("https://meet.jit.si/room");
    expect(url).toContain(`userInfo.displayName=%22${encodeURIComponent("Ali Vali")}%22`);
  });
});
