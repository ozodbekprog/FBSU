import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { login } from "./helpers";

test.describe.configure({ timeout: 120_000 });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ??
        "postgresql://probox@localhost:5433/ttpu_lms?schema=public",
    },
  },
});

async function resetExamState(): Promise<void> {
  const exams = await prisma.secureExam.findMany({
    where: { title: { startsWith: "E2E" } },
    select: { id: true },
  });
  const examIds = exams.map((exam) => exam.id);
  if (examIds.length === 0) return;
  const runs = await prisma.secureExamRun.findMany({
    where: { examId: { in: examIds } },
    select: { attemptId: true },
  });
  await prisma.secureExamRun.deleteMany({ where: { examId: { in: examIds } } });
  await prisma.quizAttempt.deleteMany({
    where: { id: { in: runs.map((run) => run.attemptId) } },
  });
  await prisma.secureExam.deleteMany({ where: { id: { in: examIds } } });
}

test.beforeEach(async () => {
  await resetExamState();
});

test.afterAll(async () => {
  await resetExamState();
  await prisma.$disconnect();
});

async function createExam(page: Page, title: string): Promise<{ id: string; code: string }> {
  await page.goto("/secure-exams");
  await expect(page.getByRole("heading", { name: "Xavfsiz imtihon" })).toBeVisible();

  await page
    .locator("main select")
    .first()
    .selectOption({ label: "Test 1: Asosiy tushunchalar — Dasturlash asoslari" });
  await page.getByPlaceholder("Yakuniy nazorat — Dasturlash asoslari").fill(title);
  await page.getByRole("button", { name: "45 daqiqa" }).click();

  const codeText = page.locator("p.font-mono.text-3xl");
  await expect(codeText).toBeVisible();
  const code = ((await codeText.textContent()) ?? "").trim();
  const monitorHref = await page.getByRole("link", { name: "Kuzatish" }).getAttribute("href");
  const id = (monitorHref ?? "").split("/").pop() ?? "";
  return { id, code };
}

async function joinExam(student: Page, code: string): Promise<void> {
  await student.goto("/secure-exams");
  await student.getByPlaceholder("ABC-123").fill(code);
  await student.getByRole("button", { name: "Kirish" }).click();
  await expect(student).toHaveURL(/\/exam\//, { timeout: 20_000 });
}

test("xavfsiz imtihon: yaratish, kirish, topshirish va monitor", async ({ browser }) => {
  const teacherContext = await browser.newContext();
  const studentContext = await browser.newContext();
  try {
    const teacher = await teacherContext.newPage();
    const student = await studentContext.newPage();

    await login(teacher, "t.prog@ttpu.uz");
    const { id, code } = await createExam(teacher, `E2E xavfsiz ${Date.now()}`);
    expect(code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);

    await login(student, "ozodbek@ttpu.uz");
    await joinExam(student, code);

    await expect(student.getByText("Xavfsiz rejim qoidalari")).toBeVisible();
    await student.getByRole("button", { name: "Imtihonni boshlash" }).click();

    await expect(student.getByText("print()", { exact: true })).toBeVisible({ timeout: 15_000 });
    await student.locator('label:has-text("print()")').click();
    await student.locator('section[data-index="0"]').click({ button: "right", position: { x: 20, y: 30 } });

    await student.getByRole("button", { name: "Topshirish" }).first().click();
    await student.getByRole("dialog").getByRole("button", { name: "Topshirish" }).click();

    await expect(student.getByText("Imtihon yakunlandi")).toBeVisible({ timeout: 20_000 });
    await student.getByRole("button", { name: "Natijalarni ko'rish" }).click();
    await expect(student).toHaveURL(/\/quizzes\/.+\/results/, { timeout: 15_000 });

    await teacher.goto(`/secure-exams/${id}`);
    await expect(teacher.getByText("Ozodbek Hoshimov").first()).toBeVisible({ timeout: 20_000 });
    await expect(teacher.getByText("Topshirildi").first()).toBeVisible({ timeout: 20_000 });
    await expect(teacher.getByText("Kontekst menyu ochish").first()).toBeVisible({ timeout: 20_000 });
  } finally {
    await teacherContext.close();
    await studentContext.close();
  }
});

test("xavfsiz imtihon: to'g'ridan-to'g'ri havola va o'qituvchi to'xtatishi", async ({ browser }) => {
  const teacherContext = await browser.newContext();
  const studentContext = await browser.newContext();
  try {
    const teacher = await teacherContext.newPage();
    const student = await studentContext.newPage();

    await login(teacher, "t.prog@ttpu.uz");
    const { id, code } = await createExam(teacher, `E2E to'xtatish ${Date.now()}`);

    await login(student, "ozodbek@ttpu.uz");
    await student.goto("/e");
    await expect(student.getByText("Imtihonga kirish")).toBeVisible({ timeout: 15_000 });
    await student.goto(`/e/${code}`);
    await expect(student.getByText("Sizning imtihoningiz")).toBeVisible({ timeout: 15_000 });
    await student.getByRole("button", { name: "Kirish" }).click();
    await expect(student).toHaveURL(/\/exam\//, { timeout: 20_000 });
    await student.getByRole("button", { name: "Imtihonni boshlash" }).click();
    await expect(student.getByText("print()", { exact: true })).toBeVisible({ timeout: 15_000 });

    const resume = await studentContext.newPage();
    await resume.goto(`/e/${code}`);
    await expect(resume).toHaveURL(/\/exam\//, { timeout: 15_000 });
    await resume.close();

    await teacher.goto(`/secure-exams/${id}`);
    await expect(teacher.getByText("Ozodbek Hoshimov").first()).toBeVisible({ timeout: 20_000 });
    teacher.on("dialog", (dialog) => void dialog.accept());
    await teacher.getByRole("button", { name: "To'xtatish" }).click();

    await expect(student.getByRole("heading", { name: "Imtihon to'xtatildi" })).toBeVisible({ timeout: 45_000 });
  } finally {
    await teacherContext.close();
    await studentContext.close();
  }
});
