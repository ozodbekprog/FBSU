import { prisma } from "@/lib/prisma";
import {
  daysOverdue,
  dueDateFrom,
  fineFor,
  type LibraryBookView,
  type LibraryCopyView,
  type LibraryLoanView,
} from "@/modules/library";

type LoanWithRelations = {
  id: string;
  copyId: string;
  userId: string;
  issuedAt: Date;
  dueAt: Date;
  returnedAt: Date | null;
  status: "ACTIVE" | "RETURNED" | "LOST";
  copy: { inventoryNo: string; book: { title: string; author: string } };
  user: { name: string; group: { name: string } | null };
};

function toLoanView(loan: LoanWithRelations, now: Date): LibraryLoanView {
  return {
    id: loan.id,
    copyId: loan.copyId,
    bookTitle: loan.copy.book.title,
    author: loan.copy.book.author,
    inventoryNo: loan.copy.inventoryNo,
    userId: loan.userId,
    userName: loan.user.name,
    groupName: loan.user.group?.name ?? null,
    issuedAt: loan.issuedAt.toISOString(),
    dueAt: loan.dueAt.toISOString(),
    returnedAt: loan.returnedAt ? loan.returnedAt.toISOString() : null,
    status: loan.status,
    overdueDays: loan.status === "ACTIVE" ? daysOverdue(loan.dueAt, now) : 0,
    fine: loan.status === "ACTIVE" ? fineFor(loan.dueAt, now) : 0,
  };
}

const loanInclude = {
  copy: { select: { inventoryNo: true, book: { select: { title: true, author: true } } } },
  user: { select: { name: true, group: { select: { name: true } } } },
} as const;

export async function getCatalog(query: string): Promise<LibraryBookView[]> {
  const books = await prisma.libraryBook.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { author: { contains: query, mode: "insensitive" } },
            { isbn: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { copies: { select: { status: true } } },
  });

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    category: book.category,
    publisher: book.publisher,
    year: book.year,
    language: book.language,
    description: book.description,
    totalCopies: book.copies.length,
    availableCopies: book.copies.filter((copy) => copy.status === "AVAILABLE").length,
  }));
}

export async function getCopies(): Promise<LibraryCopyView[]> {
  const copies = await prisma.libraryCopy.findMany({
    orderBy: { inventoryNo: "asc" },
    take: 500,
    include: { book: { select: { title: true } } },
  });

  return copies.map((copy) => ({
    id: copy.id,
    inventoryNo: copy.inventoryNo,
    shelf: copy.shelf,
    status: copy.status,
    bookTitle: copy.book.title,
  }));
}

export async function getActiveLoans(now: Date = new Date()): Promise<LibraryLoanView[]> {
  const loans = await prisma.libraryLoan.findMany({
    where: { status: "ACTIVE" },
    orderBy: { dueAt: "asc" },
    take: 300,
    include: loanInclude,
  });
  return loans.map((loan) => toLoanView(loan, now));
}

export async function getMyLoans(userId: string, now: Date = new Date()): Promise<LibraryLoanView[]> {
  const loans = await prisma.libraryLoan.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
    take: 100,
    include: loanInclude,
  });
  return loans.map((loan) => toLoanView(loan, now));
}

export async function getLibraryStats(now: Date = new Date()) {
  const [titles, copies, active, overdue] = await Promise.all([
    prisma.libraryBook.count(),
    prisma.libraryCopy.count(),
    prisma.libraryLoan.count({ where: { status: "ACTIVE" } }),
    prisma.libraryLoan.count({ where: { status: "ACTIVE", dueAt: { lt: now } } }),
  ]);
  return { titles, copies, active, overdue };
}

export async function issueLoan(input: {
  copyId: string;
  userId: string;
  issuedById: string;
  days: number;
}) {
  return prisma.$transaction(async (tx) => {
    const copy = await tx.libraryCopy.findUnique({ where: { id: input.copyId } });
    if (!copy) return { ok: false as const, error: "Nusxa topilmadi" };
    if (copy.status !== "AVAILABLE") return { ok: false as const, error: "Nusxa mavjud emas" };

    const borrower = await tx.user.findUnique({
      where: { id: input.userId },
      select: { isActive: true },
    });
    if (!borrower?.isActive) return { ok: false as const, error: "Foydalanuvchi topilmadi" };

    const loan = await tx.libraryLoan.create({
      data: {
        copyId: input.copyId,
        userId: input.userId,
        issuedById: input.issuedById,
        dueAt: dueDateFrom(new Date(), input.days),
      },
    });
    await tx.libraryCopy.update({
      where: { id: input.copyId },
      data: { status: "ON_LOAN" },
    });
    return { ok: true as const, id: loan.id };
  });
}

export async function returnLoan(loanId: string, outcome: "RETURNED" | "LOST" = "RETURNED") {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.libraryLoan.findUnique({ where: { id: loanId } });
    if (!loan) return { ok: false as const, error: "Yozuv topilmadi" };
    if (loan.status !== "ACTIVE") return { ok: false as const, error: "Yozuv allaqachon yopilgan" };

    const now = new Date();
    await tx.libraryLoan.update({
      where: { id: loanId },
      data: {
        status: outcome,
        returnedAt: now,
        fineAmount: fineFor(loan.dueAt, now),
      },
    });
    await tx.libraryCopy.update({
      where: { id: loan.copyId },
      data: { status: outcome === "LOST" ? "LOST" : "AVAILABLE" },
    });
    return { ok: true as const };
  });
}
