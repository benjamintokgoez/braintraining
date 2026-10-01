"use strict";

const CACHE_PREFIX = `cortex-shell-${self.registration.scope}-`;
const CACHE = `${CACHE_PREFIX}v7`;
const ASSETS = [
  "./", "index.html", "styles.css", "i18n.js", "app.js", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
  "js/core.js", "js/generators.js", "js/runner.js", "js/routine.js", "js/pwa.js", "js/ui.js", "js/progress.js",
  "js/forecasting.js", "js/tasks/span-and-speed.js", "js/tasks/focus.js", "js/tasks/reasoning.js",
  "js/tasks/learning.js", "js/tasks/inhibition.js", "js/tasks/spatial.js"
];
const assetURLs = new Set(ASSETS.map(asset => new URL(asset, self.registration.scope).href));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(CACHE_PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") void self.skipWaiting();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (!assetURLs.has(new URL(event.request.url.split("?")[0]).href) && event.request.mode !== "navigate") return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    if (event.request.mode === "navigate") {
      const shell = await cache.match("index.html");
      if (shell) return shell;
    }
    return fetch(event.request);
  })());
});
