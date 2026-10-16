import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { CsrfBootstrap } from "@/components/csrf/csrf-bootstrap";
import { getDictionary, getLocale } from "@/i18n";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

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
      </head>
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={locale} dictionary={dictionary}>
          {children}
        </LocaleProvider>
        <PwaRegister />
        <CsrfBootstrap />
      </body>
    </html>
  );
}
