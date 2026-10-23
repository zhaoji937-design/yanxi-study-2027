'use strict';
// Bump this version whenever a bundled HTML, script, stylesheet or question bank changes.
const CACHE = 'yanxi-offline-v13';
const ROOT = new URL('./', self.location.href);
const SHELL = [
  './', 'latest.html', 'textbook-images.json', 'bank-sports-revised.js?v=2', 'style.css', 'simple.css?v=5', 'icon.svg',
  'study.css?v=3', 'study-tools.js?v=2', 'engine.js?v=7', 'bank-politics.js', 'bank-english.js',
  'bank-sports-legacy.js', 'bank-sports.js', 'bank-challenge.js',
  'bank-politics-extended.js', 'bank-sports-expanded.js', 'bank-sports-systematic.js?v=4.1',
  'bank-study.js?v=1', 'paper-data.js?v=1', 'app.js?v=11', 'ink.css?v=2', 'ink.js?v=3', 'knowledge.css?v=2', 'knowledge-data.js?v=1', 'knowledge.js?v=3', 'offline.js?v=5', 'manifest.json',
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
  const isHome = event.request.mode === 'navigate' && (url.pathname === ROOT.pathname || url.pathname === ROOT.pathname + 'index.html' || url.pathname === ROOT.pathname + 'latest.html');
  if (!isHome && !SHELL.includes(url.href)) return;
  event.respondWith((async function () {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(isHome ? ROOT.href : event.request);
    if(isHome){try{const response=await fetch(event.request);if(response.ok&&(await response.clone().text()).includes('id="app"')){await cache.put(ROOT.href,response.clone());return response;}}catch(_){}if(cached)return cached;throw new Error('App unavailable');}
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
