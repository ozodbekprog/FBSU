import { describe, expect, it } from "vitest";
import { classifyUserAgent } from "./ua";

describe("classifyUserAgent", () => {
  it("Googlebotni bot deb aniqlaydi", () => {
    const ua =
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
    const result = classifyUserAgent(ua);
    expect(result.isBot).toBe(true);
    expect(result.botName).toBe("Googlebot");
    expect(result.deviceType).toBe("bot");
  });

  it("Telegram ichki brauzerini odam deb hisoblaydi", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; SM-A536B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36 Telegram-Android/11.9.1";
    const result = classifyUserAgent(ua);
    expect(result.isBot).toBe(false);
    expect(result.browser).toBe("Telegram");
    expect(result.deviceType).toBe("mobile");
  });

  it("Telegram havola ko'rish botini bot deb ajratadi", () => {
    const result = classifyUserAgent("TelegramBot (like TwitterBot)");
    expect(result.isBot).toBe(true);
    expect(result.botName).toBe("TelegramBot");
  });

  it("CUBOT telefonini bot deb hisoblamaydi", () => {
    const result = classifyUserAgent(
      "Mozilla/5.0 (Linux; Android 13; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
    );
    expect(result.isBot).toBe(false);
    expect(result.deviceType).toBe("mobile");
  });

  it("Desktop Chrome brauzerini aniqlaydi", () => {
    const result = classifyUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    );
    expect(result).toMatchObject({
      isBot: false,
      browser: "Chrome",
      platform: "Windows",
      deviceType: "desktop",
    });
  });

  it("iPhone Safari mobil ekanini aniqlaydi", () => {
    const result = classifyUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    );
    expect(result).toMatchObject({
      isBot: false,
      browser: "Safari",
      platform: "iPhone",
      deviceType: "mobile",
    });
  });

  it("iPad planshet ekanini aniqlaydi", () => {
    const result = classifyUserAgent(
      "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    );
    expect(result.deviceType).toBe("tablet");
  });

  it("curl va headless brauzerlarini bot deb aniqlaydi", () => {
    expect(classifyUserAgent("curl/8.7.1").isBot).toBe(true);
    expect(
      classifyUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
      ).botName,
    ).toBe("Headless Chrome");
  });

  it("bo'sh UA ni bot deb hisoblamaydi", () => {
    const result = classifyUserAgent("");
    expect(result.isBot).toBe(false);
    expect(result.browser).toBeNull();
  });
});
