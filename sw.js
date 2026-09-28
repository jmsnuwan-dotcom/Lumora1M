const CACHE='lumora-mtf-v4-40';
const ASSETS=['/','/index.html','/styles.css','/js/engine.js?v=40','/js/app.js?v=40','/lumora-logo.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lumora-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.pathname.startsWith('/api/')){e.respondWith(fetch(e.request,{cache:'no-store'}));return;}e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
