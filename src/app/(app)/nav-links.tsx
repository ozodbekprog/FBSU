"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { useMediaQuery, useWebGLSupport } from "@/components/nav/nav-3d-env";
import { useNavCollapsed } from "@/components/nav/nav-collapsed";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const Nav3DLayer = dynamic(
  () => import("@/components/nav/nav-3d-layer").then((mod) => mod.Nav3DLayer),
  { ssr: false },
);

export type NavLink = { href: string; label: string; badge?: ReactNode };
export type NavGroup = { label: string; links: NavLink[] };

export type MobileTabIcon = "home" | "book" | "calendar" | "chart" | "chat" | "list";
export type MobileTab = { href: string; label: string; icon: MobileTabIcon; badge?: ReactNode };

const TAB_ICONS: Record<MobileTabIcon, ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </>
  ),
  chart: (
    <>
      <path d="M6 20v-6" />
      <path d="M12 20V4" />
      <path d="M18 20V10" />
      <path d="M3 20h18" />
    </>
  ),
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  list: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </>
  ),
};

export function MobileTabBar({ tabs }: { tabs: MobileTab[] }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      aria-label={t("shellMobileNav")}
      data-tour="mobile-nav"
      className="fixed bottom-0 left-0 z-30 w-full border-t border-slate-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgba(29,52,96,0.45)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch px-1.5">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <div key={tab.href} className="relative flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-medium transition-colors duration-150",
                  active ? "text-brand-900" : "text-slate-500 hover:text-brand-700",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-7 w-12 items-center justify-center rounded-xl transition-colors duration-150",
                    active ? "bg-brand-50 text-brand-900" : "text-slate-500",
                  )}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5"
                    aria-hidden="true"
                  >
                    {TAB_ICONS[tab.icon]}
                  </svg>
                  {active ? (
                    <span className="absolute -top-0.5 right-1/2 size-1.5 translate-x-4 rounded-full bg-gold-400" />
                  ) : null}
                </span>
                <span className="whitespace-nowrap">{tab.label}</span>
              </Link>
              {tab.badge ? (
                <span
                  inert
                  className="pointer-events-none absolute top-1.5 right-1/2 translate-x-3 [&>span]:size-0 [&_svg]:hidden"
                >
                  {tab.badge}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function BurgerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function NavLinks({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const shellRef = useRef<HTMLDivElement>(null);
  const webgl = useWebGLSupport();
  const desktop = useMediaQuery("(min-width: 768px)");
  const with3d = webgl && desktop;
  const { collapsed, toggle } = useNavCollapsed();
  const [tip, setTip] = useState<{ label: string; y: number } | null>(null);

  const hideTip = useCallback(() => setTip(null), []);

  useEffect(() => {
    if (!collapsed) hideTip();
  }, [collapsed, hideTip]);

  useEffect(() => {
    hideTip();
  }, [pathname, hideTip]);

  return (
    <div
      ref={shellRef}
      data-nav-shell=""
      data-collapsed={collapsed ? "true" : undefined}
      className="relative flex min-h-0 flex-1 flex-col"
    >
      {with3d ? <Nav3DLayer containerRef={shellRef} /> : null}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-controls="sidebar-nav"
        aria-label={t("shellMenuClose")}
        title={t("shellMenuClose")}
        className="nav-burger-top absolute -top-12 right-25 z-30 hidden size-8 items-center justify-center rounded-xl text-slate-500 hover:bg-brand-50 hover:text-brand-900 md:inline-flex"
      >
        <BurgerIcon />
      </button>
      {collapsed ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={false}
          aria-controls="sidebar-nav"
          aria-label={t("shellMenuOpen")}
          title={t("shellMenuOpen")}
          className="nav-burger-rail z-30 mx-auto my-1.5 hidden size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors duration-150 hover:bg-brand-50 hover:text-brand-900 md:inline-flex"
        >
          <BurgerIcon />
        </button>
      ) : null}
      <nav
        id="sidebar-nav"
        onScroll={hideTip}
        onPointerLeave={hideTip}
        onPointerOver={(event) => {
          if (!collapsed || !desktop || event.pointerType === "touch") {
            hideTip();
            return;
          }
          const target = event.target;
          const link =
            target instanceof Element ? target.closest<HTMLElement>("[data-nav-link]") : null;
          const shell = shellRef.current;
          if (!link || !shell) {
            hideTip();
            return;
          }
          const anchor = link.querySelector<HTMLElement>("[data-nav3d-href]") ?? link;
          const shellRect = shell.getBoundingClientRect();
          const rect = anchor.getBoundingClientRect();
          const label = link.dataset.navLabel ?? "";
          const y = rect.top - shellRect.top + rect.height / 2;
          setTip((prev) =>
            prev && prev.label === label && Math.abs(prev.y - y) < 0.5 ? prev : { label, y },
          );
        }}
        className={cn(
          "relative z-10 flex-1 overflow-y-auto px-3 py-4",
          collapsed ? "space-y-1.5" : "space-y-4",
        )}
      >
        {groups.map((group, groupIndex) => (
          <div key={group.label} className={cn("nav-group", groupIndex > 0 && "nav-group-sep")}>
            <p className="nav-group-label px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.links.map((l, index) => {
                const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    data-nav-link=""
                    data-nav-label={l.label}
                    data-active={active ? "true" : undefined}
                    aria-label={l.label}
                    className={cn(
                      "nav-link group flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium",
                      active
                        ? "bg-brand-900 text-white shadow-[0_6px_16px_-8px_rgba(29,52,96,0.7)]"
                        : "text-slate-600 hover:bg-brand-50 hover:text-brand-900",
                    )}
                  >
                    <span
                      data-nav3d-href={l.href}
                      data-nav3d-key={index}
                      data-nav3d-active={active ? "true" : "false"}
                      className="nav-icon flex size-6 shrink-0 items-center justify-center"
                    >
                      {!with3d ? (
                        <span
                          className={cn(
                            "size-1.5 rounded-full transition-colors",
                            active ? "bg-gold-400" : "bg-slate-300 group-hover:bg-brand-400",
                          )}
                        />
                      ) : null}
                    </span>
                    <span className="nav-label">{l.label}</span>
                    {l.badge ? <span className="nav-badge">{l.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {collapsed && desktop && tip ? (
        <div
          key={`${tip.label}:${Math.round(tip.y)}`}
          aria-hidden="true"
          className="nav-tooltip"
          style={{ top: tip.y }}
        >
          <span className="nav-tooltip-dot" />
          {tip.label}
        </div>
      ) : null}
    </div>
  );
}
