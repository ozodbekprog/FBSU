"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { format, type SecurityMessages } from "@/components/security/messages";
import {
  actionLabel,
  type SecurityDeviceItem,
  type SecurityLoginItem,
} from "@/components/security/types";

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

export default function SecurityCenter({
  devices,
  logins,
  messages,}: {
  devices: SecurityDeviceItem[];
  logins: SecurityLoginItem[];
  messages: SecurityMessages;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const full = devices.length >= 2;

  async function renameDevice(id: string) {
    const name = nameDraft.trim();
    if (name.length < 2) return;
    setBusyId(id);
    try {
      const response = await apiFetch(`/api/security/devices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? messages.failed);
      setEditingId(null);
      setNotice({ tone: "ok", text: messages.saved });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "err", text: error instanceof Error ? error.message : messages.failed });
    } finally {
      setBusyId(null);
    }
  }

  async function revokeDevice(id: string) {
    setBusyId(id);
    try {
      const response = await apiFetch(`/api/security/devices/${id}`, { method: "DELETE" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? messages.failed);
      setConfirmId(null);
      if (json?.data?.current) {
        router.replace("/login");
        return;
      }
      setNotice({ tone: "ok", text: messages.saved });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "err", text: error instanceof Error ? error.message : messages.failed });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          className={
            notice.tone === "ok"
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              : "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          }
          role="status"
        >
          {notice.text}
        </div>
      ) : null}

      <Card>
        <CardHeader
          title={messages.devicesTitle}
          subtitle={messages.devicesHint}
          action={
            <Badge tone={full ? "rose" : "blue"}>
              {format(messages.slots, { used: devices.length })}
            </Badge>
          }
        />
        <CardBody>
          {full ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              {messages.slotsFull}
            </p>
          ) : null}

          {devices.length === 0 ? (
            <EmptyState title={messages.noDevices} description={messages.devicesHint} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold text-slate-900">
                        <span className="truncate">{device.name}</span>
                        {device.isCurrent ? <Badge tone="green">{messages.current}</Badge> : null}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {[device.platform, device.browser].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="13" rx="2" />
                        <path d="M8 21h8M12 17v4" />
                      </svg>
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <dt className="text-slate-400">{messages.lastSeen}</dt>
                      <dd className="font-medium text-slate-700">{dateTime(device.lastSeenAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">{messages.ip}</dt>
                      <dd className="font-mono text-slate-700">{device.ip ?? "—"}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-400">{messages.location}</dt>
                      <dd className="text-slate-700">{device.location}</dd>
                    </div>
                  </dl>

                  {editingId === device.id ? (
                    <div className="mt-3 flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                          {messages.renaming}
                        </label>
                        <Input
                          value={nameDraft}
                          maxLength={60}
                          onChange={(event) => setNameDraft(event.target.value)}
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={busyId === device.id || nameDraft.trim().length < 2}
                        onClick={() => void renameDevice(device.id)}
                      >
                        {messages.save}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        {messages.cancel}
                      </Button>
                    </div>
                  ) : confirmId === device.id ? (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                      <p className="text-xs text-rose-800">
                        {device.isCurrent ? messages.revokeCurrent : messages.revokeConfirm}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busyId === device.id}
                          onClick={() => void revokeDevice(device.id)}
                        >
                          {messages.revoke}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setConfirmId(null)}>
                          {messages.cancel}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(device.id);
                          setNameDraft(device.name);
                          setConfirmId(null);
                        }}
                      >
                        {messages.rename}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmId(device.id)}>
                        {messages.revoke}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={messages.historyTitle}
          subtitle={messages.historyHint}
          action={<Badge tone="slate">{format(messages.historyCount, { total: logins.length })}</Badge>}
        />
        <CardBody className="px-0 py-0">
          {logins.length === 0 ? (
            <div className="px-6 py-6">
              <EmptyState title={messages.noHistory} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-medium">{messages.device}</th>
                    <th className="px-4 py-3 font-medium">{messages.ip}</th>
                    <th className="px-4 py-3 font-medium">{messages.location}</th>
                    <th className="px-4 py-3 font-medium">{messages.method}</th>
                    <th className="px-4 py-3 font-medium">{messages.status}</th>
                    <th className="px-4 py-3 font-medium">{messages.changes}</th>
                  </tr>
                </thead>
                <tbody>
                  {logins.map((login) => {
                    const methodKey = `method${login.method}` as keyof SecurityMessages;
                    const changes = login.changes.filter((change) => change.action !== "LOGIN_SUCCESS");
                    const open = expandedId === login.id;
                    return (
                      <tr key={login.id} className="border-b border-slate-50 align-top last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{login.deviceName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {dateTime(login.createdAt)}
                          </p>
                          {login.note ? (
                            <p className="mt-1 max-w-xs text-xs text-slate-500">
                              <span className="font-medium text-slate-600">{messages.note}:</span>{" "}
                              {login.note}
                            </p>
                          ) : null}
                          {login.editedByOwner ? (
                            <p className="mt-1 text-[11px] text-amber-700">{messages.editedByOwner}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{login.ip}</td>
                        <td className="px-4 py-3 text-slate-600">{login.location}</td>
                        <td className="px-4 py-3">
                          <Badge tone="blue">{String(messages[methodKey] ?? login.method)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {login.status === "BLOCKED" ? (
                            <Badge tone="rose">{messages.blocked}</Badge>
                          ) : (
                            <Badge tone="green">{messages.success}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {login.status === "BLOCKED" ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setExpandedId(open ? null : login.id)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
                            >
                              {messages.changes}: {changes.length}
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
                          {open ? (
                            <div className="mt-2 max-w-md rounded-xl border border-slate-200 bg-slate-50 p-3">
                              {changes.length === 0 ? (
                                <p className="text-xs text-slate-500">{messages.noChanges}</p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {changes.map((change) => (
                                    <li key={change.id} className="flex items-start justify-between gap-3 text-xs">
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
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <p className="text-xs leading-relaxed text-slate-500">{messages.loginWarning}</p>
    </div>
  );
}
