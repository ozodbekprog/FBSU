import type { Metadata } from "next";
import Link from "next/link";
import { FbMotion } from "@/components/fb/fb-motion";
import { getDictionary, getLocale } from "@/i18n";

const SITE_URL = "https://lms.ttpu.uz";
const OG_LOCALES: Record<string, string> = { uz: "uz_UZ", ru: "ru_RU", en: "en_US" };
const INTL_LOCALES: Record<string, string> = { uz: "uz-UZ", ru: "ru-RU", en: "en-GB" };

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      title: dictionary.metaTitle,
      description: dictionary.metaDescription,
      siteName: "FBSU",
      locale: OG_LOCALES[locale],
    },
    twitter: {
      card: "summary",
      title: dictionary.metaTitle,
      description: dictionary.metaDescription,
    },
  };
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function PhoneNav({ active }: { active: number }) {
  return (
    <div className="fb-ph-nav" aria-hidden="true">
      <span className={active === 0 ? "on" : undefined}>
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      </span>
      <span className={active === 1 ? "on" : undefined}>
        <svg viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      </span>
      <span className={active === 2 ? "on" : undefined}>
        <svg viewBox="0 0 24 24">
          <path d="M9 11l3 3 8-8" />
          <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
        </svg>
      </span>
      <span className={active === 3 ? "on" : undefined}>
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      </span>
    </div>
  );
}

export default async function HomePage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const todayLabel = new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Turin Polytechnic University",
        alternateName: "FBSU",
        url: SITE_URL,
        email: "info@ttpu.uz",
        telephone: "+998 71 289 99 00",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Tashkent",
          addressCountry: "UZ",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "FBSU",
        url: SITE_URL,
        inLanguage: locale,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="fb-landing" data-fb-root="landing">
        <FbMotion variant="landing" />

        <div className="fb-gnav">
          <div className="fb-gnav-in">
            <Link className="fb-g-brand" href="/">
              <img src="/logo.svg" alt="FBSU" width={27} height={27} />
              <b>FBSU</b>
              <span>TTPU</span>
            </Link>
            <nav aria-label="Asosiy navigatsiya">
              <a href="#platforma">{dictionary.fbNavPlatform}</a>
              <a href="#modullar">{dictionary.fbNavModules}</a>
              <a href="#kabinet">{dictionary.fbNavCabinet}</a>
              <a href="#ilova">{dictionary.fbNavApp}</a>
              <a href="#universitet">{dictionary.fbNavUniversity}</a>
            </nav>
            <div className="fb-g-right">
              <Link className="fb-login" href="/login">
                {dictionary.fbLogin}
              </Link>
              <Link className="fb-cta" href="/register">
                {dictionary.fbRegister} <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>

        <header className="fb-hero">
          <div className="fb-hero-copy">
            <span className="fb-eyebrow">
              <i />
              {dictionary.fbEyebrow}
            </span>
            <h1 className="fb-hero-title">
              <span className="fb-line">{dictionary.fbHeroLine1}</span>
              <span className="fb-line fb-grad">{dictionary.fbHeroLine2}</span>
            </h1>
            <p className="fb-hero-sub">{dictionary.fbHeroSubtitle}</p>
            <div className="fb-hero-actions">
              <Link className="fb-btn-primary" href="/dashboard">
                {dictionary.fbHeroCta} <ArrowIcon />
              </Link>
              <a className="fb-link-play" href="#kabinet">
                {dictionary.fbHeroDemo}{" "}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 6 9 6-9 6V6Z" />
                </svg>
              </a>
            </div>
            <div className="fb-hero-note">
              <b>20 000+</b> talaba · <b>1 800+</b> kurs · <b>24/7</b> yoningizda
            </div>
          </div>

          <div className="fb-stage">
            <div className="fb-glow" />
            <div className="fb-browser">
              <div className="fb-chrome">
                <span className="fb-tl r" />
                <span className="fb-tl y" />
                <span className="fb-tl g" />
                <div className="fb-addr">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="4" y="10" width="16" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  {dictionary.fbPreviewAddress}
                </div>
                <span className="fb-spacer" />
              </div>
              <div className="fb-shot">
                <img
                  src="/fb-dashboard-preview.jpg"
                  alt="FBSU talaba kabineti"
                  width={1680}
                  height={1176}
                />
              </div>
            </div>

            <div className="fb-float gpa">
              <div className="fb-lbl">{dictionary.fbGpaOverall}</div>
              <div className="fb-val">
                <b data-fb-count="3.82" data-fb-decimals="2">
                  3.82
                </b>
                <span>/ 4.00</span>
              </div>
              <svg className="fb-spark" viewBox="0 0 70 18" aria-hidden="true">
                <path d="M1 15 11 12 21 13 31 7 41 9 51 3 69 5" />
              </svg>
            </div>
            <div className="fb-float task">
              <div className="fb-lbl">{dictionary.fbDeadlineSoon}</div>
              <div className="fb-row">
                <i />
                <b>
                  {dictionary.fbNotifTitle} · {dictionary.fbdDeadlineToday.toLowerCase()}
                </b>
              </div>
            </div>
          </div>

          <div className="fb-hero-fade" />
        </header>

        <section className="fb-stats">
          <div className="fb-wrap fb-in">
            <div className="fb-intro" data-fb-reveal>
              <div className="fb-l">{dictionary.fbStatsIntroTitle}</div>
              <p>{dictionary.fbStatsIntroText}</p>
            </div>
            <div className="fb-stat" data-fb-reveal data-fb-delay="90">
              <b>
                <span data-fb-count="20000">20 000</span>+
              </b>
              <span>{dictionary.fbStatUsers}</span>
            </div>
            <div className="fb-stat" data-fb-reveal data-fb-delay="180">
              <b>
                <span data-fb-count="1800">1 800</span>+
              </b>
              <span>{dictionary.fbStatCourses}</span>
            </div>
            <div className="fb-stat" data-fb-reveal data-fb-delay="270">
              <b>
                <span data-fb-count="120">120</span>+
              </b>
              <span>{dictionary.fbStatTeachers}</span>
            </div>
            <div className="fb-stat" data-fb-reveal data-fb-delay="360">
              <b>24/7</b>
              <span>{dictionary.fbStatSupport}</span>
            </div>
          </div>
        </section>

        <section className="fb-bento-sec" id="platforma">
          <div className="fb-wrap">
            <div className="fb-sec-head" data-fb-reveal>
              <div className="fb-sec-kicker">{dictionary.fbBentoKicker}</div>
              <h2 className="fb-sec-title">
                {dictionary.fbBentoTitleA}
                <br />
                <span className="fb-soft">{dictionary.fbBentoTitleB}</span>
              </h2>
              <p className="fb-sec-sub">{dictionary.fbBentoSubtitle}</p>
            </div>

            <div className="fb-bento">
              <div
                className="fb-tile dark fb-t1"
                data-fb-reveal
                data-fb-spotlight
                data-fb-delay="80"
              >
                <div className="fb-t-kick">{dictionary.fbdCardTodaySchedule}</div>
                <h3>
                  {dictionary.fbTileScheduleTitleA}
                  <br />
                  {dictionary.fbTileScheduleTitleB}
                </h3>
                <p>{dictionary.fbTileScheduleDesc}</p>
                <div className="fb-mini-sched">
                  <div className="fb-ms-row">
                    <time>08:30</time>
                    <div className="fb-sub">
                      <b>Differensial tenglamalar</b>
                      <span>A-204</span>
                    </div>
                    <span className="fb-st">{dictionary.fbStatusDone}</span>
                  </div>
                  <div className="fb-ms-row now">
                    <time>10:00</time>
                    <div className="fb-sub">
                      <b>Programmalash asoslari</b>
                      <span>B-311 · D. Rahimov</span>
                    </div>
                    <span className="fb-st">{dictionary.fbStatusNow}</span>
                  </div>
                  <div className="fb-ms-row">
                    <time>11:30</time>
                    <div className="fb-sub">
                      <b>Fizika (amaliy)</b>
                      <span>Lab-2</span>
                    </div>
                    <span className="fb-st">{dictionary.fbStatusNext}</span>
                  </div>
                  <div className="fb-ms-row">
                    <time>14:00</time>
                    <div className="fb-sub">
                      <b>{dictionary.fbCourseEnglish}</b>
                      <span>C-105</span>
                    </div>
                    <span className="fb-st">{dictionary.fbStatusNext}</span>
                  </div>
                </div>
              </div>

              <div className="fb-tile fb-t2" data-fb-reveal data-fb-spotlight data-fb-delay="160">
                <div className="fb-t-kick">GPA</div>
                <h3>{dictionary.fbTileGpaTitle}</h3>
                <p>{dictionary.fbTileGpaDesc}</p>
                <div className="fb-gpa-vis">
                  <div className="fb-num">
                    <span data-fb-count="3.82" data-fb-decimals="2">
                      3.82
                    </span>
                    <small>/4</small>
                  </div>
                  <div className="fb-up">+0.34</div>
                </div>
                <div className="fb-gpa-ring">
                  <b>
                    <span data-fb-count="95.5" data-fb-decimals="1">
                      95.5
                    </span>
                    %
                  </b>
                </div>
              </div>

              <div className="fb-tile fb-t3" data-fb-reveal data-fb-spotlight data-fb-delay="240">
                <div className="fb-t-kick">{dictionary.fbdKpiAssignments}</div>
                <h3>
                  {dictionary.fbTileAssignmentsTitleA}
                  <br />
                  {dictionary.fbTileAssignmentsTitleB}
                </h3>
                <p>{dictionary.fbTileAssignmentsDesc}</p>
                <div className="fb-checklist">
                  <div className="fb-ck done">
                    <i />
                    <span>{dictionary.fbNotifTitle}</span>
                    <b>{dictionary.fbdDeadlineToday}</b>
                  </div>
                  <div className="fb-ck">
                    <i />
                    <span>{dictionary.fbSampleTask2}</span>
                    <b>2 kun</b>
                  </div>
                  <div className="fb-ck">
                    <i />
                    <span>{dictionary.fbSampleTask3}</span>
                    <b>6 kun</b>
                  </div>
                </div>
              </div>

              <div className="fb-tile fb-t4" data-fb-reveal data-fb-spotlight data-fb-delay="80">
                <div className="fb-t-kick">Telegram</div>
                <h3>
                  {dictionary.fbTileTelegramTitleA}
                  <br />
                  {dictionary.fbTileTelegramTitleB}
                </h3>
                <p>{dictionary.fbTileTelegramDesc}</p>
                <div className="fb-chat">
                  <div className="fb-bub bot">{dictionary.fbChatBot}</div>
                  <div className="fb-bub me">{dictionary.fbChatMe}</div>
                  <div className="fb-inp">{dictionary.fbChatPlaceholder}</div>
                </div>
              </div>

              <div className="fb-tile fb-t5" data-fb-reveal data-fb-spotlight data-fb-delay="160">
                <div className="fb-t-kick">{dictionary.fbdAttendanceTitle}</div>
                <h3>
                  {dictionary.fbTileAttendanceTitleA}
                  <br />
                  {dictionary.fbTileAttendanceTitleB}
                </h3>
                <p>{dictionary.fbTileAttendanceDesc}</p>
                <div className="fb-att-vis">
                  <div className="fb-att-ring">
                    <b>
                      <span data-fb-count="95.8" data-fb-decimals="1">
                        95.8
                      </span>
                      %
                    </b>
                  </div>
                  <div className="fb-txt">
                    <b>23 / 24 dars</b>
                    <span>
                      Har kuni
                      <br />
                      avtomatik yangilanadi
                    </span>
                  </div>
                </div>
              </div>

              <div className="fb-tile fb-t6" data-fb-reveal data-fb-spotlight data-fb-delay="240">
                <div className="fb-t-kick">{dictionary.fbFootGpa}</div>
                <h3>{dictionary.fbTileTranscriptTitle}</h3>
                <p>{dictionary.fbTileTranscriptDesc}</p>
                <div className="fb-doc">
                  <div className="fb-d-top">
                    <b>{dictionary.fbTranscriptDoc}</b>
                    <span>2026 / 2027</span>
                  </div>
                  <div className="fb-d-row">
                    <span>Differensial tenglamalar</span>
                    <b>92 · A</b>
                  </div>
                  <div className="fb-d-row">
                    <span>Programmalash asoslari</span>
                    <b>88 · B+</b>
                  </div>
                  <div className="fb-d-row">
                    <span>Fizika</span>
                    <b>85 · B+</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fb-features" id="modullar">
          <div className="fb-wrap">
            <div className="fb-feature">
              <div className="fb-copy" data-fb-reveal>
                <div className="fb-k">{dictionary.fbGpaKicker}</div>
                <h2>
                  {dictionary.fbGpaTitleA}
                  <br />
                  <span className="fb-soft">{dictionary.fbGpaTitleB}</span>
                </h2>
                <p>{dictionary.fbGpaDesc}</p>
                <div className="fb-list">
                  <div className="fb-li">
                    <i />
                    {dictionary.fbGpaBullet1}
                  </div>
                  <div className="fb-li">
                    <i />
                    {dictionary.fbGpaBullet2}
                  </div>
                </div>
                <Link className="fb-more" href="/gpa">
                  {dictionary.fbGpaMore} <ArrowIcon />
                </Link>
              </div>
              <div className="fb-panel darkish" data-fb-reveal data-fb-delay="80">
                <div className="fb-big-gpa">
                  <div className="fb-n" data-fb-count="3.82" data-fb-decimals="2">
                    3.82
                  </div>
                  <div className="fb-meta">
                    <b>{dictionary.fbGpaOverall}</b>
                    <span>{dictionary.fbGpaOutOf}</span>
                    <span className="fb-up">{dictionary.fbGpaGrowth}</span>
                  </div>
                </div>
                <div className="fb-gpa-rows">
                  <div className="fb-gr">
                    <span>Differensial tenglamalar</span>
                    <div className="fb-bar">
                      <i style={{ width: "96%" }} />
                    </div>
                    <b>92</b>
                  </div>
                  <div className="fb-gr">
                    <span>Programmalash asoslari</span>
                    <div className="fb-bar">
                      <i style={{ width: "88%" }} />
                    </div>
                    <b>88</b>
                  </div>
                  <div className="fb-gr">
                    <span>Fizika</span>
                    <div className="fb-bar">
                      <i style={{ width: "85%" }} />
                    </div>
                    <b>85</b>
                  </div>
                  <div className="fb-gr">
                    <span>{dictionary.fbCourseEnglish}</span>
                    <div className="fb-bar">
                      <i style={{ width: "94%" }} />
                    </div>
                    <b>94</b>
                  </div>
                </div>
                <div className="fb-float-stat">
                  <span>{dictionary.fbWeeklyGrowth}</span>
                  <b>+0.08</b>
                  <svg className="fb-spark" viewBox="0 0 58 16" aria-hidden="true">
                    <path d="M1 13 9 11 17 12 25 7 33 8 41 4 57 5" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="fb-feature">
              <div className="fb-panel fb-sched-panel" data-fb-reveal>
                <div className="fb-sp-head">
                  <b>{dictionary.fbSchedPanelTitle}</b>
                  <span>{todayLabel}</span>
                </div>
                <div className="fb-sp-row">
                  <time>
                    08:30<span>09:50</span>
                  </time>
                  <div className="fb-s">
                    <b>Differensial tenglamalar</b>
                    <span>A-204 · N. Yusupova</span>
                  </div>
                  <span className="fb-tag">{dictionary.fbStatusDone}</span>
                </div>
                <div className="fb-sp-row now">
                  <time>
                    10:00<span>11:20</span>
                  </time>
                  <div className="fb-s">
                    <b>Programmalash asoslari</b>
                    <span>B-311 · D. Rahimov</span>
                  </div>
                  <span className="fb-tag">{dictionary.fbStatusNow}</span>
                </div>
                <div className="fb-sp-row">
                  <time>
                    11:30<span>12:50</span>
                  </time>
                  <div className="fb-s">
                    <b>Fizika (amaliy)</b>
                    <span>Lab-2 · S. Ismoilova</span>
                  </div>
                  <span className="fb-tag">{dictionary.fbStatusNext}</span>
                </div>
                <div className="fb-sp-row">
                  <time>
                    14:00<span>15:20</span>
                  </time>
                  <div className="fb-s">
                    <b>{dictionary.fbCourseEnglish}</b>
                    <span>C-105 · M. Tursunova</span>
                  </div>
                  <span className="fb-tag">{dictionary.fbStatusNext}</span>
                </div>
                <div className="fb-notif">
                  <div className="fb-n-top">
                    <i>!</i> {dictionary.fbNotifReminder}
                  </div>
                  <b>{dictionary.fbNotifTitle}</b>
                  <span>{dictionary.fbNotifDue}</span>
                  <div className="fb-n-foot">
                    <span>Lab-2 · S. Ismoilova</span>
                    <em>{dictionary.fbNotifOpen}</em>
                  </div>
                </div>
              </div>
              <div className="fb-copy" data-fb-reveal data-fb-delay="80">
                <div className="fb-k">{dictionary.fbSchedKicker}</div>
                <h2>
                  {dictionary.fbSchedTitleA}
                  <br />
                  <span className="fb-soft">{dictionary.fbSchedTitleB}</span>
                </h2>
                <p>{dictionary.fbSchedDesc}</p>
                <div className="fb-list">
                  <div className="fb-li">
                    <i />
                    {dictionary.fbSchedBullet1}
                  </div>
                  <div className="fb-li">
                    <i />
                    {dictionary.fbSchedBullet2}
                  </div>
                </div>
                <Link className="fb-more" href="/schedule">
                  {dictionary.fbSchedMore} <ArrowIcon />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="fb-day" id="kabinet">
          <div className="fb-wrap fb-in">
            <div className="fb-sec-head" data-fb-reveal>
              <div className="fb-sec-kicker">{dictionary.fbDayKicker}</div>
              <h2 className="fb-sec-title">
                {dictionary.fbDayTitleA}
                <br />
                <span className="fb-soft">{dictionary.fbDayTitleB}</span>
              </h2>
              <p className="fb-sec-sub">{dictionary.fbDaySubtitle}</p>
            </div>
            <div className="fb-day-grid" data-fb-daygrid>
              <div className="fb-dcard done" data-fb-reveal>
                <span className="fb-dot" />
                <time>08:30 — 09:50</time>
                <h4>Differensial tenglamalar</h4>
                <div className="fb-m">
                  <b>A-204</b> · N. Yusupova
                </div>
                <span className="fb-st">{dictionary.fbStatusDone}</span>
              </div>
              <div className="fb-dcard live" data-fb-reveal data-fb-delay="90">
                <span className="fb-dot" />
                <time>10:00 — 11:20</time>
                <h4>Programmalash asoslari</h4>
                <div className="fb-m">
                  <b>B-311</b> · D. Rahimov
                </div>
                <span className="fb-st">{dictionary.fbStatusNow}</span>
              </div>
              <div className="fb-dcard next" data-fb-reveal data-fb-delay="180">
                <span className="fb-dot" />
                <time>11:30 — 12:50</time>
                <h4>Fizika (amaliy)</h4>
                <div className="fb-m">
                  <b>Lab-2</b> · S. Ismoilova
                </div>
                <span className="fb-st">{dictionary.fbStatusNext}</span>
              </div>
              <div className="fb-dcard next" data-fb-reveal data-fb-delay="270">
                <span className="fb-dot" />
                <time>14:00 — 15:20</time>
                <h4>{dictionary.fbCourseEnglish}</h4>
                <div className="fb-m">
                  <b>C-105</b> · M. Tursunova
                </div>
                <span className="fb-st">{dictionary.fbStatusNext}</span>
              </div>
            </div>
            <div className="fb-day-foot" data-fb-reveal>
              <span>{dictionary.fbDayFooterLeft}</span>
              <b>{dictionary.fbDayFooterRight}</b>
            </div>
          </div>
        </section>

        <section className="fb-quote">
          <div className="fb-wrap">
            <div className="fb-mark" aria-hidden="true">
              “
            </div>
            <blockquote data-fb-reveal>
              {dictionary.fbQuoteA} <span>{dictionary.fbQuoteB}</span>
            </blockquote>
            <div className="fb-who" data-fb-reveal data-fb-delay="120">
              <div className="fb-ava">AK</div>
              <div style={{ textAlign: "left" }}>
                <b>{dictionary.fbQuoteWho}</b>
                <br />
                <span>{dictionary.fbQuoteRole}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="fb-app" id="ilova">
          <div className="fb-wrap fb-in">
            <div className="fb-copy" data-fb-reveal>
              <div className="fb-sec-kicker">{dictionary.fbNavApp}</div>
              <h2>
                {dictionary.fbAppTitleA}
                <br />
                <span>{dictionary.fbAppTitleB}</span>
              </h2>
              <p>
                Jadval, baholar va eslatmalar cho&apos;ntagingizda. Ilovani hoziroq bosh ekranga
                qo&apos;shing — bir bosishda ochiladi.
              </p>
              <div className="fb-badges">
                <div className="fb-badge">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M16.6 12.9c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.7-1.4 0-2.7.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.8.7 1.2 0 1.9-1 2.6-2.1.8-1.2 1.2-2.4 1.2-2.4s-2.7-1-2.7-3.6Z" />
                    <path d="M14.6 6.5c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2Z" />
                  </svg>
                  <div>
                    <small>{dictionary.fbBadgeDownload}</small>
                    <b>App Store</b>
                  </div>
                </div>
                <div className="fb-badge">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 3.5v17c0 .5.6.8 1 .5l9-8.5-9-8.5c-.4-.3-1 0-1 .5Z" />
                    <path d="m14 12 3.5-3.3 2.5 1.4c.7.4.7 1.4 0 1.8l-2.5 1.4L14 12Z" />
                    <path d="m14 12-9 8.5c-.4.3-1 0-1-.5" />
                  </svg>
                  <div>
                    <small>Google Play</small>
                    <b>{dictionary.fbBadgeGet}</b>
                  </div>
                </div>
                <div className="fb-badge pwa">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="4" y="3" width="16" height="18" rx="3" />
                    <path d="M9 18h6M12 7v7M9 11l3 3 3-3" />
                  </svg>
                  <div>
                    <small>{dictionary.fbBadgeNow}</small>
                    <b>{dictionary.fbBadgePwa}</b>
                  </div>
                </div>
              </div>
              <div className="fb-app-note">{dictionary.fbAppNote}</div>
            </div>

            <div className="fb-phones" aria-hidden="true" data-fb-reveal data-fb-delay="120">
              <div className="fb-phone p1">
                <div className="fb-ph-status">
                  <span>9:41</span>
                  <span className="fb-batt">
                    <span>5G</span>
                    <i />
                  </span>
                </div>
                <div className="fb-ph-screen">
                  <div className="fb-ph-head">
                    <div className="fb-hi">
                      {dictionary.fbdGreetingDay} Aziza.
                      <span>{todayLabel}</span>
                    </div>
                    <div className="fb-ph-ava">AK</div>
                  </div>
                  <div className="fb-ph-gpa">
                    <div className="fb-l">{dictionary.fbGpaOverall}</div>
                    <div className="fb-v">
                      <b data-fb-count="3.82" data-fb-decimals="2">
                        3.82
                      </b>
                      <span>/ 4.00</span>
                    </div>
                    <div className="fb-t">+0.34</div>
                  </div>
                  <div className="fb-ph-sec">
                    <b>{dictionary.fbdCardTodaySchedule}</b>
                    <span>Barchasi ›</span>
                  </div>
                  <div className="fb-ph-row">
                    <span className="fb-tm">08:30</span>
                    <span className="fb-bar o" />
                    <div className="fb-s">
                      <b>Differensial tenglamalar</b>
                      <span>A-204 · N. Yusupova</span>
                    </div>
                  </div>
                  <div className="fb-ph-row">
                    <span className="fb-tm">10:00</span>
                    <span className="fb-bar" />
                    <div className="fb-s">
                      <b>Programmalash asoslari</b>
                      <span>B-311 · D. Rahimov</span>
                    </div>
                  </div>
                  <div className="fb-ph-row">
                    <span className="fb-tm">11:30</span>
                    <span className="fb-bar o" />
                    <div className="fb-s">
                      <b>Fizika (amaliy)</b>
                      <span>Lab-2 · S. Ismoilova</span>
                    </div>
                  </div>
                  <div className="fb-ph-sec">
                    <b>{dictionary.fbdActivityTitle}</b>
                    <span>6 / 7 kun ›</span>
                  </div>
                  <div className="fb-ph-bars">
                    <span style={{ height: "34%" }} />
                    <span className="on" style={{ height: "58%" }} />
                    <span className="on" style={{ height: "44%" }} />
                    <span className="on" style={{ height: "72%" }} />
                    <span className="today" style={{ height: "90%" }} />
                    <span style={{ height: "24%" }} />
                    <span style={{ height: "16%" }} />
                  </div>
                  <PhoneNav active={0} />
                </div>
              </div>

              <div className="fb-phone p2">
                <div className="fb-ph-status">
                  <span>9:41</span>
                  <span className="fb-batt">
                    <span>5G</span>
                    <i />
                  </span>
                </div>
                <div className="fb-ph-screen">
                  <div className="fb-ph-head">
                    <div className="fb-hi">
                      {dictionary.fbdKpiAssignments}
                      <span>
                        {dictionary.fbdDeadlineCount.replace("{count}", "3")} · 1{" "}
                        {dictionary.fbdDeadlineToday.toLowerCase()}
                      </span>
                    </div>
                    <div className="fb-ph-ava">AK</div>
                  </div>
                  <div className="fb-ph-sec" style={{ marginTop: 16 }}>
                    <b>{dictionary.fbdDeadlinesTitle}</b>
                    <span>Barchasi ›</span>
                  </div>
                  <div className="fb-ph-row">
                    <span className="fb-tm">
                      22
                      <br />
                      Okt
                    </span>
                    <span className="fb-bar" style={{ background: "#1D1D1F" }} />
                    <div className="fb-s">
                      <b>Fizika laboratoriya hisoboti</b>
                      <span>{dictionary.fbdDeadlineToday} · 18:00</span>
                    </div>
                  </div>
                  <div className="fb-ph-row">
                    <span className="fb-tm">
                      24
                      <br />
                      Okt
                    </span>
                    <span className="fb-bar o" />
                    <div className="fb-s">
                      <b>{dictionary.fbSampleTask2}</b>
                      <span>2 kun · 20 ball</span>
                    </div>
                  </div>
                  <div className="fb-ph-row">
                    <span className="fb-tm">
                      28
                      <br />
                      Okt
                    </span>
                    <span className="fb-bar" />
                    <div className="fb-s">
                      <b>{dictionary.fbSampleTask3}</b>
                      <span>6 kun · jamoa</span>
                    </div>
                  </div>
                  <div className="fb-ph-sec" style={{ marginTop: 14 }}>
                    <b>{dictionary.fbdActivityTitle}</b>
                    <span>12 kun ›</span>
                  </div>
                  <div className="fb-ph-bars">
                    <span style={{ height: "32%" }} />
                    <span className="on" style={{ height: "55%" }} />
                    <span className="on" style={{ height: "42%" }} />
                    <span className="on" style={{ height: "70%" }} />
                    <span className="today" style={{ height: "88%" }} />
                    <span style={{ height: "22%" }} />
                    <span style={{ height: "15%" }} />
                  </div>
                  <div className="fb-ph-streak">
                    <div className="fb-ic">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 22c4 0 7-2.7 7-6.5 0-3-1.8-5.3-3.5-7.5C14 6 13 4 13 2c-3 1.5-5 4-5 7 0 1.2.3 2 .3 2S7 10 6 9c-.7 1.4-1 2.8-1 4.3C5 18.6 8 22 12 22Z" />
                      </svg>
                    </div>
                    <div>
                      <b>12 kun ketma-ket</b>
                      <span>{dictionary.fbStreakGoal}</span>
                    </div>
                    <em>+2</em>
                  </div>
                  <PhoneNav active={2} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fb-cta-sec">
          <div className="fb-wrap fb-in">
            <div className="fb-k" data-fb-reveal>
              {dictionary.fbCtaKicker}
            </div>
            <h2 data-fb-reveal data-fb-delay="80">
              {dictionary.fbCtaTitleA}
              <br />
              <span>{dictionary.fbCtaTitleB}</span>
            </h2>
            <p data-fb-reveal data-fb-delay="140">
              {dictionary.fbCtaDesc}
            </p>
            <div className="fb-btns" data-fb-reveal data-fb-delay="200">
              <Link className="fb-btn-primary" href="/login">
                {dictionary.fbLogin} <ArrowIcon />
              </Link>
              <Link className="fb-link-play" href="/register">
                {dictionary.fbRegister} <ArrowIcon />
              </Link>
            </div>
            <div className="fb-fine" data-fb-reveal data-fb-delay="260">
              {dictionary.fbCtaFine}
            </div>
          </div>
        </section>

        <footer className="fb-footer" id="universitet">
          <div className="fb-wrap">
            <div className="fb-f-top">
              <div data-fb-reveal>
                <div className="fb-f-brand">
                  <img src="/logo.svg" alt="FBSU" width={38} height={38} />
                  <div>
                    <div className="fb-n">FBSU</div>
                    <div className="fb-t">
                      Turin Polytechnic
                      <br />
                      University in Tashkent
                    </div>
                  </div>
                </div>
                <p>{dictionary.fbFootBrandText}</p>
              </div>
              <div className="fb-f-col" data-fb-reveal data-fb-delay="70">
                <b>{dictionary.fbFootPlatform}</b>
                <a href="#modullar">{dictionary.fbFootFeatures}</a>
                <a href="#platforma">{dictionary.fbFootHow}</a>
                <Link href="/dashboard">{dictionary.fbFootCabinet}</Link>
                <a href="#ilova">{dictionary.fbFootMobile}</a>
              </div>
              <div className="fb-f-col" data-fb-reveal data-fb-delay="140">
                <b>{dictionary.fbFootModules}</b>
                <Link href="/courses">{dictionary.fbFootCourses}</Link>
                <Link href="/tasks">{dictionary.fbFootAssignments}</Link>
                <Link href="/gpa">{dictionary.fbFootGpa}</Link>
                <Link href="/bookings">{dictionary.fbFootBooking}</Link>
              </div>
              <div className="fb-f-col" data-fb-reveal data-fb-delay="210">
                <b>{dictionary.fbFooterUniversity}</b>
                <a href="#universitet">{dictionary.fbFootAbout}</a>
                <a href="#universitet">{dictionary.fbFootNews}</a>
                <a href="#universitet">{dictionary.fbFootCareer}</a>
                <a href="mailto:info@ttpu.uz">{dictionary.fbFootContact}</a>
              </div>
              <div className="fb-f-col" data-fb-reveal data-fb-delay="280">
                <b>{dictionary.fbFootContact}</b>
                <a href="mailto:info@ttpu.uz">info@ttpu.uz</a>
                <a href="tel:+998712899900">+998 71 289 99 00</a>
                <a href="#universitet">{dictionary.fbFootAddress}</a>
                <a href="#universitet">{dictionary.fbFootHours}</a>
              </div>
            </div>
            <div className="fb-f-bot" data-fb-reveal>
              <span>{dictionary.fbFootRights}</span>
              <div className="fb-links">
                <Link href="/help">{dictionary.fbFooterPrivacy}</Link>
                <Link href="/help">{dictionary.fbFooterTerms}</Link>
                <Link href="/help">{dictionary.fbFootHelp}</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
