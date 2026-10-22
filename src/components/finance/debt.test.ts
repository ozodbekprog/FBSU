import { describe, expect, it } from "vitest";
import {
  debtorCount,
  remainingAfterPayment,
  studentTotals,
  totalDebt,
  totalOverpaid,
} from "./debt";

const C = (studentId: string, amount: number, paid: number) => ({ studentId, amount, paid });

describe("moliya qarz hisobi", () => {
  describe("studentTotals", () => {
    it("bitta talabaning shartnomalarini jamlaydi", () => {
      const rows = [C("a", 1000, 400), C("a", 500, 100), C("b", 999, 0)];
      expect(studentTotals(rows, "a")).toEqual({
        count: 2,
        amount: 1500,
        paid: 500,
        debt: 1000,
      });
    });

    it("shartnomasi yo'q talaba uchun nol qaytaradi", () => {
      expect(studentTotals([C("a", 1000, 0)], "z")).toEqual({
        count: 0,
        amount: 0,
        paid: 0,
        debt: 0,
      });
    });

    it("ortiqcha to'lovda manfiy qarz beradi", () => {
      expect(studentTotals([C("a", 1000, 1500)], "a").debt).toBe(-500);
    });
  });

  describe("totalDebt", () => {
    it("faqat musbat qarzlarni yig'adi", () => {
      const rows = [C("a", 1000, 400), C("b", 1000, 1500)];
      // a: 600 qarz, b: ortiqcha — jamlanmaga kirmaydi
      expect(totalDebt(rows)).toBe(600);
    });

    it("ortiqcha to'lov boshqaning qarzini yashirmaydi", () => {
      // Eski xato: contractTotal - paidTotal = 2000 - 2500 < 0 -> 0
      const rows = [C("a", 1000, 1000), C("b", 1000, 1500)];
      expect(totalDebt(rows)).toBe(0);
      expect(totalOverpaid(rows)).toBe(500);
    });

    it("bo'sh ro'yxatda nol", () => {
      expect(totalDebt([])).toBe(0);
    });

    it("to'liq to'langan shartnoma qarz bermaydi", () => {
      expect(totalDebt([C("a", 1000, 1000)])).toBe(0);
    });
  });

  describe("totalOverpaid", () => {
    it("faqat ortiqcha to'lovlarni yig'adi", () => {
      const rows = [C("a", 1000, 400), C("b", 1000, 1500)];
      expect(totalOverpaid(rows)).toBe(500);
    });
  });

  describe("debtorCount", () => {
    it("qarzdorlarni sanaydi", () => {
      const rows = [C("a", 1000, 400), C("b", 1000, 1000), C("c", 1000, 1500)];
      expect(debtorCount(rows)).toBe(1);
    });
  });

  describe("remainingAfterPayment", () => {
    it("to'lovdan keyingi qoldiqni hisoblaydi", () => {
      expect(remainingAfterPayment(1000, 300)).toBe(700);
    });

    it("to'liq to'lovda nol", () => {
      expect(remainingAfterPayment(1000, 1000)).toBe(0);
    });

    it("ortiqcha to'lovda manfiy", () => {
      expect(remainingAfterPayment(1000, 1200)).toBe(-200);
    });

    it("summa kiritilmagan yoki noto'g'ri bo'lsa null", () => {
      expect(remainingAfterPayment(1000, 0)).toBeNull();
      expect(remainingAfterPayment(1000, -5)).toBeNull();
      expect(remainingAfterPayment(1000, Number.NaN)).toBeNull();
    });
  });
});
