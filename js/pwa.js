"use strict";

(() => {
  const C = window.Cortex;
  let installPrompt = null, registration = null, updating = false, reloadPending = false;
  C.PWA = {
    get installable() { return Boolean(installPrompt); },
    get standalone() { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; },
    async install() {
      if (!installPrompt) { C.notice("pwa.installHelp"); return; }
      const prompt = installPrompt;
      installPrompt = null;
      await prompt.prompt();
      await prompt.userChoice;
    },
    async update() {
      if (C.active || C.starting || C.Storage.pending || C.Forecasting?.pendingDraft) { C.notice("pwa.wait"); return; }
      if (reloadPending) { location.reload(); return; }
      if (!registration?.waiting) return;
      updating = true;
      registration.waiting.postMessage("SKIP_WAITING");
    }
  };
  addEventListener("beforeinstallprompt", event => { event.preventDefault(); installPrompt = event; });
  addEventListener("appinstalled", () => { installPrompt = null; });
  document.addEventListener("DOMContentLoaded", async () => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext || location.protocol === "file:") return;
    let controlled = Boolean(navigator.serviceWorker.controller);
    const updateButton = document.getElementById("app-update");
    const showUpdate = () => {
      const waiting = registration?.waiting;
      updateButton.hidden = !(reloadPending || waiting && registration.active && waiting !== registration.active);
      if (!updateButton.hidden) C.notice("pwa.updateReady");
      else document.querySelector('[data-notice="pwa.updateReady"]')?.remove();
    };
    updateButton.onclick = () => C.PWA.update();
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (controlled) reloadPending = true;
      controlled = Boolean(navigator.serviceWorker.controller);
      showUpdate();
      if (updating) void C.PWA.update();
    });
    try {
      registration = await navigator.serviceWorker.register("sw.js");
      showUpdate();
      registration.addEventListener("updatefound", () => {
        registration.installing?.addEventListener("statechange", showUpdate);
      });
    } catch (error) {
      console.warn("Offline installation failed:", error);
      C.notice("pwa.failed");
    }
  });
})();
