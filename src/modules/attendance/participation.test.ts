import { describe, expect, it } from "vitest";
import { countsAsParticipated, finalStatusWithoutCheckout } from "./participation";

describe("countsAsParticipated", () => {
  it("faqat PRESENT va LATE qatnashgan hisoblanadi", () => {
    expect(countsAsParticipated("PRESENT")).toBe(true);
    expect(countsAsParticipated("LATE")).toBe(true);
    expect(countsAsParticipated("LEFT_EARLY")).toBe(false);
    expect(countsAsParticipated("ABSENT")).toBe(false);
    expect(countsAsParticipated("EXCUSED")).toBe(false);
    expect(countsAsParticipated("SUSPICIOUS")).toBe(false);
  });
});

describe("finalStatusWithoutCheckout", () => {
  it("chiqish QR urilmasa PRESENT va LATE -> LEFT_EARLY", () => {
    expect(finalStatusWithoutCheckout("PRESENT")).toBe("LEFT_EARLY");
    expect(finalStatusWithoutCheckout("LATE")).toBe("LEFT_EARLY");
  });

  it("boshqa holatlar o'zgarmaydi", () => {
    expect(finalStatusWithoutCheckout("ABSENT")).toBe("ABSENT");
    expect(finalStatusWithoutCheckout("EXCUSED")).toBe("EXCUSED");
    expect(finalStatusWithoutCheckout("SUSPICIOUS")).toBe("SUSPICIOUS");
    expect(finalStatusWithoutCheckout("LEFT_EARLY")).toBe("LEFT_EARLY");
  });
});
