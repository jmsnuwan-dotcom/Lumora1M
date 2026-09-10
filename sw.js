const C="lumora-1m-v4",A=["./","./index.html","./styles.css","./js/engine.js","./js/app.js","./manifest.webmanifest","./lumora-logo.png","./icons/favicon.png","./icons/lumora-192.png","./icons/lumora-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("lumora-")&&k!==C).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
