// SPDX-License-Identifier: MIT OR Apache-2.0
// The site before this one registered a service worker here, at /sw.js, that cached its pages
// and assets. This site doesn't use one, so this replacement removes the old worker and its
// caches: a browser that comes back fetches /sw.js, finds it changed, installs this, and this
// takes over at once, deletes every cache, unregisters itself and reloads the open tabs so they
// show the live site.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
    })(),
  );
});
