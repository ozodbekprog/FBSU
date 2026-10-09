/**
 * Oylik moduli namuna ma'lumotlari.
 *
 * Bu `prisma/seed.mjs` dan alohida, chunki:
 *  1. butun bazani qayta seed qilmaydi (ma'lumot buzilmaydi);
 *  2. faqat oylik moduli uchun kerakli narsalarni yaratadi.
 *
 * Ishga tushirish:  node prisma/seed-payroll.mjs
 * Xavfsiz: har bir yozuv `upsert`/`createMany` orqali — ikki marta
 * ishga tushirsangiz ham takrorlanmaydi.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PASSWORD = process.env.SEED_PASSWORD || "ttpu1234";

/** Joriy oy boshi (UTC 00:00) — SalaryRecord.month shu qiymatga teng. */
function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function main() {
  const passwordHash = bcrypt.hashSync(PASSWORD, 10);

  // ---------------------------------------------------------------- rol egalari
  // Buxgalter + ADMIN dan yuqori rollar. `seed.mjs`da bor bo'lishi mumkin,
  // shuning uchun `upsert` — mavjudini yangilamaydi, yo'qini yaratadi.
  const owners = [
    { email: "buxgalter@ttpu.uz", name: "Buxgalter", role: "BUXGALTER" },
    { email: "rektor@ttpu.uz", name: "Rektor", role: "REKTOR" },
    { email: "prorektor@ttpu.uz", name: "Prorektor", role: "PRO_RECTOR" },
    { email: "dekan@ttpu.uz", name: "Dekan", role: "DEKAN" },
    { email: "kafedra@ttpu.uz", name: "Kafedra mudiri", role: "KAFEDRA_MUDIRI" },
    { email: "registrar@ttpu.uz", name: "O'quv bo'limi", role: "REGISTRAR" },
    // Login sahifasidagi demo tugmalar uchun.
    { email: "tyutor@ttpu.uz", name: "Tyutor", role: "TYUTOR" },
    { email: "xodim@ttpu.uz", name: "Xodim", role: "XODIM" },
    { email: "ota-ona@ttpu.uz", name: "Ota-ona", role: "OTA_ONA" },
  ];

  const byEmail = {};
  for (const o of owners) {
    byEmail[o.email] = await prisma.user.upsert({
      where: { email: o.email },
      update: { name: o.name, role: o.role },
      create: { ...o, passwordHash },
      select: { id: true, email: true, role: true },
    });
  }
  console.log(`  hisoblar: ${Object.keys(byEmail).length} ta`);

  // ------------------------------------------------------------------- bo'limlar
  const departments = [
    { name: "Moliya bo'limi", code: "MOL" },
    { name: "O'quv bo'limi", code: "OQU" },
    { name: "Informatika kafedrasi", code: "INF" },
    { name: "Matematika kafedrasi", code: "MAT" },
  ];
  const dept = {};
  for (const d of departments) {
    dept[d.code] = await prisma.department.upsert({
      where: { name: d.name },
      update: {},
      create: d,
      select: { id: true, name: true },
    });
  }
  console.log(`  bo'limlar: ${Object.keys(dept).length} ta`);

  // ------------------------------------------------------------------ lavozimlar
  const positions = [
    { name: "Buxgalter", code: "BUX", baseSalary: 12_000_000, departmentId: dept.MOL.id },
    { name: "Rektor", code: "REK", baseSalary: 35_000_000, departmentId: dept.MOL.id },
    { name: "Prorektor", code: "PRR", baseSalary: 28_000_000, departmentId: dept.MOL.id },
    { name: "Dekan", code: "DEK", baseSalary: 22_000_000, departmentId: dept.OQU.id },
    { name: "Kafedra mudiri", code: "KAF", baseSalary: 15_000_000, departmentId: dept.INF.id },
    { name: "O'qituvchi", code: "OQT", baseSalary: 9_500_000, departmentId: dept.MAT.id },
  ];
  const pos = {};
  for (const p of positions) {
    pos[p.code] = await prisma.staffPosition.upsert({
      where: { name: p.name },
      update: { baseSalary: p.baseSalary, departmentId: p.departmentId },
      create: p,
      select: { id: true, name: true, baseSalary: true },
    });
  }
  console.log(`  lavozimlar: ${Object.keys(pos).length} ta`);

  // --------------------------------------------------- lavozim -> xodim bog'lanishi
  // Xodimga lavozim va bo'lim beriladi; oylik hisobotida shu bo'limlar
  // kesimida jamlanadi.
  const assignments = [
    ["buxgalter@ttpu.uz", "BUX", "MOL"],
    ["rektor@ttpu.uz", "REK", "MOL"],
    ["prorektor@ttpu.uz", "PRR", "MOL"],
    ["dekan@ttpu.uz", "DEK", "OQU"],
    ["kafedra@ttpu.uz", "KAF", "INF"],
    ["registrar@ttpu.uz", "OQT", "OQU"],
  ];
  for (const [email, posCode, deptCode] of assignments) {
    await prisma.user.update({
      where: { email },
      data: { staffPositionId: pos[posCode].id, departmentId: dept[deptCode].id },
    });
  }
  // O'qituvchilarga ham lavozim + bo'lim (o'quv xodimlari hisobotga kirsin).
  const teachers = ["n.mahamatov@ttpu.uz", "o.makhmudov@ttpu.uz", "l.nazarova@ttpu.uz"];
  for (let i = 0; i < teachers.length; i += 1) {
    await prisma.user.update({
      where: { email: teachers[i] },
      data: { staffPositionId: pos.OQT.id, departmentId: dept.MAT.id },
    });
  }
  console.log(`  lavozimga biriktirilgan: ${assignments.length + teachers.length} ta xodim`);

  // -------------------------------------------------------------- navbar turlari
  const shifts = [
    { name: "Ertalabki smena", code: "ERT", startMinutes: 8 * 60, endMinutes: 17 * 60 },
    { name: "Kechki smena", code: "ECH", startMinutes: 13 * 60, endMinutes: 22 * 60 },
    { name: "Tungi smena", code: "TUN", startMinutes: 22 * 60, endMinutes: 6 * 60, isNight: true },
  ];
  const shift = {};
  for (const s of shifts) {
    shift[s.code] = await prisma.shift.upsert({
      where: { name: s.name },
      update: { startMinutes: s.startMinutes, endMinutes: s.endMinutes, isNight: s.isNight ?? false },
      create: { ...s, isNight: s.isNight ?? false },
      select: { id: true, name: true },
    });
  }
  console.log(`  navbar turlari: ${Object.keys(shift).length} ta`);

  // --------------------------------------------------------- haftalik grafik
  // Xodimlar hafta kunlariga navbar biriktiradi.
  const schedule = [
    ["buxgalter@ttpu.uz", shift.ERT.id, [1, 2, 3, 4, 5]],
    ["rektor@ttpu.uz", shift.ERT.id, [1, 2, 3, 4]],
    ["prorektor@ttpu.uz", shift.ECH.id, [1, 2, 3, 4, 5]],
    ["dekan@ttpu.uz", shift.ERT.id, [1, 3, 5]],
    ["kafedra@ttpu.uz", shift.ECH.id, [2, 4]],
    ["registrar@ttpu.uz", shift.ERT.id, [1, 2, 3, 4, 5]],
  ];
  let shiftCount = 0;
  for (const [email, shiftId, weekdays] of schedule) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) continue;
    for (const weekday of weekdays) {
      // `userId + weekday + startsOn` unique — mavjudini o'zgartirmaydi.
      const existing = await prisma.staffShiftAssignment.findFirst({
        where: { userId: user.id, weekday, endsOn: null },
        select: { id: true },
      });
      if (!existing) {
        await prisma.staffShiftAssignment.create({
          data: { userId: user.id, shiftId, weekday, startsOn: monthStart() },
        });
        shiftCount += 1;
      }
    }
  }
  console.log(`  grafik biriktirilgan: ${shiftCount} ta`);

  // ------------------------------------------------------------------- oyliklar
  const month = monthStart();
  const salary = [
    ["buxgalter@ttpu.uz", 12_000_000, 1_200_000, "APPROVED"],
    ["rektor@ttpu.uz", 35_000_000, 3_500_000, "APPROVED"],
    ["prorektor@ttpu.uz", 28_000_000, 2_000_000, "APPROVED"],
    ["dekan@ttpu.uz", 22_000_000, 1_800_000, "APPROVED"],
    ["kafedra@ttpu.uz", 15_000_000, 1_000_000, "APPROVED"],
    ["registrar@ttpu.uz", 9_500_000, 500_000, "PENDING"],
    ["n.mahamatov@ttpu.uz", 9_500_000, 700_000, "APPROVED"],
    ["o.makhmudov@ttpu.uz", 9_500_000, 400_000, "APPROVED"],
    ["l.nazarova@ttpu.uz", 9_500_000, 300_000, "PENDING"],
  ];

  const buxgalterId = byEmail["buxgalter@ttpu.uz"].id;
  let payCount = 0;
  for (const [email, base, bonus, status] of salary) {
    const u = byEmail[email] ?? (await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    }));
    if (!u) continue;

    const total = Math.max(0, base + bonus);
    const existing = await prisma.salaryRecord.findUnique({
      where: { userId_month: { userId: u.id, month } },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.salaryRecord.create({
      data: {
        userId: u.id,
        month,
        baseAmount: base,
        bonusAmount: bonus,
        total,
        status,
        createdById: buxgalterId,
        reviewedById: status === "APPROVED" ? buxgalterId : null,
        reviewedAt: status === "APPROVED" ? new Date() : null,
      },
    });
    payCount += 1;
  }
  console.log(`  oylik yozuvlari: ${payCount} ta`);

  // ------------------------------------------------------------------- ruxsatlar
  // Buxgalter REKTOR, PRO_RECTOR va DEKAN ga oylikni ko'rish ruxsati beradi —
  // ya'ni "buxgalter kimga ruxsat bersa, osha lavozimdagilar ko'radi".
  // Faqat rahbariyat: rektor, prorektor, dekan. Boshqa rollarga API
  // 400 qaytaradi (server tomondagi `SALARY_GRANTABLE_ROLES`).
  const grants = ["REKTOR", "PRO_RECTOR", "DEKAN"];
  for (const role of grants) {
    await prisma.salaryGrant.upsert({
      where: { role },
      update: { canView: true, revokedAt: null, grantedById: buxgalterId },
      create: { role, canView: true, grantedById: buxgalterId },
    });
  }
  console.log(`  ruxsatlar: ${grants.join(", ")}`);

  console.log("\nOylik moduli tayyor.");
  console.log(`  Buxgalter: buxgalter@ttpu.uz / ${PASSWORD}`);
  console.log(`  Ruxsat berilgan rollar: ${grants.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());