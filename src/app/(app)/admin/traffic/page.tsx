import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  PageHeader,
  Stat,
  Table,
} from "@/components/ui";
import { BarChart } from "@/components/charts";
import TrafficAutoRefresh from "@/components/admin/TrafficAutoRefresh";
import {
  getLiveSessions,
  getTrafficBots,
  getTrafficOverview,
  getTrafficSessions,
  getTrafficUsers,
} from "@/modules/traffic/stats";
import {
  formatDateTime,
  formatDuration,
  formatTime,
  pathLabel,
  referrerSource,
  relativeTime,
} from "@/modules/traffic/format";
import type { TrafficKind, TrafficRange } from "@/modules/traffic/types";

const RANGES: Array<{ value: TrafficRange; label: string }> = [
  { value: "today", label: "Bugun" },
  { value: "7d", label: "7 kun" },
  { value: "30d", label: "30 kun" },
];

const KINDS: Array<{ value: TrafficKind; label: string }> = [
  { value: "all", label: "Hammasi" },
  { value: "human", label: "Odamlar" },
  { value: "bot", label: "Botlar" },
];

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

type SessionRow = Awaited<ReturnType<typeof getLiveSessions>>[number];

function one(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

function parseRange(value: string): TrafficRange {
  return value === "7d" || value === "30d" ? value : "today";
}

function parseKind(value: string): TrafficKind {
  return value === "human" || value === "bot" ? value : "all";
}

function buildHref(state: { range: TrafficRange; kind: TrafficKind; q: string; page: number }, patch: Partial<typeof state>) {
  const next = { ...state, ...patch };
  const params = new URLSearchParams();
  if (next.range !== "today") params.set("range", next.range);
  if (next.kind !== "all") params.set("kind", next.kind);
  if (next.q) params.set("q", next.q);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/admin/traffic?${query}` : "/admin/traffic";
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function locationLabel(session: SessionRow): string {
  const parts = [session.city, session.country].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : "—";
}

function deviceLabel(session: SessionRow): string {
  if (session.device?.name) return session.device.name;
  const parts = [session.browser, session.platform].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function Identity({ session }: { session: SessionRow }) {
  if (session.user) {
    return (
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800">{session.user.name}</p>
        <p className="text-xs text-slate-500">
          {roleLabel(session.user.role)}
          {session.user.group ? ` · ${session.user.group.name}` : ""}
        </p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="font-medium text-slate-600">Anonim</p>
      <p className="truncate font-mono text-[11px] text-slate-400">
        {session.visitorId.slice(-10)}
      </p>
    </div>
  );
}

function RankList({
  items,
  empty,
}: {
  items: Array<{ name: string; value: number }>;
  empty: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.name}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{item.name}</span>
            <span className="shrink-0 font-medium text-slate-500">{item.value}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.max(4, Math.round((item.value / max) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AdminTrafficPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; kind?: string; q?: string; page?: string }>;
}) {
  await requireRole(["ADMIN", "OWNER"]);

  const params = await searchParams;
  const range = parseRange(one(params.range));
  const kind = parseKind(one(params.kind));
  const q = one(params.q).trim().slice(0, 120);
  const pageParam = Number(one(params.page));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const [overview, live, sessions, users, bots] = await Promise.all([
    getTrafficOverview(range, kind),
    getLiveSessions(),
    getTrafficSessions({ range, kind, search: q, page }),
    getTrafficUsers(range),
    getTrafficBots(range),
  ]);

  const state = { range, kind, q, page };
  const rangeLabel = RANGES.find((item) => item.value === range)?.label ?? "Bugun";
  const kindLabel = KINDS.find((item) => item.value === kind)?.label ?? "Hammasi";
  const totalPages = Math.max(1, Math.ceil(sessions.total / sessions.pageSize));
  const filtered = kind !== "all" || q.length > 0;

  const chip = (active: boolean) =>
    active
      ? "rounded-full border border-brand-900 bg-brand-900 px-3.5 py-1.5 text-sm font-medium text-white"
      : "rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analitika"
        title="Sayt trafigi"
        subtitle="Kim, qayerdan kirdi, qaysi sahifalarni ko'rdi va qancha vaqt qoldi"
        action={<TrafficAutoRefresh />}
      />

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((item) => (
          <Link
            key={item.value}
            href={buildHref(state, { range: item.value, page: 1 })}
            className={chip(range === item.value)}
          >
            {item.label}
          </Link>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        {KINDS.map((item) => (
          <Link
            key={item.value}
            href={buildHref(state, { kind: item.value, page: 1 })}
            className={chip(kind === item.value)}
          >
            {item.label}
          </Link>
        ))}
        {filtered ? (
          <Link href="/admin/traffic" className="text-xs font-medium text-slate-500 hover:text-slate-700">
            Filtrni tozalash
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Hozir saytda" value={overview.online} hint="oxirgi 5 daqiqada faol" />
        <Stat
          label="Noyob tashrifchilar"
          value={overview.visitors.toLocaleString("uz-UZ")}
          hint={`${overview.sessions.toLocaleString("uz-UZ")} sessiya · ${rangeLabel.toLocaleLowerCase()}`}
        />
        <Stat
          label="Sahifa ko'rishlari"
          value={overview.views.toLocaleString("uz-UZ")}
          hint={`${kindLabel} bo'yicha`}
        />
        <Stat
          label="Botlar"
          value={overview.botSessions.toLocaleString("uz-UZ")}
          hint={`${overview.botViews.toLocaleString("uz-UZ")} ko'rish`}
        />
        <Stat
          label="Sahifa / sessiya"
          value={
            overview.sessions > 0
              ? (overview.views / overview.sessions).toFixed(1).replace(".", ",")
              : "0"
          }
          hint="o'rtacha chuqurlik"
        />
      </div>

      <Card>
        <CardHeader
          title="Ko'rishlar dinamikasi"
          subtitle={`${rangeLabel} · ${kindLabel}`}
        />
        <CardBody>
          <BarChart data={overview.series} />
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title="Hozir saytda"
            subtitle={`${live.length} ta faol tashrifchi`}
            action={<Badge tone="green">Live</Badge>}
          />
          <CardBody className="p-0">
            {live.length === 0 ? (
              <EmptyState
                title="Hozir hech kim yo'q"
                description="Oxirgi 5 daqiqada faol tashrifchi topilmadi."
              />
            ) : (
              <Table>
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Kim</th>
                    <th className="px-4 py-3">Sahifa</th>
                    <th className="px-4 py-3">Joylashuv</th>
                    <th className="px-4 py-3">Qurilma</th>
                    <th className="px-4 py-3">Vaqt</th>
                  </tr>
                </thead>
                <tbody>
                  {live.map((session) => (
                    <tr key={session.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/admin/traffic/${session.id}`} className="block hover:opacity-80">
                          <Identity session={session} />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/traffic/${session.id}`} className="text-slate-700 hover:text-brand-700">
                          {pathLabel(session.lastPath)}
                        </Link>
                        <p className="text-[11px] text-slate-400">{session.lastPath}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{locationLabel(session)}</td>
                      <td className="px-4 py-3 text-slate-600">{deviceLabel(session)}</td>
                      <td className="px-4 py-3 text-slate-500">{relativeTime(session.lastSeenAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Manbalar" subtitle="Tashrif qayerdan boshlangan" />
          <CardBody>
            <RankList items={overview.sources} empty="Manba ma'lumoti yo'q" />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Top sahifalar" subtitle={rangeLabel} />
          <CardBody className="p-0">
            {overview.topPaths.length === 0 ? (
              <EmptyState title="Sahifa ko'rishlari yo'q" />
            ) : (
              <Table>
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Sahifa</th>
                    <th className="px-4 py-3 text-right">Ko'rishlar</th>
                    <th className="px-4 py-3 text-right">Tashrifchilar</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topPaths.map((item) => (
                    <tr key={item.path} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{item.label}</p>
                        <p className="text-[11px] text-slate-400">{item.path}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {item.views.toLocaleString("uz-UZ")}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {item.visitors.toLocaleString("uz-UZ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader title="Davlatlar" />
            <CardBody>
              <RankList items={overview.countries} empty="Geo ma'lumot yo'q" />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Shaharlar" />
            <CardBody>
              <RankList items={overview.cities} empty="Geo ma'lumot yo'q" />
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Brauzerlar" subtitle="Sessiyalar bo'yicha" />
        <CardBody>
          <RankList items={overview.browsers} empty="Qurilma ma'lumoti yo'q" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Tashrif sessiyalari"
          subtitle={`${sessions.total.toLocaleString("uz-UZ")} ta yozuv · ${rangeLabel}`}
          action={
            <form method="get" className="flex items-center gap-2">
              <input type="hidden" name="range" value={range} />
              <input type="hidden" name="kind" value={kind} />
              <Input
                name="q"
                defaultValue={q}
                placeholder="IP yoki sahifa..."
                className="h-9 w-44"
              />
              <Button type="submit" variant="secondary" size="sm">
                Qidirish
              </Button>
            </form>
          }
        />
        <CardBody className="p-0">
          {sessions.items.length === 0 ? (
            <EmptyState
              title="Sessiya topilmadi"
              description="Tanlangan davr yoki filtr bo'yicha ma'lumot yo'q."
            />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Boshlangan</th>
                  <th className="px-4 py-3">Kim</th>
                  <th className="px-4 py-3">IP / joylashuv</th>
                  <th className="px-4 py-3">Sahifalar</th>
                  <th className="px-4 py-3">Davomiylik</th>
                  <th className="px-4 py-3">Kirish</th>
                  <th className="px-4 py-3">Qurilma</th>
                </tr>
              </thead>
              <tbody>
                {sessions.items.map((session) => (
                  <tr key={session.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      <Link href={`/admin/traffic/${session.id}`} className="hover:text-brand-700">
                        {formatDateTime(session.startedAt)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/traffic/${session.id}`} className="block hover:opacity-80">
                        <Identity session={session} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p className="font-mono text-xs">{session.ip}</p>
                      <p className="text-[11px] text-slate-400">{locationLabel(session)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700">{session.pageCount}</span>
                      <p className="max-w-[180px] truncate text-[11px] text-slate-400">
                        {pathLabel(session.landingPath)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDuration(session.lastSeenAt.getTime() - session.startedAt.getTime())}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{referrerSource(session.referrer)}</p>
                      {session.isBot ? (
                        <Badge tone="amber">{session.botName ?? "Bot"}</Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{deviceLabel(session)}</p>
                      <p className="text-[11px] text-slate-400">
                        {DEVICE_LABELS[session.deviceType ?? ""] ?? "—"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-sm">
            <span className="text-slate-500">
              {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={buildHref(state, { page: page - 1 })}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:border-slate-300"
                >
                  Oldingi
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={buildHref(state, { page: page + 1 })}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:border-slate-300"
                >
                  Keyingi
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Foydalanuvchilar"
          subtitle={`Tizimga kirgan foydalanuvchilar · ${rangeLabel}`}
        />
        <CardBody className="p-0">
          {users.length === 0 ? (
            <EmptyState title="Foydalanuvchi tashrifi yo'q" />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Foydalanuvchi</th>
                  <th className="px-4 py-3">Guruh</th>
                  <th className="px-4 py-3 text-right">Ko'rishlar</th>
                  <th className="px-4 py-3 text-right">Qurilmalar</th>
                  <th className="px-4 py-3">Oxirgi faollik</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{user.name}</p>
                      <p className="text-[11px] text-slate-400">{roleLabel(user.role)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.group ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {user.views.toLocaleString("uz-UZ")}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{user.visitors}</td>
                    <td className="px-4 py-3 text-slate-500">{relativeTime(user.last)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Botlar" subtitle={`Qidiruv robotlari va skriptlar · ${rangeLabel}`} />
        <CardBody className="p-0">
          {bots.length === 0 ? (
            <EmptyState title="Bot trafigi yo'q" />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Bot</th>
                  <th className="px-4 py-3 text-right">Ko'rishlar</th>
                  <th className="px-4 py-3 text-right">Sahifalar</th>
                  <th className="px-4 py-3">Oxirgi</th>
                </tr>
              </thead>
              <tbody>
                {bots.map((bot) => (
                  <tr key={bot.name} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <Badge tone="amber">{bot.name}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {bot.hits.toLocaleString("uz-UZ")}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{bot.pages}</td>
                    <td className="px-4 py-3 text-slate-500">{formatTime(bot.last)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-slate-400">
        Eslatma: MAC adres brauzer tomonidan HTTP so&apos;rovda yuborilmaydi. Qurilma
        "Trusted device" ID si va IP manzil asosida aniqlanadi.
      </p>
    </div>
  );
}
