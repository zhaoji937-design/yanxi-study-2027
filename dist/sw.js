'use strict';
// Bump this version whenever a bundled HTML, script, stylesheet or question bank changes.
const CACHE = 'yanxi-offline-v6';
const ROOT = new URL('./', self.location.href);
const SHELL = [
  './', 'style.css', 'simple.css?v=4', 'icon.svg',
  'engine.js?v=4', 'bank-politics.js', 'bank-english.js',
  'bank-sports-legacy.js', 'bank-sports.js', 'bank-challenge.js',
  'bank-politics-extended.js', 'bank-sports-expanded.js', 'bank-sports-systematic.js?v=4.1',
  'app.js?v=5', 'offline.js?v=5', 'manifest.json',
  'touch-icon.png', 'icon-192.png', 'icon-512.png'
].map(function (path) { return new URL(path, ROOT).href; });

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    const cache = await caches.open(CACHE);
    try {
      await Promise.all(SHELL.map(async function (url) {
        const response = await fetch(new Request(url, { cache: 'reload', redirect: 'error', credentials: 'same-origin' }));
        if (!response.ok) throw new Error('Offline resource unavailable');
        if (url === ROOT.href && !(await response.clone().text()).includes('id="app"')) throw new Error('Not the app HTML');
        await cache.put(url, response);
      }));
      await self.skipWaiting();
    } catch (error) { await caches.delete(CACHE); throw error; }
  })());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (key) { return key.startsWith('yanxi-offline-') && key !== CACHE; }).map(function (key) { return caches.delete(key); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (event) {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin) return;
  const isHome = event.request.mode === 'navigate' && (url.pathname === ROOT.pathname || url.pathname === ROOT.pathname + 'index.html');
  if (!isHome && !SHELL.includes(url.href)) return;
  event.respondWith((async function () {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(isHome ? ROOT.href : event.request);
    return cached || fetch(event.request);
  })());
});

self.addEventListener('message', function (event) {
  if (event.data?.type !== 'YANXI_OFFLINE_STATUS' || !event.ports[0]) return;
  event.waitUntil((async function () {
    try {
      const cache = await caches.open(CACHE);
      const results = await Promise.all(SHELL.map(function (url) { return cache.match(url); }));
      event.ports[0].postMessage({ ready: results.every(Boolean), version: CACHE });
    } catch (_) { event.ports[0].postMessage({ ready: false }); }
  })());
});
