"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Role, WorkTaskStatus } from "@prisma/client";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

export type StaffOption = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: WorkTaskStatus;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  assignedTo: StaffOption;
  createdBy: { id: string; name: string };
  createdById: string;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: string };

export default function TaskBoard({
  tasks,
  staff,
  isManager,
  currentUserId,
}: {
  tasks: TaskItem[];
  staff: StaffOption[];
  isManager: boolean;
  currentUserId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          assignedToId,
          dueAt: dueAt ? dueAt : null,
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiResult<TaskItem> | null;
      if (!res.ok || !json || !json.ok) {
        setError(json && !json.ok ? json.error ?? null : null);
        return;
      }
      setTitle("");
      setDescription("");
      setAssignedToId("");
      setDueAt("");
      router.refresh();
    } catch {
      setError(null);
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(task: TaskItem, status: WorkTaskStatus) {
    if (busyId) return;
    setBusyId(task.id);
    setError(null);
    try {
      const res = await apiFetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => null)) as ApiResult<TaskItem> | null;
      if (!res.ok || !json || !json.ok) {
        setError(json && !json.ok ? json.error ?? null : null);
        return;
      }
      router.refresh();
    } catch {
      setError(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {isManager ? (
        <Card>
          <CardHeader title={t("tskCreate")} />
          <CardBody>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={createTask}>
              <div className="sm:col-span-2">
                <Label>{t("tskTitleField")}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={2}
                  maxLength={200}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("tskDescription")}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div>
                <Label>{t("tskAssignee")}</Label>
                <Select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  required
                >
                  <option value="">{t("tskSearchStaff")}</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} — {member.email}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t("tskDueDate")}</Label>
                <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={busy || title.trim().length < 2 || !assignedToId}
                >
                  {t("tskSave")}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader title={isManager ? t("tskAll") : t("tskMine")} subtitle={tasks.length} />
        <CardBody>
          {tasks.length === 0 ? (
            <EmptyState title={t("tskEmpty")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task) => {
                const overdue =
                  task.status === "OPEN" &&
                  task.dueAt !== null &&
                  new Date(task.dueAt).getTime() < now;
                const isAssignee = task.assignedTo.id === currentUserId;
                return (
                  <Card key={task.id} className="flex flex-col justify-between p-5">
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-semibold tracking-tight text-slate-900">{task.title}</h3>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <Badge tone={task.status === "OPEN" ? "amber" : "green"}>
                            {task.status === "OPEN" ? t("tskStatusOpen") : t("tskStatusDone")}
                          </Badge>
                          {overdue ? <Badge tone="rose">{t("tskOverdue")}</Badge> : null}
                        </div>
                      </div>
                      {task.description ? (
                        <p className="mt-2 text-sm text-slate-600">{task.description}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Badge tone="blue">
                          {t("tskAssignee")}: {task.assignedTo.name}
                        </Badge>
                        <Badge tone="slate">
                          {t("tskCreator")}: {task.createdBy.name}
                        </Badge>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        {t("tskDueDate")}: {fmtDate(task.dueAt)}
                        {task.status === "DONE" && task.completedAt
                          ? ` · ${t("tskCompletedAt")}: ${fmtDate(task.completedAt)}`
                          : ""}
                      </p>
                    </div>
                    {isAssignee ? (
                      <div className="mt-4">
                        <Button
                          size="sm"
                          variant={task.status === "OPEN" ? "primary" : "secondary"}
                          disabled={busyId === task.id}
                          onClick={() =>
                            updateStatus(task, task.status === "OPEN" ? "DONE" : "OPEN")
                          }
                        >
                          {task.status === "OPEN" ? t("tskMarkDone") : t("tskReopen")}
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
