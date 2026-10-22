"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { Button, Card, CardBody, CardHeader, Input, Label, Select } from "@/components/ui";
import { apiFetch } from "@/lib/api";

export type EditorUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  groupId: string | null;
  departmentId: string | null;
  isActive: boolean;
  avatarUrl: string | null;
};

type Option = { id: string; name: string };

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Egasi",
  ADMIN: "Administrator",
  REKTOR: "Rektor",
  PRO_RECTOR: "Prorektor",
  DEKAN: "Dekan",
  KAFEDRA_MUDIRI: "Kafedra mudiri",
  REGISTRAR: "O'quv bo'limi",
  BUXGALTER: "Buxgalter",
  TYUTOR: "Tyutor",
  TEACHER: "O'qituvchi",
  STUDENT: "Talaba",
  XODIM: "Xodim",
  OTA_ONA: "Ota-ona",
  NAZORATCHI: "Nazoratchi",
};

const ROLE_OPTIONS: Role[] = [
  "STUDENT",
  "TEACHER",
  "TYUTOR",
  "XODIM",
  "OTA_ONA",
  "NAZORATCHI",
  "KAFEDRA_MUDIRI",
  "DEKAN",
  "PRO_RECTOR",
  "REKTOR",
  "REGISTRAR",
  "ADMIN",
];

type ApiResult = { ok?: boolean; error?: string } | null;

export default function AdminUserEditor({
  user,
  groups,
  departments,
  canEdit,
  canChangeRole,
  canGeneratePassword,
  isSelf,
}: {
  user: EditorUser;
  groups: Option[];
  departments: Option[];
  canEdit: boolean;
  canChangeRole: boolean;
  canGeneratePassword: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [groupId, setGroupId] = useState(user.groupId ?? "");
  const [departmentId, setDepartmentId] = useState(user.departmentId ?? "");
  const [isActive, setIsActive] = useState(user.isActive);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempBusy, setTempBusy] = useState(false);
  const [tempError, setTempError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  async function request(body: unknown) {
    const res = await apiFetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as ApiResult;
    if (!res.ok || !json?.ok) {
      setError(json?.error ?? "Saqlashda xatolik yuz berdi");
      return false;
    }
    return true;
  }

  async function saveProfile() {
    if (!canEdit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const ok = await request({
        name,
        email,
        ...(canChangeRole ? { role } : {}),
        groupId: groupId || null,
        departmentId: departmentId || null,
        isActive,
      });
      if (ok) {
        setNotice("Profil saqlandi.");
        router.refresh();
      }
    } catch {
      setError("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setBusy(false);
    }
  }

  async function generateTempPassword() {
    setTempBusy(true);
    setTempError(null);
    setTempPassword(null);
    setCopyNotice(null);
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/password`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; data?: { password?: string } }
        | null;
      if (!res.ok || !json?.ok || !json.data?.password) {
        setTempError(json?.error ?? "Parol yaratishda xatolik yuz berdi.");
        return;
      }
      setTempPassword(json.data.password);
      router.refresh();
    } catch {
      setTempError("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setTempBusy(false);
    }
  }

  async function copyTempPassword() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopyNotice("Nusxalandi");
    } catch {
      setCopyNotice("Nusxalab bo'lmadi");
    }
  }

  async function savePassword() {
    if (!canEdit) return;
    setError(null);
    setNotice(null);
    if (password.length < 12) {
      setError("Parol kamida 12 belgidan iborat bo'lishi kerak.");
      return;
    }
    if (password !== confirm) {
      setError("Parollar mos kelmadi.");
      return;
    }
    setBusy(true);
    try {
      const ok = await request({ password });
      if (ok) {
        setPassword("");
        setConfirm("");
        setNotice("Yangi parol o'rnatildi. Eski parolni ko'rish mumkin emas — u hash sifatida saqlanadi.");
      }
    } catch {
      setError("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Profil"
          subtitle={canEdit ? "Barcha maydonlarni tahrirlash mumkin" : "Bu akkauntni tahrirlash mumkin emas"}
        />
        <CardBody className="space-y-4">
          {canEdit ? (
            <AvatarUpload
              name={name}
              src={user.avatarUrl}
              size={92}
              endpoint={`/api/admin/users/${user.id}/avatar`}
            />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Ism-familiya</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEdit} />
            </div>
            <div>
              <Label>Rol</Label>
              <Select
                value={role}
                disabled={!canEdit || !canChangeRole || isSelf}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {ROLE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {ROLE_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Guruh</Label>
              <Select value={groupId} disabled={!canEdit} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">Guruhsiz</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Kafedra</Label>
              <Select value={departmentId} disabled={!canEdit} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Kafedrasiz</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300"
                checked={isActive}
                disabled={!canEdit || isSelf}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Faol akkaunt
            </label>
          </div>

          {canEdit ? (
            <div className="flex items-center gap-3">
              <Button onClick={() => void saveProfile()} disabled={busy}>
                {busy ? "Saqlanmoqda..." : "Profilni saqlash"}
              </Button>
              {notice ? <span className="text-sm text-emerald-600">{notice}</span> : null}
              {error ? <span className="text-sm text-rose-600">{error}</span> : null}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Xavfsizlik" subtitle="Parolni ko'rish mumkin emas — faqat yangisini o'rnatish mumkin" />
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-600">
            Eski parol hash ko'rinishida saqlanadi va uni tiklab bo'lmaydi. Yangi parol o'rnatsangiz, foydalanuvchi
            barcha qurilmalardan chiqariladi.
          </p>
          {canEdit ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Yangi parol</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kamida 12 belgi"
                  />
                </div>
                <div>
                  <Label>Yangi parolni tasdiqlang</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => void savePassword()}
                disabled={busy || password.length < 12 || password !== confirm}
              >
                {busy ? "Saqlanmoqda..." : "Parolni yangilash"}
              </Button>
            </>
          ) : null}
        </CardBody>
      </Card>

      {canGeneratePassword ? (
        <Card>
          <CardHeader title="Vaqtinchalik parol" subtitle="Faqat OWNER uchun" />
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-600">
              Mavjud parolni ko‘rish mumkin emas. Yangi vaqtinchalik parol yaratilsa, u faqat bir marta ko‘rsatiladi;
              bazada faqat hash saqlanadi.
            </p>
            {tempPassword ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-700">{user.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 select-all rounded-lg bg-white px-3 py-2 font-mono text-base text-slate-900">
                    {tempPassword}
                  </code>
                  <Button size="sm" variant="secondary" onClick={() => void copyTempPassword()}>
                    Nusxalash
                  </Button>
                </div>
                <p className="mt-2 text-xs text-amber-700">
                  Bu parolni boshqa ko‘rsatmaymiz. Foydalanuvchi kirgach, uni almashtirishni tavsiya qiling.
                </p>
                {copyNotice ? <p className="mt-1 text-xs font-medium text-emerald-700">{copyNotice}</p> : null}
              </div>
            ) : null}
            <Button variant="secondary" onClick={() => void generateTempPassword()} disabled={tempBusy}>
              {tempBusy ? "Yaratilmoqda..." : "Vaqtinchalik parol yaratish"}
            </Button>
            {tempError ? <p className="text-sm text-rose-600">{tempError}</p> : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
