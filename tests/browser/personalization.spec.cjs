"use strict";

const { test, expect } = require("@playwright/test");
const { readFile } = require("node:fs/promises");
const { open, noOverflow, capture, enableClock } = require("./helpers.cjs");

async function mockNotifications(page, options = {}) {
  await page.addInitScript(options => {
    window.reminderMock = { permission: options.permission || "default", requests: 0, shown: [], activation: null };
    Object.defineProperty(window, "Notification", { configurable: true, value: {
      get permission() { return window.reminderMock.permission; },
      requestPermission() {
        window.reminderMock.requests++;
        window.reminderMock.activation = navigator.userActivation?.isActive ?? null;
        if (options.deferred) return new Promise(resolve => { window.allowNotifications = permission => {
          window.reminderMock.permission = permission; resolve(permission);
        }; });
        const permission = options.result || "granted";
        window.reminderMock.permission = permission;
        return Promise.resolve(permission);
      }
    } });
    Object.defineProperty(ServiceWorkerRegistration.prototype, "showNotification", {
      configurable: true, value: async function (title, data) {
        window.reminderMock.shown.push({ title, data });
      }
    });
  }, options);
}

async function days(page, selected) {
  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    await page.locator(`[name="routineDays"][value="${day}"]`).setChecked(selected.includes(day));
  }
}

test("preferred days, local time and budget persist, with English/German and flexible practice labels", async ({ page }) => {
  await open(page);
  await page.locator("#open-settings").click();
  await expect(page.locator('[name="routineTime"]')).toHaveValue("08:00");
  await expect(page.locator('[name="routineDays"]:checked')).toHaveCount(7);
  await page.locator('[name="routineTime"]').fill("18:30");
  await page.locator('[name="routineMinutes"]').selectOption("15");
  await days(page, [2, 4]);
  await page.locator("#save-preferences").click();
  await expect(page.locator(".routine-card h2")).toHaveText("Evening practice");
  await page.reload();
  expect(await page.evaluate(() => {
    const value = window.Cortex.Storage.getSettings();
    return { time: value.routineTime, days: value.routineDays, minutes: value.routineMinutes, reminders: value.routineReminders };
  })).toEqual({ time: "18:30", days: [2, 4], minutes: 15, reminders: false });
  await page.locator("#open-settings").click();
  await page.locator("#language").selectOption("de");
  await page.locator("#save-preferences").click();
  await expect(page.locator(".routine-card h2")).toHaveText("Abendtraining");
  await page.locator("#open-settings").click();
  await expect(page.locator(".weekday-grid")).toContainText("Donnerstag");
  await page.locator('[name="routineTime"]').fill("");
  await days(page, []);
  await page.locator("#practice-reminders summary").click();
  await expect(page.locator("#export-calendar")).toBeDisabled();
  await expect(page.locator('[name="routineReminders"]')).toBeDisabled();
  await expect(page.locator("#calendar-schedule-error")).toBeVisible();
  await page.locator("#save-preferences").click();
  await expect(page.locator(".routine-card h2")).toHaveText("Dein Training");
  await expect(page.locator(".routine-schedule")).toContainText("Keine Tage geplant");
  await expect(page.locator("#start-routine")).toContainText("Training beginnen");
});

test("off-day practice is optional, not blocked, and changed budgets leave a started plan intact", async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const C = window.Cortex, day = new Date(C.iso()).getDay();
    C.Storage.setSettings({ routineTime: "15:00", routineDays: [(day + 1) % 7] });
    C.UI.syncPreferences(); C.UI.render();
  });
  await expect(page.locator(".routine-card h2")).toHaveText("Afternoon practice");
  await expect(page.locator(".routine-schedule")).toContainText("No practice is planned for today");
  await expect(page.locator(".routine-schedule")).toContainText("Next preferred start");
  await expect(page.locator("#start-routine")).toContainText("Practice anyway");
  await page.locator("#start-routine").click();
  await expect(page.locator(".routine-banner")).toContainText("Afternoon practice");
  const before = await page.evaluate(() => window.Cortex.Storage.getRoutine());
  await page.locator("#open-settings").click();
  await page.locator('[name="routineMinutes"]').selectOption("20");
  await page.locator('[name="routineTime"]').fill("18:30");
  await page.locator("#save-preferences").click();
  expect(await page.evaluate(() => window.Cortex.Storage.getRoutine())).toEqual(before);
  await expect(page.locator(".routine-banner")).toContainText("Evening practice");
  await open(page);
  await expect(page.locator(".routine-card .tag")).toContainText("10 min");
  await expect(page.locator("#start-routine")).toContainText("Continue your practice");
});

test("calendar export uses unsaved chosen days/time and leaves saved settings and notification permission unchanged", async ({ page }) => {
  await mockNotifications(page);
  await open(page);
  await page.locator("#open-settings").click();
  await page.locator('[name="routineTime"]').fill("18:30");
  await page.locator('[name="routineMinutes"]').selectOption("20");
  await days(page, [1, 3, 5]);
  await page.locator("#practice-reminders summary").click();
  const waiting = page.waitForEvent("download");
  await page.locator("#export-calendar").click();
  const download = await waiting, text = (await readFile(await download.path(), "utf8")).replace(/\r\n /g, "");
  expect(download.suggestedFilename()).toBe("bbg-practice-reminders.ics");
  expect(text).toMatch(/DTSTART:\d{8}T183000\r\n/);
  expect(text).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;WKST=MO\r\n");
  expect(text).toContain("DURATION:PT20M\r\n");
  expect(text).toContain("BEGIN:VALARM\r\nTRIGGER:PT0M");
  expect(await page.evaluate(() => window.reminderMock.requests)).toBe(0);
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().routineTime)).toBe("08:00");
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().routineMinutes)).toBe(10);
  await page.locator("#close-preferences").click();
  await expect(page.locator(".routine-card h2")).toHaveText("Morning practice");
});

test("notification permission requires an explicit gesture, blocks pending saves and does not enable reminders on cancel", async ({ page }) => {
  await mockNotifications(page, { deferred: true });
  await open(page);
  expect(await page.evaluate(() => window.reminderMock.requests)).toBe(0);
  await page.locator("#open-settings").click();
  await page.locator('[name="routineTime"]').fill("23:59");
  await page.locator("#practice-reminders summary").click();
  await page.locator('[name="routineReminders"]').check();
  await expect(page.locator("#save-preferences")).toBeDisabled();
  expect(await page.evaluate(() => window.reminderMock.requests)).toBe(1);
  const activation = await page.evaluate(() => window.reminderMock.activation);
  if (activation !== null) expect(activation).toBe(true);
  await page.evaluate(() => document.getElementById("preferences-form").requestSubmit());
  await expect(page.locator("#preferences-error")).toContainText("Finish the notification permission request");
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().routineReminders)).toBe(false);
  await page.evaluate(() => window.allowNotifications("granted"));
  await expect(page.locator("#save-preferences")).toBeEnabled();
  await expect(page.locator("#reminder-support")).toContainText("permission is granted");
  await page.locator("#close-preferences").click();
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().routineReminders)).toBe(false);
  await page.locator("#open-settings").click();
  await page.locator('[name="routineTime"]').fill("23:59");
  await page.locator("#practice-reminders summary").click();
  await page.locator('[name="routineReminders"]').check();
  await expect(page.locator("#save-preferences")).toBeEnabled();
  await page.locator("#save-preferences").click();
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().routineReminders)).toBe(true);
  expect(await page.evaluate(() => window.reminderMock.requests)).toBe(1);
});

test("denied and unavailable notifications remain explicit and imported reminder opt-ins can be turned off", async ({ page }) => {
  await mockNotifications(page, { result: "denied" });
  await open(page);
  await page.locator("#open-settings").click();
  await page.locator("#practice-reminders summary").click();
  await page.locator('[name="routineReminders"]').click();
  await expect(page.locator("#preferences-error")).toContainText("Permission was not granted");
  await expect(page.locator("#reminder-support")).toContainText("Notifications are blocked");
  await expect(page.locator('[name="routineReminders"]')).not.toBeChecked();
  await page.locator("#save-preferences").click();
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().routineReminders)).toBe(false);
  await page.evaluate(() => {
    Object.defineProperty(window, "Notification", { configurable: true, value: undefined });
    window.Cortex.Storage.setSettings({ routineReminders: true });
  });
  await page.locator("#open-settings").click();
  await page.locator("#practice-reminders summary").click();
  await expect(page.locator("#reminder-support")).toContainText("unavailable");
  await expect(page.locator('[name="routineReminders"]')).toBeEnabled();
  await page.locator('[name="routineReminders"]').uncheck();
  await page.locator("#save-preferences").click();
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().routineReminders)).toBe(false);
});

test("a due notification uses an active service worker once per date and cannot interrupt a starting round", async ({ page }) => {
  await mockNotifications(page, { permission: "granted" });
  await enableClock(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const C = window.Cortex, date = new Date(C.iso());
    const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    C.Storage.setSettings({ routineTime: time, routineDays: [date.getDay()], routineReminders: true });
    C.starting = true;
    await C.Reminders.check();
  });
  expect(await page.evaluate(() => window.reminderMock.shown.length)).toBe(0);
  await page.evaluate(async () => { window.Cortex.starting = false; await window.Cortex.Reminders.check(); });
  expect(await page.evaluate(() => window.reminderMock.shown.length)).toBe(1);
  expect(await page.evaluate(() => window.reminderMock.shown[0].title)).toBe("BBG");
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().reminderLastDate)).toBe(
    await page.evaluate(() => window.Cortex.today()));
  await page.evaluate(() => window.Cortex.Reminders.check());
  await page.clock.runFor(30000);
  expect(await page.evaluate(() => window.reminderMock.shown.length)).toBe(1);
});

test("sharing exposes only the public app URL, safe social links, native cancellation and copy/manual fallbacks", async ({ page }) => {
  await page.addInitScript(() => {
    window.shared = []; window.copied = []; window.shareError = "AbortError";
    Object.defineProperty(navigator, "share", { configurable: true, value: async data => {
      window.shared.push(data);
      if (window.shareError) throw new DOMException("Sharing unavailable", window.shareError);
    } });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async value => {
      if (window.copyError) throw new DOMException("Clipboard blocked", "NotAllowedError");
      window.copied.push(value);
    } } });
  });
  const external = [];
  page.on("request", request => {
    if (/^https?:/.test(request.url()) && !/^http:\/\/127\.0\.0\.1:4173\//.test(request.url())) external.push(request.url());
  });
  await page.goto("/?token=private&scoutTheme=dark#task/forecasting");
  await expect(page.locator("#app h1")).toBeVisible();
  await page.locator("#share-app").click();
  const expected = `${new URL(page.url()).origin}/#home`;
  await expect(page.locator("#share-dialog")).toBeVisible();
  await expect(page.locator("#share-link")).toHaveValue(expected);
  await expect(page.locator("#share-local-warning")).toBeVisible();
  expect(await page.evaluate(() => window.shared.length)).toBe(0);
  expect(await page.evaluate(() => window.copied.length)).toBe(0);
  const links = await page.locator("#social-share-links a").evaluateAll(links => links.map(link =>
    ({ name: link.textContent, href: link.href, target: link.target, rel: link.rel })));
  expect(links.map(link => link.name)).toEqual(["Facebook", "X", "WhatsApp"]);
  for (const link of links) {
    expect(link.target).toBe("_blank"); expect(link.rel).toBe("noopener noreferrer");
    expect(link.href).not.toMatch(/private|token|scoutTheme|forecasting/);
  }
  expect(new URL(links[0].href).searchParams.get("u")).toBe(expected);
  expect(new URL(links[1].href).searchParams.get("url")).toBe(expected);
  expect(new URL(links[2].href).searchParams.get("text")).toContain(expected);
  await page.locator("#native-share").click();
  await expect(page.locator("#share-dialog")).toBeVisible();
  await expect(page.locator("#share-status")).toBeEmpty();
  expect(await page.evaluate(() => Object.keys(window.shared[0]).sort())).toEqual(["text", "title", "url"]);
  expect(await page.evaluate(() => window.shared[0].url)).toBe(expected);
  await page.evaluate(() => { window.shareError = "NotAllowedError"; });
  await page.locator("#native-share").click();
  await expect(page.locator("#share-status")).toContainText("could not open a sharing target");
  await page.locator("#copy-share-link").click();
  await expect(page.locator("#share-status")).toContainText("App link copied");
  expect(await page.evaluate(() => window.copied)).toEqual([expected]);
  await page.evaluate(() => { window.copyError = true; });
  await page.locator("#copy-share-link").click();
  await expect(page.locator("#share-status")).toContainText("copy it manually");
  await expect(page.locator("#share-link")).toBeFocused();
  expect(await page.locator("#share-link").evaluate(input =>
    ({ start: input.selectionStart, end: input.selectionEnd, length: input.value.length })))
    .toEqual({ start: 0, end: expected.length, length: expected.length });
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }); });
  await page.locator("#copy-share-link").click();
  await expect(page.locator("#share-status")).toContainText("copy it manually");
  expect(external).toEqual([]);
  await page.locator("#close-share").click();
  await expect(page.locator("#share-app")).toBeFocused();
});

test("sharing preserves unsaved settings and restores its nested opener; running/starting rounds guard sharing", async ({ page }) => {
  await open(page);
  await page.locator("#open-settings").click();
  await page.locator('[name="routineTime"]').fill("18:30");
  await page.locator("#preferences-share").click();
  await expect(page.locator("#share-dialog")).toBeVisible();
  await page.locator("#close-share").click();
  await expect(page.locator("#preferences-share")).toBeFocused();
  await expect(page.locator('[name="routineTime"]')).toHaveValue("18:30");
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().routineTime)).toBe("08:00");
  await page.locator("#close-preferences").click();
  for (const guard of ["active", "starting"]) {
    await page.evaluate(guard => { window.Cortex[guard] = true; window.Cortex.UI.openShare(); window.Cortex[guard] = null; }, guard);
    await expect(page.locator("#share-dialog")).not.toBeVisible();
    await expect(page.locator('[data-notice="share.busy"]')).toBeVisible();
  }
});

test("weekday controls and sharing fit narrow phones, landscape and tablets in both languages", async ({ page }, testInfo) => {
  await open(page);
  for (const language of ["en", "de"]) {
    await page.evaluate(language => {
      window.Cortex.Storage.setSettings({ language });
      window.Cortex.UI.syncPreferences(); window.Cortex.UI.render();
    }, language);
    for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(viewport);
      await page.locator("#open-settings").click();
      await page.locator("#practice-reminders summary").click();
      const rows = await page.locator(".weekday-grid label").evaluateAll(labels => labels.map(label => {
        const rect = label.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }));
      expect(rows.length).toBe(7);
      for (const row of rows) { expect(row.width).toBeGreaterThanOrEqual(44); expect(row.height).toBeGreaterThanOrEqual(44); }
      expect(await page.locator("#preferences-dialog").evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth + 1)).toBe(true);
      await noOverflow(page);
      if (language === "de" && viewport.width === 320) await capture(page, testInfo, "schedule-settings-320-de");
      await page.locator("#close-preferences").click();
      await page.locator("#share-app").click();
      const bounds = await page.locator("#share-dialog").evaluate(dialog => {
        const rect = dialog.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: dialog.scrollWidth, inner: dialog.clientWidth };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(viewport.width); expect(bounds.bottom).toBeLessThanOrEqual(viewport.height);
      expect(bounds.width).toBeLessThanOrEqual(bounds.inner + 1);
      await noOverflow(page);
      if (language === "de" && viewport.width === 320) await capture(page, testInfo, "share-320-de");
      await page.locator("#close-share").click();
    }
  }
});
