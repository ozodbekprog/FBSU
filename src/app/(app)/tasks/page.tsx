import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import TaskBoard, { type StaffOption, type TaskItem } from "@/components/tasks/task-board";

const MANAGER_ROLES: Role[] = [
  "ADMIN",
  "REKTOR",
  "PRO_RECTOR",
  "DEKAN",
  "KAFEDRA_MUDIRI",
  "REGISTRAR",
  "TYUTOR",
];

export default async function TasksPage() {
  const user = await requireUser();
  if (user.role === "STUDENT") redirect("/dashboard");

  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const isManager = MANAGER_ROLES.includes(user.role);

  const tasks = await prisma.workTask.findMany({
    where: isManager ? {} : { assignedToId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  const staff: StaffOption[] = isManager
    ? await prisma.user.findMany({
        where: { isActive: true, role: { not: "STUDENT" } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, role: true },
      })
    : [];

  const items: TaskItem[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    assignedTo: task.assignedTo,
    createdBy: task.createdBy,
    createdById: task.createdById,
  }));

  return (
    <>
      <PageHeader title={dictionary.tskTitle} subtitle={dictionary.tskSubtitle} />
      <TaskBoard tasks={items} staff={staff} isManager={isManager} currentUserId={user.id} />
    </>
  );
}
