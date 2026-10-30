// Dream Story Studio offline shell; browser data stays local to each device.
const CACHE='dream-story-offline-v111-refresh-20261030';
const FILES=["./", "./css/editor.css", "./css/home55.css", "./css/style.css", "./editor.html", "./export/exporter.js", "./export/player/player.js", "./export/player/style.css", "./index.html", "./js/app.js", "./js/audio57.js", "./js/database.js", "./js/editor-compact.js", "./js/editor-layout.js", "./js/editor.js", "./js/home55.js", "./js/home56.js", "./js/layout58.js", "./js/layout59.js", "./js/project-backup.js", "./js/publish.js", "./js/workspace53.js", "./js/workspace54.js", "./js/workspace55.js", "./js/workspace56.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dream-story-offline-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try {
    const response=await fetch(event.request);
    if(response.ok && response.type==='basic' && event.request.url.startsWith(self.registration.scope)) {
      await cache.put(event.request,response.clone()).catch(()=>{});
    }
    return response;
  } catch(error) {
    const cached=await cache.match(event.request);
    if(cached)return cached;
    throw error;
  }
 })());
});
