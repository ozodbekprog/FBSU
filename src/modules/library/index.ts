export const DEFAULT_LOAN_DAYS = 14;
export const FINE_PER_DAY = 2000;

export const LOAN_STATUS_LABELS = {
  ACTIVE: "Faol",
  RETURNED: "Qaytarilgan",
  LOST: "Yo'qolgan",
} as const;

export type LibraryBookView = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  publisher: string | null;
  year: number | null;
  language: string;
  description: string | null;
  totalCopies: number;
  availableCopies: number;
};

export type LibraryCopyView = {
  id: string;
  inventoryNo: string;
  shelf: string | null;
  status: "AVAILABLE" | "ON_LOAN" | "LOST" | "WRITTEN_OFF";
  bookTitle: string;
};

export type LibraryLoanView = {
  id: string;
  copyId: string;
  bookTitle: string;
  author: string;
  inventoryNo: string;
  userId: string;
  userName: string;
  groupName: string | null;
  issuedAt: string;
  dueAt: string;
  returnedAt: string | null;
  status: "ACTIVE" | "RETURNED" | "LOST";
  overdueDays: number;
  fine: number;
};

export function dueDateFrom(now: Date, days: number = DEFAULT_LOAN_DAYS): Date {
  return new Date(now.getTime() + days * 86_400_000);
}

export function daysOverdue(dueAt: Date, now: Date = new Date()): number {
  const diff = now.getTime() - dueAt.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / 86_400_000);
}

export function fineFor(dueAt: Date, now: Date = new Date()): number {
  return daysOverdue(dueAt, now) * FINE_PER_DAY;
}
