'use strict';
const CACHE = 'yanxi-words-v1';
const ROOT = new URL('./', self.location.href);
const SHELL = ['./', 'index.html', 'style.css', 'core.js', 'app.js', 'data.json', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'touch-icon.png', 'licenses/ECDICT.txt', 'licenses/cmudict.txt'].map(path => new URL(path, ROOT).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await Promise.all(SHELL.map(async url => {
        const response = await fetch(new Request(url, { cache: 'reload', redirect: 'error', credentials: 'same-origin' }));
        if (!response.ok) throw new Error('Offline resource unavailable');
        if (url === ROOT.href && !(await response.clone().text()).includes('id="main"')) throw new Error('Unexpected HTML');
        await cache.put(url, response);
      }));
      await self.skipWaiting();
    } catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => key.startsWith('yanxi-words-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin) return;
  const home = event.request.mode === 'navigate' && (url.pathname === ROOT.pathname || url.pathname === ROOT.pathname + 'index.html');
  if (!home && !SHELL.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(home ? ROOT.href : event.request)) || fetch(event.request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'WORDS_STATUS' || !event.ports[0]) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE), all = await Promise.all(SHELL.map(url => cache.match(url)));
      event.ports[0].postMessage({ ready: all.every(Boolean), version: CACHE });
    } catch (_) { event.ports[0].postMessage({ ready: false }); }
  })());
});
