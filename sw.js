const C="lumora-1m-v9";
const A=["./","./index.html","./styles.css","./js/engine.js","./js/app.js","./manifest.webmanifest","./lumora-logo.png","./icons/favicon.png","./icons/lumora-192.png","./icons/lumora-512.png"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(A)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("lumora-")&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  const u=new URL(e.request.url);
  if(u.pathname.startsWith("/api/")){ e.respondWith(fetch(e.request,{cache:"no-store"}).catch(()=>caches.match(e.request))); return; }
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(C).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
});
