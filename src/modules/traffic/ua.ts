export type UaClassification = {
  browser: string | null;
  platform: string | null;
  deviceType: "desktop" | "mobile" | "tablet" | "bot";
  isBot: boolean;
  botName: string | null;
};

const TELEGRAM_IN_APP =
  /Telegram-Android|Telegram-iOS|Telegram-Web|Telegram Desktop|Telegram\/\d/i;

const BOTS: Array<[RegExp, string]> = [
  [/googlebot/i, "Googlebot"],
  [/google-inspectiontool/i, "Google Inspection"],
  [/storebot-google/i, "Google StoreBot"],
  [/bingbot/i, "Bingbot"],
  [/bingpreview/i, "Bing Preview"],
  [/yandexbot|yandex\.com\/bots/i, "YandexBot"],
  [/baiduspider/i, "Baiduspider"],
  [/duckduckbot/i, "DuckDuckBot"],
  [/applebot/i, "Applebot"],
  [/petalbot/i, "PetalBot"],
  [/bytespider/i, "Bytespider"],
  [/gptbot/i, "GPTBot"],
  [/chatgpt-user/i, "ChatGPT-User"],
  [/oai-searchbot/i, "OAI-SearchBot"],
  [/claude-web|claudebot/i, "ClaudeBot"],
  [/anthropic-ai/i, "Anthropic"],
  [/ccbot/i, "CCBot"],
  [/perplexitybot/i, "PerplexityBot"],
  [/amazonbot/i, "Amazonbot"],
  [/facebookexternalhit/i, "Facebook"],
  [/meta-externalagent/i, "Meta"],
  [/telegrambot/i, "TelegramBot"],
  [/twitterbot/i, "Twitterbot"],
  [/linkedinbot/i, "LinkedInBot"],
  [/whatsapp/i, "WhatsApp"],
  [/slackbot/i, "Slackbot"],
  [/discordbot/i, "Discordbot"],
  [/semrushbot/i, "SemrushBot"],
  [/ahrefsbot/i, "AhrefsBot"],
  [/mj12bot/i, "Majestic"],
  [/dotbot/i, "DotBot"],
  [/blexbot/i, "BlexBot"],
  [/dataforseo/i, "DataForSEO"],
  [/seznambot/i, "SeznamBot"],
  [/ia_archiver/i, "Archive.org"],
  [/uptimerobot|pingdom|statuscake|site24x7|uptime-kuma/i, "Uptime monitor"],
  [/headlesschrome/i, "Headless Chrome"],
  [/phantomjs/i, "PhantomJS"],
  [/lighthouse/i, "Lighthouse"],
  [/python-requests|python-urllib|aiohttp/i, "Python client"],
  [/curl\//i, "curl"],
  [/wget/i, "wget"],
  [/go-http-client/i, "Go client"],
  [/node-fetch|undici|axios/i, "Node client"],
  [/postmanruntime/i, "Postman"],
  [/\bbot\b|crawler|spider|scraper/i, "Bot"],
];

function detectPlatform(ua: string): string | null {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) {
    const model = /Android[^;)]*;\s*([^;)]+?)(?:\s+Build|\)|;)/i.exec(ua)?.[1]?.trim();
    return model && model.length <= 40 ? model : "Android";
  }
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return null;
}

function detectBrowser(ua: string): string | null {
  if (/Telegram/i.test(ua)) return "Telegram";
  else if (/Edg\//i.test(ua)) return "Edge";
  else if (/OPR\/|Opera/i.test(ua)) return "Opera";
  else if (/YaBrowser/i.test(ua)) return "Yandex";
  else if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  else if (/UCBrowser/i.test(ua)) return "UC Browser";
  else if (/Firefox\/|FxiOS/i.test(ua)) return "Firefox";
  else if (/Chrome\/|CriOS/i.test(ua)) return "Chrome";
  else if (/Safari\//i.test(ua)) return "Safari";
  return null;
}

function detectDeviceType(ua: string): "desktop" | "mobile" | "tablet" {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

export function classifyUserAgent(value: string | null | undefined): UaClassification {
  const ua = (value ?? "").trim();
  if (!ua) {
    return { browser: null, platform: null, deviceType: "desktop", isBot: false, botName: null };
  }

  const telegramHuman = TELEGRAM_IN_APP.test(ua) && !/TelegramBot/i.test(ua);
  if (!telegramHuman) {
    for (const [pattern, name] of BOTS) {
      if (pattern.test(ua)) {
        return { browser: null, platform: null, deviceType: "bot", isBot: true, botName: name };
      }
    }
  }

  return {
    browser: detectBrowser(ua),
    platform: detectPlatform(ua),
    deviceType: detectDeviceType(ua),
    isBot: false,
    botName: null,
  };
}
