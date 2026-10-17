export type ReminderCandidate = {
  assignmentId: string;
  dueAt: Date;
  title: string;
  courseSlug: string;
};

export type ReminderWindow = { hours: number; now: Date };

export function collectDueSoonReminders(
  assignments: ReminderCandidate[],
  window: ReminderWindow,
): ReminderCandidate[] {
  const horizon = window.now.getTime() + window.hours * 3600 * 1000;
  return assignments
    .filter((assignment) => {
      const due = assignment.dueAt.getTime();
      return due > window.now.getTime() && due <= horizon;
    })
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}
