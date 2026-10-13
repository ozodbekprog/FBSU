import { describe, expect, it } from "vitest";
import { isNavActive, resolveActiveHref } from "./nav-active";

const FIN = ["/finance", "/finance/rates", "/exams", "/dashboard"];

describe("nav faol holati", () => {
  it("aniq moslik", () => {
    expect(resolveActiveHref("/dashboard", FIN)).toBe("/dashboard");
  });

  it("ichki sahifada eng aniq moslik tanlanadi", () => {
    // /finance ikki marta faol bo'lmasligi kerak
    expect(resolveActiveHref("/finance/rates", FIN)).toBe("/finance/rates");
    expect(resolveActiveHref("/finance", FIN)).toBe("/finance");
  });

  it("aniq moslik bo'lmasa eng uzun prefiks tanlanadi", () => {
    expect(resolveActiveHref("/finance/barchasi", FIN)).toBe("/finance");
    expect(resolveActiveHref("/exams/sessions/x", FIN)).toBe("/exams");
  });

  it("moslik yo'q bo'lsa null", () => {
    expect(resolveActiveHref("/yoq", FIN)).toBeNull();
    expect(resolveActiveHref(null, FIN)).toBeNull();
  });

  it("prefiks mosligi bo'lmagan yollarni chalkashtirmaydi", () => {
    // "/finance-extra" — "/finance" ning ichki sahifasi emas
    expect(resolveActiveHref("/finance-extra", FIN)).toBeNull();
  });

  it("faqat bitta havola faol bo'ladi", () => {
    const active = resolveActiveHref("/finance/rates", FIN);
    const activeCount = FIN.filter((href) => isNavActive("/finance/rates", active, href)).length;
    expect(activeCount).toBe(1);
  });

  it("har bir havola uchun faol bo'lishi mumkin", () => {
    for (const href of FIN) {
      expect(resolveActiveHref(href, FIN)).toBe(href);
    }
  });
});