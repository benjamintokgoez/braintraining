"use strict";

const { test, expect } = require("@playwright/test");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { createStaticServer } = require("../../scripts/serve.cjs");
const { open } = require("./helpers.cjs");

async function versionedOrigin() {
  const worker = await readFile(path.join(__dirname, "../../sw.js"), "utf8");
  const server = createStaticServer(), [serve] = server.listeners("request");
  let revision = 1;
  server.removeAllListeners("request");
  server.on("request", (request, response) => {
    if (request.url !== "/sw.js") { serve(request, response); return; }
    const source = worker.replace(/^const CACHE = .*;$/m, `const CACHE = CACHE_PREFIX + "browser-test-${revision}";`);
    response.writeHead(200, { "Content-Type": "text/javascript", "Cache-Control": "no-cache" });
    response.end(source);
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    next: () => { revision++; },
    stop: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    })
  };
}

async function controlled(page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve =>
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    window.navigationToken = "original";
  });
}

async function findUpdate(page, origin) {
  origin.next();
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await expect(page.locator("#app-update")).toBeVisible();
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration()).waiting?.state === "installed");
}

test("waiting updates do not interrupt setup, an active round or pending saved work", async ({ page }) => {
  const origin = await versionedOrigin();
  try {
    await open(page, "task/number-series", origin.url);
    await controlled(page);
    await expect(page.locator("#app-update")).toBeHidden();
    await findUpdate(page, origin);
    await page.evaluate(async () => {
      window.Cortex.starting = true;
      await window.Cortex.PWA.update();
      window.Cortex.starting = false;
    });
    expect(await page.evaluate(() => window.navigationToken)).toBe("original");
    await page.locator("#start-practice").click();
    await expect(page.locator("#runner")).toBeVisible();
    await page.evaluate(() => window.Cortex.PWA.update());
    expect(await page.evaluate(() => window.navigationToken)).toBe("original");
    await page.locator("#abort").click({ force: true });
    await expect(page.locator(".completion-card")).toBeVisible();
    await page.evaluate(() => {
      const C = window.Cortex;
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "cortex.v1") throw new DOMException("Storage full", "QuotaExceededError");
        return window.originalSetItem.call(this, key, value);
      };
      C.Storage.createForecast({ claim: "Finish the next morning routine.", probability: .8, resolveBy: C.today(), language: "en" });
    });
    expect(await page.evaluate(() => window.Cortex.Storage.pending)).toBe(true);
    await page.evaluate(() => window.Cortex.PWA.update());
    expect(await page.evaluate(() => window.navigationToken)).toBe("original");
    await page.evaluate(() => {
      Storage.prototype.setItem = window.originalSetItem;
      window.Cortex.Storage.setSettings({});
    });
    const reload = page.waitForEvent("domcontentloaded");
    await page.locator("#app-update").click();
    await reload;
    await expect(page.locator("#app h1")).toBeVisible();
    expect(await page.evaluate(() => window.navigationToken)).toBeUndefined();
    expect(await page.evaluate(() => window.Cortex.Storage.getForecasts().length)).toBe(1);
    await expect(page.locator("#app-update")).toBeHidden();
  } finally { await origin.stop(); }
});

test("another tab can activate an update without losing an unsaved forecast draft", async ({ page, context }) => {
  const origin = await versionedOrigin();
  try {
    await open(page, "task/forecasting", origin.url);
    await controlled(page);
    await page.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "cortex.forecastDraft.v1") throw new DOMException("Draft storage unavailable", "QuotaExceededError");
        return window.originalSetItem.call(this, key, value);
      };
    });
    await page.locator('[name="claim"]').fill("Finish tomorrow's routine before breakfast.");
    expect(await page.evaluate(() => window.Cortex.Forecasting.pendingDraft)).toBe(true);
    await findUpdate(page, origin);
    const other = await context.newPage();
    await open(other, "home", origin.url);
    await expect(other.locator("#app-update")).toBeVisible();
    const otherReload = other.waitForEvent("domcontentloaded");
    await other.locator("#app-update").click();
    await otherReload;
    await expect(other.locator("#app h1")).toBeVisible();
    await page.waitForFunction(async () => !(await navigator.serviceWorker.getRegistration()).waiting);
    expect(await page.evaluate(() => window.navigationToken)).toBe("original");
    await expect(page.locator('[name="claim"]')).toHaveValue("Finish tomorrow's routine before breakfast.");
    await page.evaluate(() => window.Cortex.PWA.update());
    expect(await page.evaluate(() => window.navigationToken)).toBe("original");
    await expect(page.locator('[data-notice="pwa.wait"]')).toBeVisible();
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    await page.locator('[name="probability"]').fill("80");
    expect(await page.evaluate(() => window.Cortex.Forecasting.pendingDraft)).toBe(false);
    const reload = page.waitForEvent("domcontentloaded");
    await page.locator("#app-update").click();
    await reload;
    await expect(page.locator('[name="claim"]')).toHaveValue("Finish tomorrow's routine before breakfast.");
    expect(await page.evaluate(() => window.navigationToken)).toBeUndefined();
    await other.close();
  } finally { await origin.stop(); }
});
