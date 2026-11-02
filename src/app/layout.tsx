/*
 * FBSU LMS — Xoshimov Group tomonidan ishlab chiqilgan.
 * Mualliflik huquqi (c) 2026 Ozodbek Xoshimov Xusanovich. Barcha huquqlar himoyalangan.
 * Ushbu kodni nusxalash, tarqatish yoki sub-litsenziyalash taqiqlanadi (LICENSE faylini ko'ring).
 */
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { CsrfBootstrap } from "@/components/csrf/csrf-bootstrap";
import { TelegramMiniApp } from "@/components/telegram/TelegramMiniApp";
import { Logo } from "@/components/brand/logo";
import { BetaBadge } from "@/components/brand/beta-badge";
import { getDictionary, getLocale } from "@/i18n";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";
import "./fbsu.css";
import "./fbsu-app.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const FALLBACK_SITE_URL = "https://lms.ttpu.uz";
const OG_LOCALES: Record<string, string> = { uz: "uz_UZ", ru: "ru_RU", en: "en_US" };

// Telegram Mini App: WebView ochilishi bilanoq to'liq ekranga kengaytiramiz va
// autentifikatsiya tugaguncha brendli qatlamni ko'rsatamiz (landing ko'rinmaydi).
const TELEGRAM_INIT_SCRIPT = `(function(){try{var path=location.pathname;var gate=path==="/"||path.indexOf("/login")===0;var hash=location.hash||"";var isTg=hash.indexOf("tgWebAppData=")!==-1||/Telegram/i.test(navigator.userAgent)||!!window.TelegramWebviewProxy;if(!isTg)return;var root=document.documentElement;root.dataset.telegram="1";if(gate)root.dataset.tgBooting="1";var proxy=window.TelegramWebviewProxy;if(proxy&&typeof proxy.postEvent==="function"){try{proxy.postEvent("web_app_ready","");proxy.postEvent("web_app_expand","");}catch(e){}}var s=document.createElement("script");s.src="https://telegram.org/js/telegram-web-app.js";s.async=true;s.dataset.telegramWebApp="true";s.onload=function(){try{var app=window.Telegram&&window.Telegram.WebApp;if(!app)return;app.ready();app.expand();var dark=root.dataset.theme==="dark";if(app.setHeaderColor)app.setHeaderColor(dark?"#0b1220":"#1d3460");if(app.setBackgroundColor)app.setBackgroundColor(dark?"#0b1220":"#f6f7fa");}catch(e){}};s.onerror=function(){if(gate)delete root.dataset.tgBooting;};document.head.appendChild(s);if(gate){setTimeout(function(){if(root.dataset.tgBooting!=="1")return;delete root.dataset.tgBooting;},12000);}}catch(e){}})();`;

function resolveSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  try {
    return new URL(raw || FALLBACK_SITE_URL);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const title = dictionary.metaTitle;
  const description = dictionary.metaDescription;

  return {
    metadataBase: resolveSiteUrl(),
    authors: [{ name: "Ozodbek Xoshimov Xusanovich" }],
    creator: "Xoshimov Group",
    publisher: "Xoshimov Group",
    other: {
      copyright: "Copyright (c) 2026 Ozodbek Xoshimov Xusanovich (Xoshimov Group)",
    },
    title: {
      default: title,
      template: "%s — FBSU",
    },
    description,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "FBSU",
      statusBarStyle: "default",
    },
    openGraph: {
      type: "website",
      siteName: "FBSU",
      locale: OG_LOCALES[locale],
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d3460",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: TELEGRAM_INIT_SCRIPT }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('fb-js');setTimeout(function(){if(!window.__fbMotion)document.documentElement.classList.add('fb-reveal-all')},2600);`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <div id="tg-splash" className="tg-splash" role="status" aria-label="FBSU yuklanmoqda">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-2xl bg-white p-2 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)]">
                <Logo size={38} />
              </span>
              <BetaBadge onDark />
            </div>
            <div className="mt-7 h-px w-44 overflow-hidden bg-white/10">
              <span className="tg-splash-bar block h-full bg-gradient-to-r from-brand-400 via-gold-300 to-gold-400" />
            </div>
            <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.32em] text-white/35">
              Turin Polytechnic University
            </p>
          </div>
        </div>
        <LocaleProvider locale={locale} dictionary={dictionary}>
          {children}
        </LocaleProvider>
        <PwaRegister />
        <CsrfBootstrap />
        <TelegramMiniApp />
      </body>
    </html>
  );
}
