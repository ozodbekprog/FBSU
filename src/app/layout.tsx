import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope, Sora } from "next/font/google";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { CsrfBootstrap } from "@/components/csrf/csrf-bootstrap";
import { getDictionary, getLocale, htmlLang } from "@/i18n";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";
import "./fbsu-app.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const FALLBACK_SITE_URL = "https://lms.ttpu.uz";
const OG_LOCALES: Record<string, string> = {
  uz: "uz_UZ",
  "uz-new": "uz_UZ",
  "uz-cyrl": "uz_UZ",
  ru: "ru_RU",
  en: "en_US",
};

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
  // Запрет масштабирования страницы стандартными жестами браузера
  // (pinch-to-zoom, double-tap zoom).
  //
  // ЗАЧЕМ: при масштабировании интерфейс ломается — sidebar исчезает
  // (был `hidden md:flex`), панели `position: fixed` уходят за экран,
  // ломается раскладка. Это подтверждено видеозаписью.
  //
  // ОГРАНИЧЕНИЕ: iOS Safari намеренно ИГНОРИРУЕТ `user-scalable=no`
  // (политика доступности), поэтому на iOS pinch-to-zoom может
  // продолжать работать. На Android/Chrome и большинстве браузеров
  // жест блокируется.
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1d3460",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return (
    <html
      lang={htmlLang(locale)}
      suppressHydrationWarning
      className={`${manrope.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/*
          Запрет масштабирования на ПК (Ctrl+колесо, Ctrl++/−, pinch на
          трекпаде). Это INLINE-скрипт: он выполняется сразу при парсинге
          HTML, ДО гидратации React — поэтому работает даже если React
          не смонтировался (что и происходит в headless-браузере).

          Обычная прокрутка (wheel без ctrlKey) не затрагивается.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              function onWheel(e){ if(e.ctrlKey||e.metaKey) e.preventDefault(); }
              function onKeyDown(e){
                if(!e.ctrlKey && !e.metaKey) return;
                var k=e.key;
                if(k==='+'||k==='='||k==='-'||k==='_'||k==='0') e.preventDefault();
              }
              window.addEventListener('wheel', onWheel, { passive:false });
              window.addEventListener('keydown', onKeyDown);
            })();`,
          }}
        />
        <LocaleProvider locale={locale} dictionary={dictionary}>
          {children}
        </LocaleProvider>
        <PwaRegister />
        <CsrfBootstrap />
      </body>
    </html>
  );
}
