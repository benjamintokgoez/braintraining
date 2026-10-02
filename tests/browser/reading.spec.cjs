"use strict";

const { test, expect } = require("@playwright/test");
const { createStaticServer } = require("../../scripts/serve.cjs");
const { open, enableClock, noOverflow, capture, contrastFailures } = require("./helpers.cjs");
const introduction = "This is an encyclopedia introduction about a scientific discovery and its development. " +
  "It describes the ideas and people involved, including the historical context and practical applications in everyday life. ";

async function wikipedia(page, { fail = false, hold = false, malicious = false } = {}) {
  const calls = [], held = [];
  const reply = route => route.fulfill({
    status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(fail ? { error: { code: "maxlag", info: "Please wait" } } : {
      query: { pages: [{ pageid: 12345 + calls.length, lastrevid: 98765, ns: 0,
        title: malicious ? 'Discovery <img src=x onerror="window.readingInjected=true">' : "An interesting discovery",
        extract: malicious ? `${introduction}<script>window.readingInjected=true</script> ${introduction}` : introduction.repeat(18) }] }
    })
  });
  await page.route("https://*.wikipedia.org/w/api.php?**", async route => {
    const request = route.request();
    calls.push({ url: request.url(), headers: await request.allHeaders(), body: request.postData(), method: request.method() });
    if (hold) held.push(() => reply(route));
    else await reply(route);
  });
  return { calls, held, success: () => { fail = false; hold = false; } };
}
async function interests(page, selected) {
  for (const input of await page.locator('[name="dailyReadingInterests"]').all()) {
    await input.setChecked(selected.includes(await input.getAttribute("value")));
  }
}
async function enable(page, selected = ["science"]) {
  await page.locator("#reading-settings").click();
  await page.locator('[name="dailyReadingEnabled"]').check();
  await interests(page, selected);
  await page.locator("#save-preferences").click();
}
async function ready(page) {
  await expect(page.locator("#daily-reading-content")).toHaveAttribute("data-reading-status", "ready");
  await expect(page.locator("#reading-source")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  page.appErrors = [];
  page.on("pageerror", error => page.appErrors.push(error.message));
});
test.afterEach(async ({ page }) => { expect(page.appErrors).toEqual([]); });

test.describe("Wikipedia API", () => {
  // WebKit cannot route page requests forwarded through a service worker.
  test.use({ serviceWorkers: "block" });

  test("Wikipedia is opt-in, interests validate, drafts cancel and a bounded attributed daily read survives reload", async ({ page }, testInfo) => {
    const wiki = await wikipedia(page);
    await open(page);
    await expect(page.locator("#daily-reading")).toContainText("no AI");
    expect(wiki.calls).toHaveLength(0);
    await page.locator("#reading-settings").click();
    await expect(page.locator('[name="dailyReadingEnabled"]')).not.toBeChecked();
    await expect(page.locator("#reading-privacy")).toContainText("IP address");
    await page.locator('[name="dailyReadingEnabled"]').check();
    await interests(page, ["politics", "celebrities"]);
    await page.locator("#cancel-preferences").click();
    await expect(page.locator("#reading-settings")).toBeFocused();
    expect(wiki.calls).toHaveLength(0);
    expect(await page.evaluate(() => window.Cortex.Storage.getSettings().dailyReadingEnabled)).toBe(false);
    await page.locator("#reading-settings").click();
    await page.locator('[name="dailyReadingEnabled"]').check();
    await interests(page, []);
    await page.locator("#save-preferences").click();
    await expect(page.locator("#preferences-error")).toContainText("at least one interest");
    expect(wiki.calls).toHaveLength(0);
    await interests(page, ["science"]);
    await page.locator("#save-preferences").click();
    await ready(page);
    await expect(page.locator("#reading-settings")).toBeFocused();
    await expect(page.locator("#daily-reading")).toContainText("shortened without AI");
    await expect(page.locator("#reading-source")).toHaveAttribute("href", /en\.wikipedia\.org\/w\/index\.php\?curid=\d+&oldid=98765$/);
    await expect(page.locator("#reading-source")).toHaveAttribute("rel", "noopener noreferrer");
    await expect(page.locator('a[href="https://creativecommons.org/licenses/by-sa/4.0/"]')).toBeVisible();
    await expect(page.locator("#daily-reading")).toContainText("Wikipedia contributors");
    const bounded = await page.evaluate(() => {
      const C = window.Cortex, record = C.Storage.getDailyReading();
      return { words: C.wordCount(record.text), characters: record.text.length,
        seconds: C.Reading.seconds(record), record, sessions: C.Storage.getSessions().length };
    });
    expect(bounded.words).toBeLessThanOrEqual(180);
    expect(bounded.characters).toBeLessThanOrEqual(1400);
    expect(bounded.seconds).toBeLessThanOrEqual(120);
    expect(bounded.sessions).toBe(0);
    expect(wiki.calls).toHaveLength(1);
    expect(wiki.calls[0].method).toBe("GET");
    expect(wiki.calls[0].body).toBeNull();
    expect(wiki.calls[0].headers.cookie).toBeUndefined();
    expect(wiki.calls[0].headers.referer).toBeUndefined();
    expect(new URL(wiki.calls[0].url).searchParams.get("gsrsearch")).toContain("Biological processes");
    await capture(page, testInfo, "daily-wikipedia-read");
    await page.reload();
    await ready(page);
    expect(await page.evaluate(() => window.Cortex.Storage.getDailyReading())).toEqual(bounded.record);
    expect(wiki.calls).toHaveLength(1);
    await noOverflow(page);
  });

  test("API failures, slow requests, retries and disabling stay explicit and never block training", async ({ page }) => {
    const wiki = await wikipedia(page, { fail: true });
    await enableClock(page);
    await enable(page);
    await expect(page.locator("#daily-reading-content")).toHaveAttribute("data-reading-status", "error");
    await expect(page.locator("#daily-reading-content")).toContainText("Your training still works");
    expect(wiki.calls).toHaveLength(1);
    await page.evaluate(() => window.Cortex.UI.render());
    await expect(page.locator("#daily-reading-content")).toHaveAttribute("data-reading-status", "error");
    expect(wiki.calls).toHaveLength(1);
    wiki.success();
    await page.locator("#reading-retry").click();
    await ready(page);
    expect(wiki.calls).toHaveLength(2);
    await page.locator("#reading-settings").click();
    await page.locator('[name="dailyReadingEnabled"]').uncheck();
    await page.locator("#save-preferences").click();
    await expect(page.locator("#daily-reading-content")).toHaveAttribute("data-reading-status", "disabled");
    await page.reload();
    expect(wiki.calls).toHaveLength(2);
    await page.clock.runFor(600);
    await page.waitForFunction(() => window.Cortex.Timing.refreshHz > 0);
    await open(page, "task/method-loci");
    await page.locator("#start-practice").click();
    await expect.poll(async () => {
      await page.clock.runFor(250);
      return page.evaluate(() => window.Cortex.active?.current?.trial.stage);
    }, { intervals: [50], timeout: 15000 }).toBe("loci-study");
    expect(wiki.calls).toHaveLength(2);
    await page.locator("#abort").click({ force: true });
    await expect(page.locator(".completion-card")).toBeVisible();
  });

  test("in-flight Wikipedia reads are cancelled on navigation and time out with a retry, not a fabricated fact", async ({ page }) => {
    const wiki = await wikipedia(page, { hold: true });
    await enableClock(page);
    await enable(page);
    await expect.poll(() => wiki.calls.length).toBe(1);
    await open(page, "library");
    expect(await page.evaluate(() => window.Cortex.Storage.getDailyReading())).toBeNull();
    await open(page, "home");
    await expect.poll(() => wiki.calls.length).toBe(2);
    await page.clock.runFor(8100);
    await expect(page.locator("#daily-reading-content")).toHaveAttribute("data-reading-status", "error");
    await expect(page.locator("#daily-reading-content")).toContainText("too long");
    await expect(page.locator("#reading-source")).toHaveCount(0);
    wiki.success();
    await page.locator("#reading-retry").click();
    await ready(page);
    expect(wiki.calls).toHaveLength(3);
    expect(await page.evaluate(() => window.Cortex.Storage.getDailyReading().pageId)).toBe(12348);
  });

  test("untrusted extract text stays literal and both languages, themes and narrow layouts remain readable", async ({ page }, testInfo) => {
    const wiki = await wikipedia(page, { malicious: true });
    await open(page);
    await enable(page);
    await ready(page);
    await expect(page.locator("#daily-reading h3")).toContainText("<img");
    await expect(page.locator(".reading-text")).toContainText("<script>");
    expect(await page.evaluate(() => window.readingInjected)).toBeUndefined();
    expect(await page.locator("#daily-reading img, #daily-reading script").count()).toBe(0);
    await page.setViewportSize({ width: 320, height: 568 });
    for (const language of ["en", "de"]) for (const theme of ["light", "dark"]) {
      await page.evaluate(({ language, theme }) => {
        const C = window.Cortex;
        C.Storage.setSettings({ language, theme }); C.UI.syncPreferences(); C.UI.render();
      }, { language, theme });
      await ready(page);
      await expect(page.locator("#daily-reading h2")).toHaveText(language === "en" ? "Daily Wikipedia read" : "Tägliche Wikipedia-Lektüre");
      await noOverflow(page);
      expect(await contrastFailures(page)).toEqual([]);
      await page.locator("#reading-settings").click();
      await noOverflow(page);
      const targets = await page.locator(".interest-grid label").evaluateAll(labels => labels.map(label => {
        const rect = label.getBoundingClientRect(); return { width: rect.width, height: rect.height };
      }));
      expect(targets.every(target => target.width >= 44 && target.height >= 44)).toBe(true);
      await page.locator("#cancel-preferences").click();
    }
    expect(wiki.calls.some(call => new URL(call.url).hostname === "de.wikipedia.org")).toBe(true);
    await capture(page, testInfo, "daily-read-320-dark-german");
  });
});

test("the installed app reopens a saved Wikipedia read offline and dates older cached selections honestly", async ({ page, context, browserName }) => {
  const server = createStaticServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const stop = () => new Promise((resolve, reject) => {
    if (!server.listening) return resolve();
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  });
  const wiki = await wikipedia(page);
  try {
    await open(page, "home", origin);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    });
    await page.evaluate(introduction => {
      const C = window.Cortex;
      const record = C.Reading.fromPage({ pageid: 12345, lastrevid: 98765, ns: 0,
        title: "An interesting discovery", extract: introduction },
      { date: C.today(), language: "en", interest: "science" });
      C.Storage.setDailyReading(record);
      C.Storage.setSettings({ dailyReadingEnabled: true, dailyReadingInterests: ["science"] });
      C.UI.syncPreferences(); C.UI.render();
    }, introduction);
    await ready(page);
    const saved = await page.evaluate(() => window.Cortex.Storage.getDailyReading());
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    });
    if (browserName === "webkit") await stop();
    else await context.setOffline(true);
    const response = await page.reload();
    expect(response.fromServiceWorker()).toBe(true);
    await ready(page);
    expect(await page.evaluate(() => window.Cortex.Storage.getDailyReading())).toEqual(saved);
    expect(wiki.calls).toHaveLength(0);
    await page.evaluate(() => {
      const C = window.Cortex, today = C.today;
      C.today = date => today(date || new Date(performance.timeOrigin + C.now() + 86400000));
      C.UI.render();
    });
    await expect(page.locator("#daily-reading-content")).toHaveAttribute("data-reading-status", "offline");
    await expect(page.locator("#daily-reading-content")).toContainText("Not today's selection");
    await expect(page.locator(".reading-text")).toBeVisible();
    expect(wiki.calls).toHaveLength(0);
    await noOverflow(page);
  } finally { await context.setOffline(false); await stop(); }
});
