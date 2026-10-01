"use strict";

(() => {
  const C = window.Cortex;
  let checking = false, initialized = false, failedDate = null, permissionRequest = null;
  const status = () => !window.isSecureContext ? "insecure" :
    !("serviceWorker" in navigator) || typeof window.Notification?.requestPermission !== "function" ?
      "unsupported" : Notification.permission;
  async function readyRegistration() {
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active) {
      registration = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("reminders.workerUnavailable")), 5000);
        navigator.serviceWorker.ready.then(value => { clearTimeout(timer); resolve(value); },
          error => { clearTimeout(timer); reject(error); });
      });
    }
    if (typeof registration?.showNotification !== "function") throw new Error("reminders.workerUnavailable");
    return registration;
  }
  const signature = value => C.canonical({
    time: value.routineTime, days: value.routineDays, enabled: value.routineReminders
  });
  function due(value, now) {
    if (!value.routineReminders || status() !== "granted") return null;
    const planned = C.Routine.schedule(value, now);
    if (!planned.scheduledToday || !planned.time || value.reminderLastDate === planned.date ||
      failedDate === planned.date) return null;
    const start = new Date(now);
    start.setHours(planned.hour, planned.minute, 0, 0);
    const elapsed = now.getTime() - start.getTime();
    if (elapsed < 0 || elapsed >= 30 * 60000) return null;
    if (C.Storage.getRoutine()?.date === planned.date || C.Storage.getSessions().some(session =>
      C.completedRound(session) && C.today(new Date(session.startedAt)) === planned.date)) return null;
    return planned;
  }
  async function deliver(now) {
    if (C.active || C.starting || C.Storage.pending) return false;
    const checkedAt = C.now();
    const value = C.Storage.getSettings(), planned = due(value, now);
    if (!planned) return false;
    const registration = await readyRegistration();
    if (C.active || C.starting || C.Storage.pending) return false;
    const latest = C.Storage.getSettings();
    const currentTime = new Date(now.getTime() + C.now() - checkedAt);
    if (signature(value) !== signature(latest) || !due(latest, currentTime)) return false;
    await registration.showNotification(C.t("app.title"), {
      body: C.t("reminders.body"), lang: C.language, tag: `bbg-practice-${planned.date}`, renotify: false,
      icon: new URL("icons/icon-192.png", registration.scope).href
    });
    C.Storage.setSettings({ reminderLastDate: planned.date });
    return true;
  }
  async function check(now = new Date(C.iso())) {
    if (checking || C.active || C.starting || C.Storage.pending || status() !== "granted") return false;
    checking = true;
    try {
      if (navigator.locks?.request) {
        return await navigator.locks.request("bbg-practice-reminder", { ifAvailable: true },
          lock => lock ? deliver(now) : false);
      }
      return await deliver(now);
    } catch (error) {
      failedDate = C.today(now);
      console.warn("Practice reminder could not be shown:", error);
      C.notice("reminders.failure");
      return false;
    } finally { checking = false; }
  }
  C.Reminders = {
    status, check,
    get pending() { return permissionRequest !== null; },
    async requestPermission() {
      if (permissionRequest) return permissionRequest;
      permissionRequest = (async () => {
        if (["insecure", "unsupported"].includes(status())) throw new Error(`reminders.${status()}`);
        const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        if (permission !== "granted") return false;
        await readyRegistration();
        failedDate = null;
        return true;
      })();
      try { return await permissionRequest; } finally { permissionRequest = null; }
    },
    refresh() { failedDate = null; return check(); },
    init() {
      if (initialized) return;
      initialized = true;
      setInterval(() => { void check(); }, 30000);
      addEventListener("focus", () => { void check(); });
      document.addEventListener("visibilitychange", () => { void check(); });
      void check();
    }
  };
})();
