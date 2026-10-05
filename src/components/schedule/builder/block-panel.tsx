"use client";

import { useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, Input, Label, Select } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { SLOT_TIMES } from "@/components/attendance/lesson-utils";
import { DAY_KEYS } from "@/components/schedule/week-utils";
import type { ScheduleStatus } from "@/components/schedule/types";
import type { BuilderEntry } from "./types";

function toStatus(value: string): ScheduleStatus {
  return value === "CHANGED" || value === "MOVED" || value === "CANCELLED" ? value : "NORMAL";
}

export function BlockPanel({
  entry,
  canManage,
  pending,
  onClose,
  onSaveRoom,
  onChangeStatus,
  onDelete,
}: {
  entry: BuilderEntry;
  canManage: boolean;
  pending: boolean;
  onClose: () => void;
  onSaveRoom: (room: string) => void;
  onChangeStatus: (status: ScheduleStatus) => void;
  onDelete: (entry: BuilderEntry) => void;
}) {
  const [draft, setDraft] = useState<{ id: string; value: string } | null>(null);
  const roomValue = draft?.id === entry.id ? draft.value : entry.room ?? "";
  const title = entry.subjectRef?.name ?? entry.subject;
  const { t } = useI18n();
  const statusOptions: Array<{ value: ScheduleStatus; label: string }> = [
    { value: "NORMAL", label: t("schStatusNormal") },
    { value: "CHANGED", label: t("schStatusChanged") },
    { value: "MOVED", label: t("schStatusMoved") },
    { value: "CANCELLED", label: t("schStatusCancelledLong") },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm">
      <Card className="border-brand-200 shadow-xl">
        <CardHeader
          title={title}
          subtitle={`${t(DAY_KEYS[entry.dayOfWeek % 7])}, ${t("schSlotLabel", { slot: entry.slot })} · ${SLOT_TIMES[entry.slot]}`}
          action={
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t("schClose")}
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {entry.teacher ? (
            <p className="text-xs text-slate-500">
              {t("schTeacherLabel")}
              <span className="font-medium text-slate-700">{entry.teacher}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            {entry.subGroup ? (
              <Badge tone="purple">{t("schSubGroupBadge", { name: entry.subGroup })}</Badge>
            ) : null}
            {entry.lessonType ? <Badge tone="blue">{entry.lessonType}</Badge> : null}
            {entry.parity ? (
              <Badge tone="amber">
                {entry.parity === "odd" ? t("schOddWeek") : t("schEvenWeek")}
              </Badge>
            ) : (
              <Badge tone="slate">{t("schEveryWeek")}</Badge>
            )}
            {!canManage ? <Badge tone="rose">{t("schOnlyOwnerEdit")}</Badge> : null}
          </div>

          <div>
            <Label>{t("schRoom")}</Label>
            <div className="flex gap-2">
              <Input
                value={roomValue}
                disabled={!canManage || pending}
                onChange={(event) => setDraft({ id: entry.id, value: event.target.value })}
                placeholder={t("schRoomPlaceholder")}
              />
              <Button
                variant="secondary"
                disabled={!canManage || pending || roomValue.trim() === (entry.room ?? "")}
                onClick={() => onSaveRoom(roomValue.trim())}
              >
                {t("schSave")}
              </Button>
            </div>
          </div>

          <div>
            <Label>{t("schStatusLabel")}</Label>
            <Select
              value={entry.status}
              disabled={!canManage || pending}
              onChange={(event) => onChangeStatus(toStatus(event.target.value))}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end">
            <Button variant="danger" disabled={!canManage || pending} onClick={() => onDelete(entry)}>
              {t("schDelete")}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
