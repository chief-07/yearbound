// Minimal Yearbound Service Worker for clean PWA installability.
// Intentionally passes network requests through without caching dynamic routes or RPC payloads.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Pass through directly so Walrus Memory, Tatum GraphQL, and Next.js updates remain fresh.
  event.respondWith(fetch(event.request));
});
