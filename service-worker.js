const CACHE="feira-cache-v8";
const ARQUIVOS=["./","./index.html","./estilos/style.css","./estilos/menu.css","./hortifruti.js","./app.js","./menu.js","./manifest.json","./icon.svg"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ARQUIVOS)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request).then(r=>{
    if(r.ok){const c=r.clone();caches.open(CACHE).then(ch=>ch.put(e.request,c))}
    return r;
  }).catch(()=>caches.match(e.request)));
});