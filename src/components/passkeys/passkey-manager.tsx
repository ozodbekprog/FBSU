"use client";

import { useCallback, useEffect, useState } from "react";
import {
  browserSupportsWebAuthn,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, Label } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { PASSKEY_LIMIT, type PasskeyView } from "@/modules/passkeys";

type ListResponse = { ok?: boolean; data?: { items: PasskeyView[] }; error?: string };
type OptionsResponse = { ok?: boolean; data?: PublicKeyCredentialCreationOptionsJSON; error?: string };
type MutationResponse = { ok?: boolean; error?: string };

export default function PasskeyManager({ initialItems }: { initialItems: PasskeyView[] }) {
  const { t } = useI18n();
  const [items, setItems] = useState<PasskeyView[]>(initialItems);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/passkeys", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ListResponse | null;
      if (res.ok && json?.ok && json.data) setItems(json.data.items);
    } catch {
      setError(t("pkFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  async function addPasskey() {
    if (!browserSupportsWebAuthn()) {
      setError(t("pkUnsupported"));
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const optionsRes = await apiFetch("/api/auth/passkeys/registration/options", { method: "POST" });
      const optionsJson = (await optionsRes.json().catch(() => null)) as OptionsResponse | null;
      if (!optionsRes.ok || !optionsJson?.ok || !optionsJson.data) {
        setError(optionsJson?.error ?? t("pkFailed"));
        return;
      }

      const response = await startRegistration({ optionsJSON: optionsJson.data });

      const verifyRes = await apiFetch("/api/auth/passkeys/registration/verify", {
        method: "POST",
        body: JSON.stringify({ response, name }),
      });
      const verifyJson = (await verifyRes.json().catch(() => null)) as MutationResponse | null;
      if (!verifyRes.ok || !verifyJson?.ok) {
        setError(verifyJson?.error ?? t("pkFailed"));
        return;
      }

      setName("");
      setNotice(t("pkAdded"));
      await load();
    } catch {
      setError(t("pkFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(id: string) {
    if (!window.confirm(t("pkRemoveConfirm"))) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch(`/api/auth/passkeys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as MutationResponse | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("pkFailed"));
        return;
      }
      setNotice(t("pkRemoved"));
      await load();
    } catch {
      setError(t("pkFailed"));
    } finally {
      setBusy(false);
    }
  }

  const limitReached = items.length >= PASSKEY_LIMIT;

  return (
    <Card className="mb-6">
      <CardHeader
        title={t("pkTitle")}
        subtitle={t("pkSubtitle")}
        action={
          <Button type="button" size="sm" disabled={busy || limitReached} onClick={() => void addPasskey()}>
            {busy ? t("pkAdding") : t("pkAdd")}
          </Button>
        }
      />
      <CardBody className="space-y-4">
        {limitReached ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
            {t("pkLimit")}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>
        ) : null}

        {items.length === 0 ? (
          <EmptyState title={t("pkEmpty")} description={t("pkEmptyDesc")} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M12 11v3" />
                    <circle cx="12" cy="8.5" r="1" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                    <Badge tone={item.deviceType === "multiDevice" ? "blue" : "slate"}>
                      {item.deviceType === "multiDevice" ? t("pkDeviceMulti") : t("pkDeviceSingle")}
                    </Badge>
                    {item.backedUp ? <Badge tone="green">{t("pkBackedUp")}</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t("pkCreated")}: {fmtDate(item.createdAt)}
                    {" · "}
                    {t("pkLastUsed")}: {item.lastUsedAt ? fmtDate(item.lastUsedAt) : t("pkNever")}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void removePasskey(item.id)}
                >
                  {t("pkRemove")}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <Label htmlFor="passkey-name">{t("pkName")}</Label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <Input
              id="passkey-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("pkNamePlaceholder")}
              maxLength={40}
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("pkSecurityHint")}</p>
        </div>
      </CardBody>
    </Card>
  );
}
