import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { getTrafficSessionDetail } from "@/modules/traffic/stats";
import { formatDateTime, formatDuration, formatTime, pathLabel } from "@/modules/traffic/format";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Egasi",
  ADMIN: "Admin",
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

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Desktop",
  mobile: "Mobil",
  tablet: "Planshet",
  bot: "Bot",
};

export default async function AdminTrafficSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "OWNER"]);
  const { id } = await params;
  const detail = await getTrafficSessionDetail(id);
  if (!detail) notFound();

  const { session, actions, totalDuration } = detail;
  const location =
    [session.city, session.region, session.country].filter(Boolean).join(", ") || "—";
  const sessionDuration = session.lastSeenAt.getTime() - session.startedAt.getTime();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trafik sessiyasi"
        title={session.user?.name ?? "Anonim tashrifchi"}
        subtitle={
          session.user
            ? `${ROLE_LABELS[session.user.role] ?? session.user.role}${session.user.group ? ` · ${session.user.group.name}` : ""}`
            : session.visitorId
        }
        action={
          <Link
            href="/admin/traffic"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:border-slate-300"
          >
            Trafikka qaytish
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={session.isBot ? "amber" : "green"}>
          {session.isBot ? session.botName ?? "Bot" : "Odam"}
        </Badge>
        <Badge tone="blue">{DEVICE_LABELS[session.deviceType ?? ""] ?? "Noma'lum qurilma"}</Badge>
        {session.isBot ? <Badge tone="rose">Bot trafigi</Badge> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tashrif" />
          <CardBody className="space-y-2 text-sm">
            <Row label="Sessiya ID" value={<span className="font-mono text-xs">{session.id}</span>} />
            <Row label="Visitor ID" value={<span className="font-mono text-xs">{session.visitorId}</span>} />
            <Row label="Foydalanuvchi ID" value={session.user?.id ?? "—"} mono />
            <Row label="Qurilma ID" value={session.deviceId ?? "—"} mono />
            <Row label="Login sessiyasi" value={session.loginId ?? "—"} mono />
            <Row label="Boshlangan" value={formatDateTime(session.startedAt)} />
            <Row label="Oxirgi faollik" value={formatDateTime(session.lastSeenAt)} />
            <Row label="Sahifalar" value={String(session.pageCount)} />
            <Row label="Sessiya davomiyligi" value={formatDuration(sessionDuration)} />
            <Row label="Sahifalarda o'tkazilgan" value={formatDuration(totalDuration)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Qurilma va tarmoq" />
          <CardBody className="space-y-2 text-sm">
            <Row label="IP" value={session.ip} mono />
            <Row label="Joylashuv" value={location} />
            <Row label="Brauzer" value={session.browser ?? "—"} />
            <Row label="Platforma" value={session.platform ?? "—"} />
            <Row
              label="Trusted device"
              value={
                session.device
                  ? `${session.device.name}${session.device.revokedAt ? " (bekor qilingan)" : ""}`
                  : "—"
              }
            />
            <Row label="User-Agent" value={<span className="break-all text-xs">{session.userAgent ?? "—"}</span>} />
            <p className="pt-2 text-xs text-slate-400">
              MAC adres HTTP orqali uzatilmaydi — brauzer uni yubormaydi. Qurilma trusted
              device ID si bilan aniqlanadi.
            </p>
          </CardBody>
        </Card>
      </div>

      {session.login ? (
        <Card>
          <CardHeader title="Kirish yozuvi" subtitle="LoginRecord" />
          <CardBody className="grid gap-2 text-sm sm:grid-cols-2">
            <Row label="Usul" value={session.login.method} />
            <Row label="Holat" value={session.login.status} />
            <Row label="Qurilma nomi" value={session.login.deviceName} />
            <Row label="Platforma" value={session.login.platform ?? "—"} />
            <Row label="Brauzer" value={session.login.browser ?? "—"} />
            <Row label="IP" value={session.login.ip} mono />
            <Row label="Joylashuv" value={session.login.location ?? "—"} />
            <Row label="Vaqt" value={formatDateTime(session.login.createdAt)} />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Sahifalar tarixi"
          subtitle={`${session.views.length} ta yozuv · xronologik tartibda`}
        />
        <CardBody>
          {session.views.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Sahifa yozuvlari yo&apos;q.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {session.views.map((view) => (
                <li key={view.id} className="relative">
                  <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full border-2 border-white bg-brand-500" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      {formatTime(view.createdAt)}
                    </span>
                    <span className="font-medium text-slate-800">{pathLabel(view.path)}</span>
                    <span className="font-mono text-[11px] text-slate-400">{view.path}</span>
                    {view.isRsc ? <Badge tone="blue">SPA</Badge> : null}
                    {view.durationMs ? (
                      <Badge tone="slate">{formatDuration(view.durationMs)}</Badge>
                    ) : null}
                  </div>
                  {view.query ? (
                    <p className="mt-1 break-all font-mono text-[11px] text-slate-400">
                      ?{view.query}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      {actions.length > 0 ? (
        <Card>
          <CardHeader
            title="Amallar"
            subtitle="Shu sessiya davomida audit jurnaliga tushgan o'zgarishlar"
          />
          <CardBody>
            <ol className="space-y-2 text-sm">
              {actions.map((action) => (
                <li
                  key={action.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <span className="font-mono text-xs text-slate-700">{action.action}</span>
                  <span className="text-xs text-slate-400">
                    {action.entity ?? "—"} · {formatDateTime(action.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className={mono ? "break-all text-right font-mono text-xs text-slate-700" : "text-right text-slate-700"}>
        {value}
      </span>
    </div>
  );
}
