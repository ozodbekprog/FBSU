import { describe, expect, it } from "vitest";
import { EVENT_SEVERITY, SECURE_EVENT_TYPES, severityOf, warningWeight } from "./events";

describe("SECURE_EVENT_TYPES", () => {
  it("har bir tur uchun og'irlik darajasi belgilangan", () => {
    for (const type of SECURE_EVENT_TYPES) {
      expect(EVENT_SEVERITY[type]).toBeDefined();
    }
  });
});

describe("severityOf", () => {
  it("nazorat hodisalarini to'g'ri darajalaydi", () => {
    expect(severityOf("TAB_HIDDEN")).toBe("WARNING");
    expect(severityOf("WINDOW_BLUR")).toBe("WARNING");
    expect(severityOf("FULLSCREEN_EXIT")).toBe("WARNING");
    expect(severityOf("COPY")).toBe("WARNING");
    expect(severityOf("MULTI_MONITOR")).toBe("CRITICAL");
    expect(severityOf("SUBMIT")).toBe("INFO");
    expect(severityOf("FACE_ABSENT")).toBe("WARNING");
    expect(severityOf("FACE_MULTIPLE")).toBe("CRITICAL");
    expect(severityOf("AUTOMATION_DETECTED")).toBe("CRITICAL");
    expect(severityOf("FACE_OK")).toBe("INFO");
  });
});

describe("warningWeight", () => {
  it("INFO ogohlantirish hisoblanmaydi", () => {
    expect(warningWeight("INFO", 3)).toBe(0);
  });

  it("WARNING bir birlik qo'shadi", () => {
    expect(warningWeight("WARNING", 3)).toBe(1);
  });

  it("CRITICAL limitni birdaniga to'ldiradi", () => {
    expect(warningWeight("CRITICAL", 3)).toBe(3);
    expect(warningWeight("CRITICAL", 0)).toBe(1);
  });
});
