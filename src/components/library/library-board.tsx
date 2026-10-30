"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch, withCsrfHeaders } from "@/lib/api";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, Select, Table } from "@/components/ui";
import type { LibraryBookView, LibraryCopyView, LibraryLoanView } from "@/modules/library";

type Tab = "catalog" | "desk" | "mine" | "fund";

type Props = {
  books: LibraryBookView[];
  copies: LibraryCopyView[];
  activeLoans: LibraryLoanView[];
  myLoans: LibraryLoanView[];
  students: { id: string; name: string; groupName: string | null }[];
  canManage: boolean;
  canCirculate: boolean;
};

type DictKey = Parameters<ReturnType<typeof useI18n>["t"]>[0];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function LibraryBoard({
  books,
  copies,
  activeLoans,
  myLoans,
  students,
  canManage,
  canCirculate,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("catalog");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [copyId, setCopyId] = useState("");
  const [days, setDays] = useState("14");

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const [copyCount, setCopyCount] = useState("1");

  const [copyBookId, setCopyBookId] = useState("");
  const [inventoryNo, setInventoryNo] = useState("");
  const [shelf, setShelf] = useState("");

  const label = (key: string) => t(key as DictKey);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return books;
    return books.filter((book) =>
      [book.title, book.author, book.isbn ?? "", book.category ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [books, query]);

  const availableCopies = useMemo(
    () => copies.filter((copy) => copy.status === "AVAILABLE"),
    [copies],
  );

  async function mutate(url: string, method: string, body?: unknown): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    try {
      const response = await apiFetch(url, {
        method,
        headers: withCsrfHeaders(),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json: { ok?: boolean; error?: string } = await response.json().catch(() => ({}));
      if (!response.ok || json.ok === false) {
        setMessage(json.error || label("libActionFailed"));
        return false;
      }
      setMessage(label("libSaved"));
      router.refresh();
      return true;
    } catch {
      setMessage(label("libActionFailed"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function issue() {
    if (!studentId || !copyId) return;
    const done = await mutate("/api/library/loans", "POST", {
      copyId,
      userId: studentId,
      days: Number(days) || 14,
    });
    if (done) setCopyId("");
  }

  async function addBook() {
    if (!title.trim() || !author.trim()) return;
    const done = await mutate("/api/library/books", "POST", {
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim() || null,
      category: category.trim() || null,
      year: year ? Number(year) : null,
      copies: Number(copyCount) || 0,
    });
    if (done) {
      setTitle("");
      setAuthor("");
      setIsbn("");
      setCategory("");
      setYear("");
      setCopyCount("1");
    }
  }

  async function addCopy() {
    if (!copyBookId || !inventoryNo.trim()) return;
    const done = await mutate("/api/library/copies", "POST", {
      bookId: copyBookId,
      inventoryNo: inventoryNo.trim(),
      shelf: shelf.trim() || null,
    });
    if (done) {
      setInventoryNo("");
      setShelf("");
    }
  }

  const tabs: { id: Tab; label: string; visible: boolean }[] = [
    { id: "catalog", label: label("libTabCatalog"), visible: true },
    { id: "desk", label: label("libTabDesk"), visible: canCirculate },
    { id: "mine", label: label("libTabMine"), visible: true },
    { id: "fund", label: label("libTabFund"), visible: canManage },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs
          .filter((item) => item.visible)
          .map((item) => (
            <Button
              key={item.id}
              variant={tab === item.id ? "primary" : "ghost"}
              size="sm"
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </Button>
          ))}
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      {tab === "catalog" ? (
        <Card>
          <CardHeader title={label("libTabCatalog")} subtitle={label("libSubtitle")} />
          <CardBody className="space-y-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={label("libSearch")}
            />
            {filtered.length === 0 ? (
              <EmptyState title={label("libEmpty")} />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{label("libBookTitle")}</th>
                    <th>{label("libAuthor")}</th>
                    <th>{label("libCategory")}</th>
                    <th>{label("libYear")}</th>
                    <th>{label("libAvailable")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((book) => (
                    <tr key={book.id}>
                      <td>
                        <div className="font-medium text-slate-900">{book.title}</div>
                        {book.isbn ? <div className="text-xs text-slate-500">{book.isbn}</div> : null}
                      </td>
                      <td>{book.author}</td>
                      <td>{book.category ?? "—"}</td>
                      <td>{book.year ?? "—"}</td>
                      <td>
                        <Badge tone={book.availableCopies > 0 ? "green" : "slate"}>
                          {book.availableCopies} / {book.totalCopies}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "desk" && canCirculate ? (
        <div className="space-y-4">
          <Card>
            <CardHeader title={label("libIssue")} subtitle={label("libTabDesk")} />
            <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
                <option value="">{label("libBorrower")}</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                    {student.groupName ? ` · ${student.groupName}` : ""}
                  </option>
                ))}
              </Select>
              <Select value={copyId} onChange={(event) => setCopyId(event.target.value)}>
                <option value="">{label("libOnlyAvailable")}</option>
                {availableCopies.map((copy) => (
                  <option key={copy.id} value={copy.id}>
                    {copy.bookTitle} · {copy.inventoryNo}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min={1}
                max={180}
                value={days}
                onChange={(event) => setDays(event.target.value)}
                aria-label={label("libLoanDays")}
              />
              <Button onClick={issue} disabled={busy || !studentId || !copyId}>
                {label("libIssue")}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={label("libActiveLoans")} />
            <CardBody>
              {activeLoans.length === 0 ? (
                <EmptyState title={label("libEmpty")} />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>{label("libBookTitle")}</th>
                      <th>{label("libBorrower")}</th>
                      <th>{label("libIssuedAt")}</th>
                      <th>{label("libDueAt")}</th>
                      <th>{label("libFine")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {activeLoans.map((loan) => (
                      <tr key={loan.id}>
                        <td>
                          <div className="font-medium text-slate-900">{loan.bookTitle}</div>
                          <div className="text-xs text-slate-500">{loan.inventoryNo}</div>
                        </td>
                        <td>
                          {loan.userName}
                          {loan.groupName ? (
                            <span className="text-xs text-slate-500"> · {loan.groupName}</span>
                          ) : null}
                        </td>
                        <td>{formatDate(loan.issuedAt)}</td>
                        <td>
                          <span className={loan.overdueDays > 0 ? "text-red-600" : undefined}>
                            {formatDate(loan.dueAt)}
                          </span>
                          {loan.overdueDays > 0 ? (
                            <div className="text-xs text-red-600">
                              {loan.overdueDays} {label("libDays")}
                            </div>
                          ) : null}
                        </td>
                        <td>{loan.fine > 0 ? loan.fine.toLocaleString("uz-UZ") : "—"}</td>
                        <td className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => mutate(`/api/library/loans/${loan.id}`, "PATCH", { outcome: "RETURNED" })}
                          >
                            {label("libReturn")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === "mine" ? (
        <Card>
          <CardHeader title={label("libTabMine")} />
          <CardBody>
            {myLoans.length === 0 ? (
              <EmptyState title={label("libNoLoans")} />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{label("libBookTitle")}</th>
                    <th>{label("libIssuedAt")}</th>
                    <th>{label("libDueAt")}</th>
                    <th>{label("libStatus")}</th>
                    <th>{label("libFine")}</th>
                  </tr>
                </thead>
                <tbody>
                  {myLoans.map((loan) => (
                    <tr key={loan.id}>
                      <td>
                        <div className="font-medium text-slate-900">{loan.bookTitle}</div>
                        <div className="text-xs text-slate-500">{loan.author}</div>
                      </td>
                      <td>{formatDate(loan.issuedAt)}</td>
                      <td>{formatDate(loan.dueAt)}</td>
                      <td>
                        <Badge
                          tone={
                            loan.status === "RETURNED" ? "slate" : loan.overdueDays > 0 ? "red" : "green"
                          }
                        >
                          {loan.status === "RETURNED"
                            ? label("libReturned")
                            : loan.status === "LOST"
                              ? label("libLost")
                              : loan.overdueDays > 0
                                ? label("libOverdue")
                                : label("libActive")}
                        </Badge>
                      </td>
                      <td>{loan.fine > 0 ? loan.fine.toLocaleString("uz-UZ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "fund" && canManage ? (
        <div className="space-y-4">
          <Card>
            <CardHeader title={label("libAddBook")} />
            <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={label("libBookTitle")} />
              <Input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder={label("libAuthor")} />
              <Input value={isbn} onChange={(event) => setIsbn(event.target.value)} placeholder={label("libIsbn")} />
              <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder={label("libCategory")} />
              <Input type="number" value={year} onChange={(event) => setYear(event.target.value)} placeholder={label("libYear")} />
              <Input
                type="number"
                min={0}
                max={500}
                value={copyCount}
                onChange={(event) => setCopyCount(event.target.value)}
                placeholder={label("libCopies")}
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <Button onClick={addBook} disabled={busy || !title.trim() || !author.trim()}>
                  {label("libSave")}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={label("libAddCopy")} />
            <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={copyBookId} onChange={(event) => setCopyBookId(event.target.value)}>
                <option value="">{label("libSelectBook")}</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </Select>
              <Input
                value={inventoryNo}
                onChange={(event) => setInventoryNo(event.target.value)}
                placeholder={label("libInventoryNo")}
              />
              <Input value={shelf} onChange={(event) => setShelf(event.target.value)} placeholder={label("libShelf")} />
              <Button onClick={addCopy} disabled={busy || !copyBookId || !inventoryNo.trim()}>
                {label("libSave")}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={label("libTabFund")} />
            <CardBody>
              {books.length === 0 ? (
                <EmptyState title={label("libEmpty")} />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>{label("libBookTitle")}</th>
                      <th>{label("libAuthor")}</th>
                      <th>{label("libCopies")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((book) => (
                      <tr key={book.id}>
                        <td>{book.title}</td>
                        <td>{book.author}</td>
                        <td>
                          {book.availableCopies} / {book.totalCopies}
                        </td>
                        <td className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => mutate(`/api/library/books/${book.id}`, "DELETE")}
                          >
                            {label("libDeleteBook")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
