"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { apiFetch } from "@/lib/api";
import { cn, fmtDateTime } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n";

export type GlobalAnnouncement = {
  id: string;
  courseId: string | null;
  authorId: string;
  title: string;
  body: string;
  audience: unknown;
  createdAt: string;
  author: { id: string; name: string; email: string } | null;
};

export type AnnouncementAudience =
  | "ALL"
  | { roles: string[] };

type RoleKey = Parameters<typeof roleLabelKey>[0];

function roleLabelKey(role: string): keyof Dictionary | null {
  const map: Record<string, keyof Dictionary> = {
    ADMIN: "admRoleAdmin",
    REKTOR: "admRoleRector",
    PRO_RECTOR: "admRoleProRector",
    DEKAN: "admRoleDean",
    KAFEDRA_MUDIRI: "admRoleHead",
    REGISTRAR: "admRoleRegistrar",
    BUXGALTER: "admRoleBuxgalter",
    TYUTOR: "admRoleTutor",
    TEACHER: "admRoleTeacher",
    STUDENT: "admRoleStudent",
    XODIM: "admRoleStaff",
    OTA_ONA: "admRoleParent",
  };
  return map[role] ?? null;
}

const ROLE_OPTIONS = [
  "STUDENT",
  "TEACHER",
  "TYUTOR",
  "XODIM",
  "OTA_ONA",
  "REGISTRAR",
  "BUXGALTER",
  "KAFEDRA_MUDIRI",
  "DEKAN",
  "PRO_RECTOR",
  "REKTOR",
  "ADMIN",
] as const;

type CreateMode = "closed" | "open";
type ApiResult = { ok: boolean; error?: string; data?: { recipients?: number } };

function audienceLabel(
  item: GlobalAnnouncement,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const audience = item.audience;
  if (!audience) return t("admAnnouncementsViewAll");
  if (audience === "ALL") return t("admAnnouncementsViewAll");
  if (typeof audience === "object" && "roles" in audience) {
    const roles = (audience as { roles: unknown }).roles;
    if (Array.isArray(roles) && roles.length > 0) {
      const labels = roles
        .map((role) => {
          const key = typeof role === "string" ? roleLabelKey(role) : null;
          return key ? t(key) : String(role);
        })
        .join(", ");
      return labels;
    }
  }
  return t("admAnnouncementsViewAll");
}

export function AnnouncementsManager({
  announcements,
}: {
  announcements: GlobalAnnouncement[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [items, setItems] = useState<GlobalAnnouncement[]>(announcements);
  const [mode, setMode] = useState<CreateMode>("closed");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ALL" | "ROLES">("ALL");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: {
      title: string;
      body: string;
      audience: AnnouncementAudience;
    } = {
      title: title.trim(),
      body: body.trim(),
      audience:
        audience === "ALL" ? "ALL" : { roles: selectedRoles },
    };

    try {
      const res = await apiFetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as ApiResult | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("admAnnouncementsCreateFailed"));
        return;
      }
      setTitle("");
      setBody("");
      setAudience("ALL");
      setSelectedRoles([]);
      setMode("closed");
      setNotice(
        t("admAnnouncementsCreated", {
          count: json.data?.recipients ?? 0,
        }),
      );
      router.refresh();
      const list = await load();
      setItems(list);
    } catch {
      setError(t("admNetworkError"));
    } finally {
      setSaving(false);
    }
  }

  async function load(): Promise<GlobalAnnouncement[]> {
    const res = await apiFetch("/api/admin/announcements");
    const json = (await res.json().catch(() => null)) as
      | {
          ok?: boolean;
          error?: string;
          data?: { announcements?: GlobalAnnouncement[] };
        }
      | null;
    if (!res.ok || !json?.ok || !json.data?.announcements) {
      throw new Error(json?.error ?? "load failed");
    }
    return json.data.announcements;
  }

  async function remove(id: string, currentTitle: string) {
    if (!window.confirm(t("admAnnouncementsConfirmDelete", { title: currentTitle })))
      return;
    setBusyId(id);
    setError(null);
    try {
      const res = await apiFetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as ApiResult | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("admAnnouncementsDeleteFailed"));
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setNotice(t("admAnnouncementsDeleted"));
    } catch {
      setError(t("admNetworkError"));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.title.toLowerCase().includes(query.trim().toLowerCase()) ||
          item.body.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("admAnnouncementsSearchPlaceholder")}
          className="max-w-xs"
        />
        <Button
          size="sm"
          onClick={() => {
            setMode(mode === "open" ? "closed" : "open");
            setError(null);
          }}
        >
          {mode === "open" ? t("admClose") : t("admAnnouncementsNew")}
        </Button>
      </div>

      {notice ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      {mode === "open" ? (
        <Card className="overflow-hidden">
          <CardHeader
            title={t("admAnnouncementsNew")}
            subtitle={t("admAnnouncementsFormHint")}
          />
          <CardBody>
            <form onSubmit={create}>
              <div className="space-y-4">
                <div>
                  <Label>{t("admAnnouncementsColTitle")}</Label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={200}
                    required
                    placeholder={t("msgAnnouncementTitlePlaceholder")}
                  />
                </div>
                <div>
                  <Label>{t("msgBodyLabel")}</Label>
                  <Textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={4}
                    maxLength={10000}
                    required
                    placeholder={t("msgAnnouncementBodyPlaceholder")}
                  />
                </div>
                <div>
                  <Label>{t("admAnnouncementsAudience")}</Label>
                  <Select
                    value={audience}
                    onChange={(event) => {
                      setAudience(event.target.value as "ALL" | "ROLES");
                    }}
                  >
                    <option value="ALL">{t("admAnnouncementsAudienceAll")}</option>
                    <option value="ROLES">
                      {t("admAnnouncementsAudienceRoles")}
                    </option>
                  </Select>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("admAnnouncementsAudienceHint")}
                  </p>
                </div>
                {audience === "ROLES" ? (
                  <div>
                    <Label>{t("admAnnouncementsRolesPlaceholder")}</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ROLE_OPTIONS.map((role) => {
                        const key = roleLabelKey(role);
                        const checked = selectedRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            aria-pressed={checked}
                            onClick={() => {
                              setSelectedRoles((prev) =>
                                checked
                                  ? prev.filter((item) => item !== role)
                                  : [...prev, role],
                              );
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                              checked
                                ? "border-brand-300 bg-brand-50 text-brand-800"
                                : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-800",
                            )}
                          >
                            {key ? t(key) : role}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              {error ? (
                <p className="mt-3 text-sm text-rose-600">{error}</p>
              ) : null}
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setMode("closed");
                    setError(null);
                  }}
                >
                  {t("commonCancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? t("admAnnouncementsSaving")
                    : t("admAnnouncementsPublish")}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={
            query.trim()
              ? t("admAnnouncementsNoResults")
              : t("admAnnouncementsEmptyTitle")
          }
          description={
            query.trim()
              ? t("admAnnouncementsNoResultsDesc")
              : t("admAnnouncementsEmptyDesc")
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const busy = busyId === item.id;
            return (
              <Card key={item.id}>
                <CardHeader
                  title={item.title}
                  subtitle={`${item.author?.name ?? t("admAnonymous")} · ${fmtDateTime(item.createdAt)}`}
                  action={
                    <Badge tone="brand">
                      {t("admAnnouncementsGlobal")} ·{" "}
                      {t("admAnnouncementsRecipients", { count: recipientsOf(item) })}
                    </Badge>
                  }
                />
                <CardBody className="space-y-3">
                  <p className="text-sm leading-relaxed text-slate-700">
                    {item.body}
                  </p>
                  <div className="grid gap-1.5 text-xs text-slate-500 sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-slate-600">
                        {t("admAnnouncementsAudience")}:
                      </span>{" "}
                      {audienceLabel(item, t)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-600">
                        {t("admAnnouncementsCreatedAt")}:
                      </span>{" "}
                      {fmtDateTime(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        void remove(item.id, item.title);
                      }}
                    >
                      {busy
                        ? t("admAnnouncementsDeleting")
                        : t("admAnnouncementsActionDelete")}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function recipientsOf(item: GlobalAnnouncement): number {
  const audience = item.audience;
  if (!audience) return 0;
  if (audience === "ALL") return 0;
  if (typeof audience === "object" && "roles" in audience) {
    const roles = (audience as { roles: unknown }).roles;
    if (Array.isArray(roles)) return roles.length;
  }
  return 0;
}
