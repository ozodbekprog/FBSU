"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, EmptyState, Input } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { SecurityMessages } from "@/components/security/messages";
import type { AdminDeviceItem, AdminLoginItem } from "@/components/security/types";
import { actionLabel } from "@/components/security/types";

function dateTime(value: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")} ${get("hour")}:${get("minute")}`;
}

export default function AdminSecurityTable({
  items,
  devices,
  messages,  devicesOnly = false,
}: {
  items?: AdminLoginItem[];
  devices?: AdminDeviceItem[];
  messages: SecurityMessages;
  devicesOnly?: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [editing, setEditing] = useState<AdminLoginItem | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  async function saveEdit() {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      const response = await apiFetch(`/api/admin/security/logins/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ deviceName: nameDraft.trim(), note: noteDraft }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? messages.failed);
      setEditing(null);
      setNotice({ tone: "ok", text: messages.saved });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "err", text: error instanceof Error ? error.message : messages.failed });
    } finally {
      setBusyId(null);
    }
  }

  async function softDelete(item: AdminLoginItem) {
    if (!window.confirm(`${messages.delete}: ${item.user.email} — ${item.deviceName}?`)) return;
    setBusyId(item.id);
    try {
      const response = await apiFetch(`/api/admin/security/logins/${item.id}`, { method: "DELETE" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? messages.failed);
      setNotice({ tone: "ok", text: messages.deletedToast });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "err", text: error instanceof Error ? error.message : messages.failed });
    } finally {
      setBusyId(null);
    }
  }

  async function restore(item: AdminLoginItem) {
    setBusyId(item.id);
    try {
      const response = await apiFetch(`/api/admin/security/logins/${item.id}`, { method: "POST" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? messages.failed);
      setNotice({ tone: "ok", text: messages.restored });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "err", text: error instanceof Error ? error.message : messages.failed });
    } finally {
      setBusyId(null);
    }
  }

  async function revokeDevice(device: AdminDeviceItem) {
    if (
      !window.confirm(
        `${messages.revokeDevice}: ${device.user.email} — ${device.name}? ${messages.revokeConfirm}`,
      )
    ) {
      return;
    }
    setBusyId(device.id);
    try {
      const response = await apiFetch(`/api/admin/security/devices/${device.id}`, {
        method: "PATCH",
        body: JSON.stringify({ revoked: true }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? messages.failed);
      setNotice({ tone: "ok", text: messages.saved });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "err", text: error instanceof Error ? error.message : messages.failed });
    } finally {
      setBusyId(null);
    }
  }

  const noticeBanner = notice ? (
    <div
      className={
        notice.tone === "ok"
          ? "fixed bottom-4 right-4 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg"
          : "fixed bottom-4 right-4 z-50 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-lg"
      }
      role="status"
    >
      {notice.text}
    </div>
  ) : null;

  if (devicesOnly) {
    const list = devices ?? [];
    if (list.length === 0) {
      return (
        <>
          {noticeBanner}
          <div className="px-6 py-6">
            <EmptyState title={messages.noDevices} />
          </div>
        </>
      );
    }
    return (
      <>
        {noticeBanner}
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">{messages.user}</th>
              <th className="px-4 py-3 font-medium">{messages.device}</th>
              <th className="px-4 py-3 font-medium">{messages.lastSeen}</th>
              <th className="px-4 py-3 font-medium">{messages.ip}</th>
              <th className="px-4 py-3 font-medium">{messages.location}</th>
              <th className="px-4 py-3 font-medium">{messages.actions}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((device) => (
              <tr key={device.id} className="border-b border-slate-50 align-top last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{device.user.name}</p>
                  <p className="text-xs text-slate-500">{device.user.email}</p>
                  <Badge tone="slate">{device.user.role}</Badge>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-700">{device.name}</p>
                  <p className="text-xs text-slate-500">
                    {[device.platform, device.browser].filter(Boolean).join(" · ") || "—"}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600">{dateTime(device.lastSeenAt)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{device.ip ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{device.location}</td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === device.id}
                    onClick={() => void revokeDevice(device)}
                  >
                    {messages.revokeDevice}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </>
    );
  }

  const list = items ?? [];
  if (list.length === 0) {
    return (
      <>
        {noticeBanner}
        <div className="px-6 py-6">
          <EmptyState title={messages.noHistory} />
        </div>
      </>
    );
  }

  return (
    <>
      {noticeBanner}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">{messages.user}</th>
              <th className="px-4 py-3 font-medium">{messages.device}</th>
              <th className="px-4 py-3 font-medium">{messages.ip}</th>
              <th className="px-4 py-3 font-medium">{messages.location}</th>
              <th className="px-4 py-3 font-medium">{messages.method}</th>
              <th className="px-4 py-3 font-medium">{messages.status}</th>
              <th className="px-4 py-3 font-medium">{messages.changes}</th>
              <th className="px-4 py-3 font-medium">{messages.actions}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => {
              const methodKey = `method${item.method}` as keyof SecurityMessages;
              const open = expandedId === item.id;
              return (
                <Fragment key={item.id}>
                <tr
                  className={
                    item.deletedAt
                      ? "border-b border-slate-50 bg-rose-50/40 align-top last:border-0"
                      : "border-b border-slate-50 align-top last:border-0"
                  }
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{item.user.name}</p>
                    <p className="text-xs text-slate-500">{item.user.email}</p>
                    <Badge tone="slate">{item.user.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{item.deviceName}</p>
                    <p className="text-xs text-slate-500">{dateTime(item.createdAt)}</p>
                    {item.note ? (
                      <p className="mt-1 max-w-xs text-xs text-slate-500">
                        <span className="font-medium text-slate-600">{messages.note}:</span> {item.note}
                      </p>
                    ) : null}
                    {item.deletedAt ? <Badge tone="rose">{messages.deleted}</Badge> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.ip}</td>
                  <td className="px-4 py-3 text-slate-600">{item.location}</td>
                  <td className="px-4 py-3">
                    <Badge tone="blue">{String(messages[methodKey] ?? item.method)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === "BLOCKED" ? (
                      <Badge tone="rose">{messages.blocked}</Badge>
                    ) : (
                      <Badge tone="green">{messages.success}</Badge>
                    )}
                    {item.deviceRevoked ? <Badge tone="amber">{messages.revokedDevice}</Badge> : null}
                  </td>
                  <td className="px-4 py-3">
                    {item.status === "BLOCKED" ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : item.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
                      >
                        {messages.changes}: {item.changes}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={open ? "rotate-180 transition" : "transition"}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === item.id}
                        onClick={() => {
                          setEditing(item);
                          setNameDraft(item.deviceName);
                          setNoteDraft(item.note ?? "");
                        }}
                      >
                        {messages.edit}
                      </Button>
                      {item.deletedAt ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === item.id}
                          onClick={() => void restore(item)}
                        >
                          {messages.restore}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === item.id}
                          onClick={() => void softDelete(item)}
                        >
                          {messages.delete}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {open ? (
                  <tr className="border-b border-slate-50 bg-slate-50/60">
                    <td colSpan={8} className="px-4 py-3">
                      {item.changeList.length === 0 ? (
                        <p className="text-xs text-slate-500">{messages.noChanges}</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {item.changeList.map((change) => (
                            <li
                              key={change.id}
                              className="flex items-start justify-between gap-3 text-xs"
                            >
                              <span className="text-slate-700">
                                {actionLabel(change.action)}
                                {change.entity ? (
                                  <span className="text-slate-400"> · {change.entity}</span>
                                ) : null}
                              </span>
                              <span className="shrink-0 text-slate-400">
                                {dateTime(change.createdAt)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-semibold text-slate-900">{messages.edit}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {editing.user.email} · {dateTime(editing.createdAt)}
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              {messages.deviceName}
              <Input
                className="mt-1.5"
                value={nameDraft}
                maxLength={80}
                onChange={(event) => setNameDraft(event.target.value)}
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              {messages.noteLabel}
              <Input
                className="mt-1.5"
                value={noteDraft}
                maxLength={500}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                {messages.cancel}
              </Button>
              <Button
                disabled={busyId === editing.id || nameDraft.trim().length < 2}
                onClick={() => void saveEdit()}
              >
                {messages.save}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
