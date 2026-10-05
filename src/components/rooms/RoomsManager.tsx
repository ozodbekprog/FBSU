"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, EmptyState, Input, Label, Textarea } from "@/components/ui";
import { RoomCard, type RoomItem } from "@/components/rooms/room-card";
import { ensureCsrfToken } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

type ApiResult = { ok: boolean; error?: string };

export default function RoomsManager({ rooms }: { rooms: RoomItem[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
  const [capacity, setCapacity] = useState("");
  const [equipment, setEquipment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function openCreate() {
    setMode("create");
    setEditId(null);
    setName("");
    setBuilding("");
    setCapacity("");
    setEquipment("");
    setError(null);
    setNotice(null);
  }

  function openEdit(room: RoomItem) {
    setMode("edit");
    setEditId(room.id);
    setName(room.name);
    setBuilding(room.building ?? "");
    setCapacity(room.capacity === null ? "" : String(room.capacity));
    setEquipment(room.equipment ?? "");
    setError(null);
    setNotice(null);
  }

  function closeForm() {
    setMode(null);
    setEditId(null);
    setError(null);
  }

  async function send(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const token = await ensureCsrfToken();
      const headers: Record<string, string> = { ...(body ? { "Content-Type": "application/json" } : {}) };
      if (token) headers["x-csrf-token"] = token;
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json().catch(() => null)) as ApiResult | null;
      if (!res.ok || !json || !json.ok) {
        setError(json?.error ?? t("mscRoomActionError"));
        return null;
      }
      return json;
    } catch {
      setError(t("mscRoomNetworkError"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    const payload = {
      name: name.trim(),
      building: building.trim() || null,
      capacity: capacity.trim() ? Number(capacity) : null,
      equipment: equipment.trim() || null,
    };
    const json =
      mode === "create"
        ? await send("/api/rooms", "POST", payload)
        : await send(`/api/rooms/${editId}`, "PATCH", payload);
    if (!json) return;
    closeForm();
    setNotice(mode === "create" ? t("mscRoomCreated") : t("mscRoomUpdated"));
    router.refresh();
  }

  async function remove(room: RoomItem) {
    if (!window.confirm(t("mscRoomDeleteConfirm", { name: room.name }))) return;
    const json = await send(`/api/rooms/${room.id}`, "DELETE");
    if (!json) return;
    setNotice(t("mscRoomDeleted"));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={openCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          {t("mscRoomNew")}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {notice ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {notice}
            </span>
          ) : null}
          {error && !mode ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700">
              {error}
            </span>
          ) : null}
        </div>
      </div>

      {mode ? (
        <Card className="border-brand-200/70">
          <CardHeader
            title={mode === "create" ? t("mscRoomNew") : t("mscRoomEdit")}
            action={
              <Button variant="ghost" size="sm" onClick={closeForm}>
                {t("mscRoomClose")}
              </Button>
            }
          />
          <CardBody>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div>
                <Label>{t("mscRoomName")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("mscRoomNamePlaceholder")} required minLength={2} />
              </div>
              <div>
                <Label>{t("mscRoomBuilding")}</Label>
                <Input value={building} onChange={(e) => setBuilding(e.target.value)} placeholder={t("mscRoomBuildingPlaceholder")} />
              </div>
              <div>
                <Label>{t("mscRoomCapacityLabel")}</Label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder={t("mscRoomCapacityPlaceholder")}
                  min={0}
                  max={10000}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("mscRoomEquipment")}</Label>
                <Textarea
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder={t("mscRoomEquipmentPlaceholder")}
                  rows={2}
                />
              </div>
              <div className="flex items-end gap-2 sm:col-span-2">
                <Button type="submit" disabled={busy || name.trim().length < 2}>
                  {busy ? t("mscSaving") : mode === "create" ? t("mscRoomAdd") : t("commonSave")}
                </Button>
              </div>
              {error ? <p className="text-sm text-rose-600 sm:col-span-2">{error}</p> : null}
            </form>
          </CardBody>
        </Card>
      ) : null}

      {rooms.length === 0 ? (
        <EmptyState
          title={t("mscRoomsEmptyTitle")}
          description={t("mscRoomsEmptyAddBody")}
          action={
            <Button size="sm" variant="secondary" onClick={openCreate}>
              {t("mscRoomEmptyAdd")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              href={`/rooms/${room.id}`}
              actions={
                <>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(room)}>
                    {t("mscRoomEditAction")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => remove(room)}
                  >
                    {t("mscRoomDelete")}
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
