import { describe, expect, it, vi, beforeEach } from "vitest";

const paymentGroupBy = vi.fn();
const paymentAggregate = vi.fn();

const prismaMock = {
  contract: {
    findMany: vi.fn(),
  },
  payment: {
    groupBy: paymentGroupBy,
    aggregate: paymentAggregate,
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { getFinanceKpis, canViewFinanceSection, formatMoney } = await import(
  "@/app/(app)/monitoring/data-finance"
);

beforeEach(() => {
  paymentGroupBy.mockReset();
  paymentAggregate.mockReset();
  prismaMock.contract.findMany.mockReset();
});

describe("canViewFinanceSection (ko'rinish huquqi)", () => {
  it("finance sahifasi rollari ko'radi: ADMIN, REGISTRAR, REKTOR, PRO_RECTOR", () => {
    expect(canViewFinanceSection("ADMIN")).toBe(true);
    expect(canViewFinanceSection("REGISTRAR")).toBe(true);
    expect(canViewFinanceSection("REKTOR")).toBe(true);
    expect(canViewFinanceSection("PRO_RECTOR")).toBe(true);
  });

  it("boshqa rollar ko'rmaydi: DEKAN, KAFEDRA_MUDIRI, TEACHER, STUDENT, TYUTOR, XODIM", () => {
    expect(canViewFinanceSection("DEKAN")).toBe(false);
    expect(canViewFinanceSection("KAFEDRA_MUDIRI")).toBe(false);
    expect(canViewFinanceSection("TEACHER")).toBe(false);
    expect(canViewFinanceSection("STUDENT")).toBe(false);
    expect(canViewFinanceSection("TYUTOR")).toBe(false);
    expect(canViewFinanceSection("XODIM")).toBe(false);
  });
});

describe("getFinanceKpis (aggregation)", () => {
  it("approved to'lovlar to'g'ri yig'iladi, qarz farqi hisoblanadi", async () => {
    prismaMock.contract.findMany.mockResolvedValue([
      { id: "c1", studentId: "s1", year: 2025, amount: 10_000_000 },
      { id: "c2", studentId: "s2", year: 2025, amount: 8_000_000 },
      { id: "c3", studentId: "s3", year: 2024, amount: 6_000_000 },
    ]);
    // faqat c1 va c3 bo'yicha to'lovlar (approved/amalga oshgan to'lovlar)
    paymentGroupBy.mockResolvedValue([
      { contractId: "c1", _sum: { amount: 4_000_000 } },
      { contractId: "c3", _sum: { amount: 6_000_000 } },
    ]);
    paymentAggregate.mockResolvedValue({ _sum: { amount: 10_000_000 } });

    const kpi = await getFinanceKpis();

    expect(kpi.contractCount).toBe(3);
    expect(kpi.contractTotal).toBe(24_000_000);
    expect(kpi.paidTotal).toBe(10_000_000);
    // qarz = jami shartnoma - to'langan
    expect(kpi.debtTotal).toBe(14_000_000);
    // qarzdorlar: s1 (qarz 6M) va s2 (qarz 8M); s3 to'liq to'lagan
    expect(kpi.debtorsCount).toBe(2);
    // yil kesimi: 2025 — 18M shartnoma, 4M to'langan, 14M qarz
    expect(kpi.byYear).toEqual([
      {
        year: 2025,
        contractCount: 2,
        contractTotal: 18_000_000,
        paidTotal: 4_000_000,
        debtTotal: 14_000_000,
      },
      {
        year: 2024,
        contractCount: 1,
        contractTotal: 6_000_000,
        paidTotal: 6_000_000,
        debtTotal: 0,
      },
    ]);
    expect(prismaMock.contract.findMany).toHaveBeenCalled();
    expect(paymentGroupBy).toHaveBeenCalledWith({
      by: ["contractId"],
      where: { contractId: { in: ["c1", "c2", "c3"] } },
      _sum: { amount: true },
    });
    expect(paymentAggregate).toHaveBeenCalledWith({ _sum: { amount: true } });
  });

  it("to'lovlar yo'q — barchasi qarzdor, debt = contractTotal", async () => {
    prismaMock.contract.findMany.mockResolvedValue([
      { id: "c1", studentId: "s1", year: 2025, amount: 5_000_000 },
    ]);
    paymentGroupBy.mockResolvedValue([]);
    paymentAggregate.mockResolvedValue({ _sum: { amount: null } });

    const kpi = await getFinanceKpis();

    expect(kpi.paidTotal).toBe(0);
    expect(kpi.debtTotal).toBe(5_000_000);
    expect(kpi.debtorsCount).toBe(1);
  });

  it("to'lov shartnoma summasidan oshsa qarz manfiy emas (finance sahifasi kabi max(0, ...))", async () => {
    prismaMock.contract.findMany.mockResolvedValue([
      { id: "c1", studentId: "s1", year: 2025, amount: 1_000_000 },
    ]);
    paymentGroupBy.mockResolvedValue([
      { contractId: "c1", _sum: { amount: 1_500_000 } },
    ]);
    paymentAggregate.mockResolvedValue({ _sum: { amount: 1_500_000 } });

    const kpi = await getFinanceKpis();

    expect(kpi.debtTotal).toBe(0);
    expect(kpi.debtorsCount).toBe(0);
  });

  it("bo'sh baza: hammasi 0, byYear bo'sh", async () => {
    prismaMock.contract.findMany.mockResolvedValue([]);
    paymentGroupBy.mockResolvedValue([]);
    paymentAggregate.mockResolvedValue({ _sum: { amount: null } });

    const kpi = await getFinanceKpis();

    expect(kpi.contractCount).toBe(0);
    expect(kpi.contractTotal).toBe(0);
    expect(kpi.paidTotal).toBe(0);
    expect(kpi.debtTotal).toBe(0);
    expect(kpi.debtorsCount).toBe(0);
    expect(kpi.byYear).toEqual([]);
  });

  it("bir talaba ikki yilda qarzdor bo'lsa — qarzdorlar soni 1", async () => {
    prismaMock.contract.findMany.mockResolvedValue([
      { id: "c1", studentId: "s1", year: 2025, amount: 5_000_000 },
      { id: "c2", studentId: "s1", year: 2024, amount: 5_000_000 },
    ]);
    paymentGroupBy.mockResolvedValue([]);
    paymentAggregate.mockResolvedValue({ _sum: { amount: 0 } });

    const kpi = await getFinanceKpis();

    expect(kpi.debtorsCount).toBe(1);
  });
});

describe("formatMoney", () => {
  it("ming ajratuvchi bilan formatlanadi", () => {
    expect(formatMoney(12345678)).toBe("12 345 678");
    expect(formatMoney(0)).toBe("0");
    expect(formatMoney(4000000)).toBe("4 000 000");
  });
});
